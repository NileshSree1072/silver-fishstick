# Aegis Helpdesk — AI Prompts & RAG Architecture Reference

This document provides the exact prompts, context construction templates, schemas, and RAG (Retrieval-Augmented Generation) pipeline specifications used by the AI engine across **Groq LLM** and **pgvector**.

---

## 1. Overview of AI Architecture

- **LLM Provider**: Groq Cloud API (`https://api.groq.com/openai/v1`)
- **Chat Completion Endpoint**: `POST /chat/completions`
- **Default Model**: `openai/gpt-oss-120b` (configurable via `GROQ_CHAT_MODEL`)
- **Max Completion Tokens**: `1500` (configurable via `app.openai.max-tokens`)
- **Vector Database**: PostgreSQL with `pgvector` extension (`vector(3072)`)
- **Similarity Metric**: Cosine Distance `1 - (embedding <=> target_vector)`
- **Similarity Threshold**: `0.25` (configurable via `app.openai.similarity-threshold`)
- **Core Orchestrator**: [`AIService.java`](file:///c:/Users/niles/OneDrive/Desktop/FullStack/silver-fishstick/helpdesk-backend/src/main/java/com/helpdesk/helpdesk_backend/SERVICE/AIService.java)

---

## 2. Prompt 1: AI Auto-Deflection & Ticket Response (RAG)

Used automatically when a user submits a new ticket. If similar past resolved tickets or published knowledge base articles are retrieved, this prompt synthesizes a direct resolution for the customer.

### Prompt Template

```text
You are a helpful support agent. Based on the similar resolved tickets below,
write a clear and helpful reply to the current ticket.
Be specific, actionable, and professional.
Do not mention that you are an AI unless directly asked.

Current ticket:
Title: {ticket.title}
Description: {ticket.description}

{rag_context}

Write only the reply message, nothing else.
```

### Context Injection Template (`{rag_context}`)

The context block is dynamically assembled by searching published Knowledge Articles and similar Resolved Tickets:

```text
Relevant knowledge base articles:

Title: {article.title}
Content: {article.content}
---

Similar resolved tickets:

Problem: {resolved_ticket.title}
Solution: {last_public_agent_reply.message}
---
```

### Source Location
- Method: `generateReply(Ticket ticket, String context)` in [`AIService.java:483`](file:///c:/Users/niles/OneDrive/Desktop/FullStack/silver-fishstick/helpdesk-backend/src/main/java/com/helpdesk/helpdesk_backend/SERVICE/AIService.java#L483)
- Triggered by: `processNewTicket(Ticket ticket)` in [`AIService.java:87`](file:///c:/Users/niles/OneDrive/Desktop/FullStack/silver-fishstick/helpdesk-backend/src/main/java/com/helpdesk/helpdesk_backend/SERVICE/AIService.java#L87)

---

## 3. Prompt 2: Agent Copilot / Draft Reply Suggestion (RAG)

Used on-demand in the Agent Workspace when an agent clicks **"Generate AI Suggestion"** to draft a response to an active ticket based on historical organizational knowledge.

### Prompt Template

```text
You are a helpful support agent. Based on the similar resolved tickets below,
write a clear and helpful reply to the current ticket.
Be specific, actionable, and professional.
Do not mention that you are an AI unless directly asked.

Current ticket:
Title: {ticket.title}
Description: {ticket.description}

{rag_context}

Write only the reply message, nothing else.
```

### Source Location
- Method: `generateDraftReply(UUID ticketId)` in [`AIService.java:166`](file:///c:/Users/niles/OneDrive/Desktop/FullStack/silver-fishstick/helpdesk-backend/src/main/java/com/helpdesk/helpdesk_backend/SERVICE/AIService.java#L166)

---

## 4. Prompt 3: Ticket Thread Summarization

Used by support agents and administrators to quickly comprehend lengthy ticket conversations without reading through every individual message.

### Prompt Template

```text
Summarize this support ticket thread in 3-4 sentences.
Focus on: what the problem is, what was tried, what's still unresolved.
Be concise and factual.

Ticket: {ticket.title}
Description: {ticket.description}

Conversation:
{sender.role}: {reply.message}
{sender.role}: {reply.message}
...
```

### Input Formatting Rules
- The conversation history is ordered chronologically by `createdAt ASC`.
- Each reply is prefixed with the sender's role (e.g. `USER`, `AGENT`, `ADMIN`).
- Output constraint: strictly 3 to 4 factual sentences.

### Source Location
- Method: `summarizeTicket(UUID ticketId)` in [`AIService.java:196`](file:///c:/Users/niles/OneDrive/Desktop/FullStack/silver-fishstick/helpdesk-backend/src/main/java/com/helpdesk/helpdesk_backend/SERVICE/AIService.java#L196)

---

## 5. Prompt 4: Knowledge Base Article Generation from Resolved Ticket

Used when an agent converts a successfully resolved ticket into a reusable Knowledge Base draft article.

### Prompt Template

```text
You are a technical writer. Based on the resolved support ticket thread below, generate a meaningful knowledge base article.
Respond with a raw JSON object containing exactly two keys:
"title": A clear, search-friendly title for the article.
"content": A structured markdown body containing:
   ## Problem Description
   (Summarize the issue the user faced)
   
   ## Root Cause
   (Explain why it happened)
   
   ## Resolution Steps
   (Provide clear, actionable step-by-step instructions to resolve the issue)

Do not include any wrapper markdown or formatting. Return ONLY the raw JSON object.

Resolved Ticket Thread:
Ticket: {ticket.title}
Description: {ticket.description}

Conversation:
{sender.role}: {reply.message}
...
```

### Response Schema Enforcement
- **Format**: Raw JSON object.
- **Keys**:
  - `"title"`: String
  - `"content"`: Markdown string with `## Problem Description`, `## Root Cause`, `## Resolution Steps`.
- **Sanitization**: Internal notes (`isInternal = true`) are stripped out before prompting so proprietary internal chatter is never leaked into the KB article.
- **Parser Fallback**: If the model wraps JSON in markdown fences (````json ... ````), [`AIService.java:256-261`](file:///c:/Users/niles/OneDrive/Desktop/FullStack/silver-fishstick/helpdesk-backend/src/main/java/com/helpdesk/helpdesk_backend/SERVICE/AIService.java#L256-L261) strips the backticks before parsing.

### Source Location
- Method: `generateKBFromTicket(Ticket ticket)` in [`AIService.java:220`](file:///c:/Users/niles/OneDrive/Desktop/FullStack/silver-fishstick/helpdesk-backend/src/main/java/com/helpdesk/helpdesk_backend/SERVICE/AIService.java#L220)

---

## 6. RAG Retrieval Pipeline & Vector Queries

### Embedding Generation
- **Tickets**: Embedded text is `ticket.title + " " + ticket.description`.
- **Knowledge Articles**: Embedded text is `article.title + " " + article.content`.
- **Vector Dimension**: `3072` floats.
- **Algorithm**: Deterministic token & character 3-gram feature hashing with L2 unit normalization (in fallback mode) or OpenAI `text-embedding-3-small`.

### PostgreSQL pgvector Queries

#### 1. Similar Resolved Tickets Query
```sql
SELECT t.*, 
       1 - (t.embedding <=> CAST(:embedding AS vector)) AS similarity
FROM tickets t
WHERE t.status IN ('RESOLVED', 'CLOSED')
  AND t.embedding IS NOT NULL
  AND 1 - (t.embedding <=> CAST(:embedding AS vector)) > :threshold
ORDER BY t.embedding <=> CAST(:embedding AS vector)
LIMIT :limit;
```

#### 2. Similar Knowledge Articles Query
```sql
SELECT ka.*,
       1 - (ka.embedding <=> CAST(:embedding AS vector)) AS similarity
FROM knowledge_articles ka
WHERE ka.is_published = TRUE
  AND ka.embedding IS NOT NULL
  AND 1 - (ka.embedding <=> CAST(:embedding AS vector)) > :threshold
ORDER BY ka.embedding <=> CAST(:embedding AS vector)
LIMIT :limit;
```

### Keyword Fallback Mechanism
If vector similarity returns 0 items (e.g. below threshold), [`buildKeywordContext(ticket)`](file:///c:/Users/niles/OneDrive/Desktop/FullStack/silver-fishstick/helpdesk-backend/src/main/java/com/helpdesk/helpdesk_backend/SERVICE/AIService.java#L395-L440) activates automatically:
- Extracts meaningful keywords from the ticket's title and description (ignoring common stop words).
- Queries resolved tickets and published articles matching `%keyword%`.
- Reconstructs the context block identically so Groq can still generate an accurate response.

---

## 7. HTTP Request Payload Sent to Groq

Every prompt executed via `callGPT(prompt)` sends the following payload:

```json
{
  "model": "openai/gpt-oss-120b",
  "max_tokens": 1500,
  "messages": [
    {
      "role": "user",
      "content": "<PROMPT_TEXT_HERE>"
    }
  ]
}
```

- **Headers**:
  - `Authorization: Bearer <GROQ_API_KEY>`
  - `Content-Type: application/json`
- **Retry Policy**: Up to 3 attempts with exponential backoff on HTTP `429 Too Many Requests`.
