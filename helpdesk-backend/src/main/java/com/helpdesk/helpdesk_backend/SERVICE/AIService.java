package com.helpdesk.helpdesk_backend.SERVICE;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import com.helpdesk.helpdesk_backend.ENTITY.KnowledgeArticle;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import com.helpdesk.helpdesk_backend.ENTITY.Reply;
import com.helpdesk.helpdesk_backend.ENTITY.Ticket;
import com.helpdesk.helpdesk_backend.ENTITY.User;
import com.helpdesk.helpdesk_backend.ENUM.AgentAvailabilityStatus;
import com.helpdesk.helpdesk_backend.ENUM.Role;
import com.helpdesk.helpdesk_backend.EXCEPTION.NotFoundException;
import com.helpdesk.helpdesk_backend.REPOSITORY.KnowledgeRepository;
import com.helpdesk.helpdesk_backend.REPOSITORY.ReplyRepository;
import com.helpdesk.helpdesk_backend.REPOSITORY.SimilarTicketRepository;
import com.helpdesk.helpdesk_backend.REPOSITORY.TicketRepository;
import com.helpdesk.helpdesk_backend.REPOSITORY.UserRepository;

import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
public class AIService {

    private final EmbeddingService embeddingService;
    private final SimilarTicketRepository similarTicketRepo;
    private final TicketRepository ticketRepo;
    private final ReplyRepository replyRepo;
    private final ReplyService replyService;
    private final UserRepository userRepo;
    private final WebClient groqWebClient; // Groq LLM for chat
    private final KnowledgeRepository knowledgeRepository;
    private final ActivityService activityService;

    public AIService(
            EmbeddingService embeddingService,
            SimilarTicketRepository similarTicketRepo,
            TicketRepository ticketRepo,
            ReplyRepository replyRepo,
            ReplyService replyService,
            UserRepository userRepo,
            @Qualifier("groqWebClient") WebClient groqWebClient,
            KnowledgeRepository knowledgeRepository,
            ActivityService activityService) {
        this.embeddingService = embeddingService;
        this.similarTicketRepo = similarTicketRepo;
        this.ticketRepo = ticketRepo;
        this.replyRepo = replyRepo;
        this.replyService = replyService;
        this.userRepo = userRepo;
        this.groqWebClient = groqWebClient;
        this.knowledgeRepository = knowledgeRepository;
        this.activityService = activityService;
    }

    @Value("${app.openai.similarity-threshold}")
    private double similarityThreshold;

    @Value("${app.groq.chat-model}")
    private String chatModel;

    @Value("${app.openai.max-tokens}")
    private int maxTokens;

    @Value("${app.ai.bot-user-id}")
    private UUID botUserId;

    // ── STEP A: Called when a new ticket is created ──────────────
    // Generates embedding and checks for duplicates
    // If match found → AI auto-replies and resolves ticket
    // If no match → embedding stored for future use

    @Async
    public void processNewTicket(Ticket ticket) {
        try {
            // 1. Generate embedding for this ticket
            float[] embedding = embeddingService.embedTicket(
                    ticket.getTitle(), ticket.getDescription());

            // 2. Store embedding on ticket
            ticket.setEmbedding(embedding);
            ticketRepo.save(ticket);

            // 3. Search for similar resolved tickets and knowledge articles via vector search
            String embeddingStr = toPostgresVector(embedding);
            List<Object[]> similarTickets = similarTicketRepo
                    .findSimilarResolvedTickets(embeddingStr, similarityThreshold, 3);
            List<Object[]> similarArticles = similarTicketRepo
                    .findSimilarKnowledgeArticles(embeddingStr, similarityThreshold, 3);

            // 4. Build context from vector results, or fallback to keyword matching
            String context = buildContext(similarTickets, similarArticles);
            if (context.isBlank()) {
                context = buildKeywordContext(ticket);
            }

            if (context.isBlank()) {
                log.info("No similar tickets or knowledge articles found for: {}", ticket.getTitle());
                activityService.aiFailed(ticket, "No similar ticket above threshold");
                return; // needs human agent
            }

            // 5. Generate AI reply using GPT
            String aiReply = generateReply(ticket, context);

            // 6. Save AI reply and mark ticket resolved
            User botUser = userRepo.findById(botUserId).orElseGet(() -> {
                return userRepo.findByEmail("ai-bot@helpdesk.com").orElseGet(() -> {
                    User u = User.builder()
                            .id(botUserId)
                            .name("Aegis AI Assistant")
                            .email("ai-bot@helpdesk.com")
                            .password("NO_LOGIN_SYSTEM_AI")
                            .role(Role.AGENT)
                            .isActive(true)
                            .availabilityStatus(AgentAvailabilityStatus.ONLINE)
                            .maxActiveTickets(100)
                            .build();
                    return userRepo.save(u);
                });
            });
            replyService.saveAiReply(ticket, aiReply, botUser);

            log.info("AI auto-resolved ticket: {}", ticket.getTitle());
            double maxScore = 0.85;
            if (!similarTickets.isEmpty()) {
                Object[] row = similarTickets.get(0);
                double score = row[row.length - 1] instanceof Number ? ((Number) row[row.length - 1]).doubleValue()
                        : 0.85;
                if (score > maxScore)
                    maxScore = score;
            }
            if (!similarArticles.isEmpty()) {
                Object[] row = similarArticles.get(0);
                double score = row[row.length - 1] instanceof Number ? ((Number) row[row.length - 1]).doubleValue()
                        : 0.85;
                if (score > maxScore)
                    maxScore = score;
            }
            activityService.aiResolved(ticket, maxScore);
            return; // AI handled it

        } catch (Exception e) {
            log.error("AI processing failed for ticket {}: {}",
                    ticket.getId(), e.getMessage());
            activityService.aiFailed(ticket, "AI processing failed: " + e.getMessage());
            return; // fallback to human agent
        }
    }

    // ── STEP B: Generate draft reply suggestion for agent ────────

    public String generateDraftReply(UUID ticketId) {
        Ticket ticket = ticketRepo.findById(ticketId)
                .orElseThrow(() -> new NotFoundException("Ticket", ticketId));

        // Get the embedding — generate if missing
        float[] embedding = ticket.getEmbedding();
        if (embedding == null) {
            embedding = embeddingService.embedTicket(
                    ticket.getTitle(), ticket.getDescription());
            ticket.setEmbedding(embedding);
            ticketRepo.save(ticket);
        }

        // Find similar past tickets for context
        String embeddingStr = toPostgresVector(embedding);
        List<Object[]> similarTickets = similarTicketRepo
                .findSimilarResolvedTickets(embeddingStr, similarityThreshold, 3);
        List<Object[]> similarArticles = similarTicketRepo
                .findSimilarKnowledgeArticles(embeddingStr, similarityThreshold, 3);

        String context = buildContext(similarTickets, similarArticles);
        if (context.isBlank()) {
            context = buildKeywordContext(ticket);
        }

        return generateReply(ticket, context);
    }

    // ── STEP C: Summarize a long ticket thread ───────────────────

    public String summarizeTicket(UUID ticketId) {
        Ticket ticket = ticketRepo.findById(ticketId)
                .orElseThrow(() -> new NotFoundException("Ticket", ticketId));

        List<Reply> replies = replyRepo.findByTicketOrderByCreatedAtAsc(ticket);

        StringBuilder thread = new StringBuilder();
        thread.append("Ticket: ").append(ticket.getTitle()).append("\n");
        thread.append("Description: ").append(ticket.getDescription()).append("\n\n");
        thread.append("Conversation:\n");
        replies.forEach(r -> thread
                .append(r.getSender().getRole()).append(": ")
                .append(r.getMessage()).append("\n"));

        String prompt = """
                Summarize this support ticket thread in 3-4 sentences.
                Focus on: what the problem is, what was tried, what's still unresolved.
                Be concise and factual.

                """ + thread;

        return callGPT(prompt);
    }

    public Map<String, String> generateKBFromTicket(Ticket ticket) {
        List<Reply> replies = replyRepo.findByTicketOrderByCreatedAtAsc(ticket);
        
        StringBuilder thread = new StringBuilder();
        thread.append("Ticket: ").append(ticket.getTitle()).append("\n");
        thread.append("Description: ").append(ticket.getDescription()).append("\n\n");
        thread.append("Conversation:\n");
        replies.forEach(r -> {
            if (!r.isInternal()) {
                thread.append(r.getSender().getRole()).append(": ")
                      .append(r.getMessage()).append("\n");
            }
        });

        String prompt = """
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
                """ + thread;

        String response = callGPT(prompt);
        try {
            String json = response.trim();
            if (json.startsWith("```")) {
                int firstLineBreak = json.indexOf("\n");
                int lastBackticks = json.lastIndexOf("```");
                if (firstLineBreak != -1 && lastBackticks != -1 && lastBackticks > firstLineBreak) {
                    json = json.substring(firstLineBreak + 1, lastBackticks).trim();
                }
            }
            com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
            return mapper.readValue(json, Map.class);
        } catch (Exception e) {
            log.error("Failed to parse AI generated KB article JSON. Fallback to parsing text.", e);
            String title = "How to fix: " + ticket.getTitle();
            String content = "## Problem Description\n" + ticket.getDescription() + "\n\n## Resolution\n" + response;
            return Map.of("title", title, "content", content);
        }
    }

    // ── STEP D: Semantic search before ticket submission ─────────

    public List<Map<String, Object>> semanticSearch(String query) {
        if (query == null || query.trim().length() < 2) {
            return List.of();
        }
        String cleanQuery = query.trim();
        List<Map<String, Object>> results = new ArrayList<>();
        Set<UUID> seenIds = new HashSet<>();

        // 1. Text search published knowledge base articles
        List<KnowledgeArticle> textArticles = knowledgeRepository.searchPublishedArticles(cleanQuery);
        if (textArticles.isEmpty() && cleanQuery.contains(" ")) {
            for (String word : cleanQuery.split("\\s+")) {
                if (word.length() >= 3) {
                    textArticles.addAll(knowledgeRepository.searchPublishedArticles(word));
                }
            }
        }
        for (KnowledgeArticle a : textArticles) {
            if (seenIds.add(a.getId())) {
                results.add(Map.of(
                        "type", "article",
                        "title", a.getTitle(),
                        "content", a.getContent(),
                        "description", a.getContent(),
                        "categoryName", a.getCategory() != null ? a.getCategory().getName() : "General",
                        "score", 0.95,
                        "similarity", 0.95));
            }
        }

        // 2. Text search resolved/closed tickets
        List<Ticket> textTickets = ticketRepo.findResolvedOrClosedMatching(cleanQuery, org.springframework.data.domain.PageRequest.of(0, 5));
        if (textTickets.isEmpty() && cleanQuery.contains(" ")) {
            for (String word : cleanQuery.split("\\s+")) {
                if (word.length() >= 3) {
                    textTickets.addAll(ticketRepo.findResolvedOrClosedMatching(word, org.springframework.data.domain.PageRequest.of(0, 3)));
                }
            }
        }
        for (Ticket t : textTickets) {
            if (seenIds.add(t.getId())) {
                List<Reply> replies = replyRepo.findByTicketAndIsInternalFalseOrderByCreatedAtAsc(t);
                String desc = replies.isEmpty() ? t.getDescription() : replies.get(replies.size() - 1).getMessage();
                results.add(Map.of(
                        "type", "ticket",
                        "title", t.getTitle(),
                        "description", desc,
                        "score", 0.90,
                        "similarity", 0.90));
            }
        }

        // 3. Vector similarity search
        try {
            float[] embedding = embeddingService.embed(cleanQuery);
            String embeddingStr = toPostgresVector(embedding);

            List<Object[]> ticketResults = similarTicketRepo
                    .findSimilarResolvedTickets(embeddingStr, similarityThreshold, 5);

            List<Object[]> articleResults = similarTicketRepo
                    .findSimilarKnowledgeArticles(embeddingStr, similarityThreshold, 5);

            ticketResults.forEach(row -> {
                UUID ticketId = UUID.fromString(row[0].toString());
                if (seenIds.add(ticketId)) {
                    ticketRepo.findById(ticketId).ifPresent(t -> {
                        double score = row[row.length - 1] instanceof Number
                                ? ((Number) row[row.length - 1]).doubleValue()
                                : 0.0;
                        List<Reply> replies = replyRepo.findByTicketAndIsInternalFalseOrderByCreatedAtAsc(t);
                        String desc = replies.isEmpty()
                                ? t.getDescription()
                                : replies.get(replies.size() - 1).getMessage();
                        results.add(Map.of(
                                "type", "ticket",
                                "title", t.getTitle(),
                                "description", desc,
                                "score", score,
                                "similarity", score));
                    });
                }
            });

            articleResults.forEach(row -> {
                UUID articleId = UUID.fromString(row[0].toString());
                if (seenIds.add(articleId)) {
                    knowledgeRepository.findById(articleId).ifPresent(a -> {
                        double score = row[row.length - 1] instanceof Number
                                ? ((Number) row[row.length - 1]).doubleValue()
                                : 0.0;
                        results.add(Map.of(
                                "type", "article",
                                "title", a.getTitle(),
                                "content", a.getContent(),
                                "description", a.getContent(),
                                "categoryName", a.getCategory() != null ? a.getCategory().getName() : "General",
                                "score", score,
                                "similarity", score));
                    });
                }
            });
        } catch (Exception e) {
            log.warn("Vector search failed during deflection: {}", e.getMessage());
        }

        // Sort combined results by similarity descending
        results.sort((a, b) -> Double.compare(
                (Double) b.get("similarity"),
                (Double) a.get("similarity")));

        return results.size() > 5 ? results.subList(0, 5) : results;
    }

    private String buildKeywordContext(Ticket ticket) {
        StringBuilder context = new StringBuilder();
        String title = ticket.getTitle();
        if (title != null && !title.isBlank()) {
            List<KnowledgeArticle> articles = new ArrayList<>(knowledgeRepository.searchPublishedArticles(title));
            if (articles.isEmpty() && title.contains(" ")) {
                for (String word : title.split("\\s+")) {
                    String clean = word.toLowerCase().replaceAll("[^a-z0-9]", "");
                    if (clean.length() >= 4 && !EmbeddingService.STOP_WORDS.contains(clean)) {
                        articles.addAll(knowledgeRepository.searchPublishedArticles(clean));
                    }
                }
            }
            if (!articles.isEmpty()) {
                context.append("Relevant knowledge base articles:\n\n");
                for (KnowledgeArticle a : articles.stream().distinct().limit(3).toList()) {
                    context.append("Title: ").append(a.getTitle()).append("\n");
                    context.append(a.getContent()).append("\n\n");
                }
            }

            List<Ticket> similar = new ArrayList<>(ticketRepo.findResolvedOrClosedMatching(title, org.springframework.data.domain.PageRequest.of(0, 3)));
            if (similar.isEmpty()) {
                String searchSource = title + (ticket.getDescription() != null ? " " + ticket.getDescription() : "");
                for (String word : searchSource.split("\\s+")) {
                    String cleanWord = word.toLowerCase().replaceAll("[^a-z0-9]", "");
                    if (cleanWord.length() >= 4 && !EmbeddingService.STOP_WORDS.contains(cleanWord)) {
                        List<Ticket> wordMatches = ticketRepo.findResolvedOrClosedMatching(cleanWord, org.springframework.data.domain.PageRequest.of(0, 3));
                        for (Ticket wt : wordMatches) {
                            if (!wt.getId().equals(ticket.getId()) && similar.stream().noneMatch(s -> s.getId().equals(wt.getId()))) {
                                similar.add(wt);
                            }
                        }
                    }
                    if (similar.size() >= 3) break;
                }
            }

            for (Ticket st : similar) {
                if (!st.getId().equals(ticket.getId())) {
                    List<Reply> replies = replyRepo.findByTicketAndIsInternalFalseOrderByCreatedAtAsc(st);
                    if (!replies.isEmpty()) {
                        context.append("Previously resolved ticket solution for \"").append(st.getTitle()).append("\":\n");
                        context.append(replies.get(replies.size() - 1).getMessage()).append("\n\n");
                    }
                }
            }
        }
        return context.toString();
    }

    // ── PRIVATE HELPERS ──────────────────────────────────────────

    // Build context string from similar resolved tickets
    private String buildContext(List<Object[]> similarTicketRows,
            List<Object[]> similarArticleRows) {
        StringBuilder context = new StringBuilder();

        // Add knowledge articles first — they are cleaner than raw tickets
        if (!similarArticleRows.isEmpty()) {
            context.append("Relevant knowledge base articles:\n\n");
            similarArticleRows.forEach(row -> {
                UUID articleId = UUID.fromString(row[0].toString());
                knowledgeRepository.findById(articleId).ifPresent(a -> {
                    context.append("Title: ").append(a.getTitle()).append("\n");
                    context.append("Content: ").append(a.getContent()).append("\n");
                    context.append("---\n");
                });
            });
        }

        // Then add similar resolved tickets as additional context
        if (!similarTicketRows.isEmpty()) {
            context.append("Similar resolved tickets:\n\n");
            similarTicketRows.forEach(row -> {
                UUID ticketId = UUID.fromString(row[0].toString());
                ticketRepo.findById(ticketId).ifPresent(t -> {
                    context.append("Problem: ").append(t.getTitle()).append("\n");
                    List<Reply> replies = replyRepo
                            .findByTicketAndIsInternalFalseOrderByCreatedAtAsc(t);
                    if (!replies.isEmpty()) {
                        context.append("Solution: ")
                                .append(replies.get(replies.size() - 1).getMessage())
                                .append("\n");
                    }
                    context.append("---\n");
                });
            });
        }

        return context.toString();
    }

    // Call GPT to generate a reply given ticket + context
    private String generateReply(Ticket ticket, String context) {
        String prompt = """
                You are a helpful support agent. Based on the similar resolved tickets below,
                write a clear and helpful reply to the current ticket.
                Be specific, actionable, and professional.
                Do not mention that you are an AI unless directly asked.

                Current ticket:
                Title: %s
                Description: %s

                %s

                Write only the reply message, nothing else.
                """.formatted(ticket.getTitle(), ticket.getDescription(), context);

        return callGPT(prompt);
    }

    // Call OpenAI chat completions endpoint with retry-with-backoff on 429
    @SuppressWarnings("unchecked")
    private String callGPT(String prompt) {
        Map<String, Object> requestBody = Map.of(
                "model", chatModel,
                "max_tokens", maxTokens,
                "messages", List.of(
                        Map.of("role", "user", "content", prompt)));

        int maxRetries = 3;
        long delayMs = 2000; // start with 2 seconds

        for (int attempt = 1; attempt <= maxRetries; attempt++) {
            final int currentAttempt = attempt;
            try {
                Map<String, Object> response = groqWebClient.post()
                        .uri("/chat/completions")
                        .bodyValue(requestBody)
                        .retrieve()
                        .onStatus(HttpStatus.TOO_MANY_REQUESTS::equals, resp -> {
                            log.warn("Groq 429 rate-limit hit (attempt {}/{})", currentAttempt, maxRetries);
                            return resp.createException();
                        })
                        .bodyToMono(Map.class)
                        .block();

                if (response == null) {
                    log.error("Groq returned null response");
                    return "I'm unable to generate a response at this time. Please try again.";
                }

                List<Map<String, Object>> choices = (List<Map<String, Object>>) response.get("choices");
                if (choices == null || choices.isEmpty()) {
                    log.error("Groq response has no choices: {}", response);
                    return "AI could not generate a response. Please try again.";
                }
                Map<String, Object> message = (Map<String, Object>) choices.get(0).get("message");
                if (message == null || message.get("content") == null) {
                    return "AI response was empty. Please try again.";
                }
                return message.get("content").toString().trim();

            } catch (WebClientResponseException e) {
                if (e.getStatusCode() == HttpStatus.TOO_MANY_REQUESTS && attempt < maxRetries) {
                    log.warn("Rate limited by Groq. Waiting {}ms before retry {}/{}",
                            delayMs, attempt + 1, maxRetries);
                    try {
                        Thread.sleep(delayMs);
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                    }
                    delayMs *= 2;
                } else {
                    log.error("Groq API error on attempt {}: {} {}",
                            attempt, e.getStatusCode(), e.getResponseBodyAsString());
                    throw e;
                }
            }
        }

        return "AI service is currently rate-limited. Please wait a moment and try again.";
    }

    // Convert float[] to PostgreSQL vector string format
    // e.g. [0.1, 0.2, 0.3] → "[0.1,0.2,0.3]"
    private String toPostgresVector(float[] embedding) {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < embedding.length; i++) {
            sb.append(embedding[i]);
            if (i < embedding.length - 1)
                sb.append(",");
        }
        sb.append("]");
        return sb.toString();
    }
}