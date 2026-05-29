package com.helpdesk.helpdesk_backend.CONFIG;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.function.client.WebClient;

@Configuration
public class OpenAIConfig {

    // ── Legacy OpenAI (kept for any direct openAiWebClient references) ────────
    @Value("${app.openai.api-key}")
    private String openAiApiKey;

    @Bean
    public WebClient openAiWebClient() {
        return WebClient.builder()
                .baseUrl("https://api.openai.com/v1")
                .defaultHeader("Authorization", "Bearer " + openAiApiKey)
                .defaultHeader("Content-Type",  "application/json")
                .build();
    }

    // ── Azure OpenAI (embeddings) ─────────────────────────────────────────────
    @Value("${app.azure.openai.endpoint}")
    private String azureEndpoint;

    @Value("${app.azure.openai.api-key}")
    private String azureApiKey;

    @Value("${app.azure.openai.embedding-deployment}")
    private String embeddingDeployment;

    @Value("${app.azure.openai.api-version}")
    private String apiVersion;

    /**
     * WebClient for Azure OpenAI embeddings.
     * URL pattern: {endpoint}/openai/deployments/{deployment}/embeddings?api-version={version}
     * Auth header: api-key (not Bearer)
     */
    @Bean
    public WebClient azureOpenAiWebClient() {
        // Base URL ends at the deployment level; the service appends /embeddings?api-version=...
        String baseUrl = azureEndpoint.replaceAll("/$", "")
                + "/openai/deployments/" + embeddingDeployment;
        return WebClient.builder()
                .baseUrl(baseUrl)
                .defaultHeader("api-key",       azureApiKey)
                .defaultHeader("Content-Type",  "application/json")
                .build();
    }

    // ── Groq (chat / LLM) ─────────────────────────────────────────────────────
    @Value("${app.groq.api-key}")
    private String groqApiKey;

    @Value("${app.groq.base-url}")
    private String groqBaseUrl;

    /**
     * WebClient for Groq chat completions.
     * Groq is OpenAI-compatible — same request/response shape, different base URL.
     */
    @Bean
    public WebClient groqWebClient() {
        return WebClient.builder()
                .baseUrl(groqBaseUrl)
                .defaultHeader("Authorization", "Bearer " + groqApiKey)
                .defaultHeader("Content-Type",  "application/json")
                .build();
    }
}