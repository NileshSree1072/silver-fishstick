package com.helpdesk.helpdesk_backend.SERVICE;

import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import com.helpdesk.helpdesk_backend.EXCEPTION.BadRequestException;

import lombok.extern.slf4j.Slf4j;

import com.helpdesk.helpdesk_backend.SERVICE.ActivityService;

@Service
@Slf4j
public class EmbeddingService {

    // Azure OpenAI WebClient (baseUrl already includes /openai/deployments/{deployment})
    private final WebClient azureOpenAiWebClient;
    private final ActivityService activityService;

    @Value("${app.azure.openai.api-version}")
    private String apiVersion;

    public EmbeddingService(@Qualifier("azureOpenAiWebClient") WebClient azureOpenAiWebClient, ActivityService activityService) {
        this.azureOpenAiWebClient = azureOpenAiWebClient;
        this.activityService = activityService;
    }

    /**
     * Convert text to a float[] vector using Azure OpenAI embeddings.
     * Azure endpoint: POST .../embeddings?api-version={version}
     * Retries up to 3 times with exponential backoff on 429.
     */
    @SuppressWarnings("unchecked")
    public float[] embed(String text) {
        long startTime = System.currentTimeMillis();
        // Azure OpenAI does NOT need a "model" field — deployment is in the URL
        Map<String, Object> requestBody = Map.of(
            "input", text.substring(0, Math.min(text.length(), 8000))
        );

        int  maxRetries = 3;
        long delayMs    = 2000; // start 2 s, doubles each retry

        for (int attempt = 1; attempt <= maxRetries; attempt++) {
            final int currentAttempt = attempt;
            try {
                Map<String, Object> response = azureOpenAiWebClient.post()
                        .uri(uriBuilder -> uriBuilder
                                .path("/embeddings")
                                .queryParam("api-version", apiVersion)
                                .build())
                        .bodyValue(requestBody)
                        .retrieve()
                        .onStatus(HttpStatus.TOO_MANY_REQUESTS::equals, resp -> {
                            log.warn("Azure OpenAI 429 rate-limit hit on embedding (attempt {}/{})",
                                     currentAttempt, maxRetries);
                            return resp.createException();
                        })
                        .bodyToMono(Map.class)
                        .block();

                if (response == null) {
                    throw new BadRequestException("Azure OpenAI returned null embedding response");
                }

                List<Map<String, Object>> data = (List<Map<String, Object>>) response.get("data");
                if (data == null || data.isEmpty()) {
                    throw new BadRequestException("Azure OpenAI returned empty embedding data");
                }

                List<Double> embedding = (List<Double>) data.get(0).get("embedding");

                float[] result = new float[embedding.size()];
                for (int i = 0; i < embedding.size(); i++) {
                    result[i] = embedding.get(i).floatValue();
                }
                long durationMs = System.currentTimeMillis() - startTime;
                activityService.embeddingComputed(null, durationMs, result.length);
                return result;

            } catch (WebClientResponseException e) {
                if (e.getStatusCode() == HttpStatus.TOO_MANY_REQUESTS && attempt < maxRetries) {
                    log.warn("Rate limited by Azure OpenAI (embeddings). Waiting {}ms before retry {}/{}",
                             delayMs, attempt + 1, maxRetries);
                    try { Thread.sleep(delayMs); } catch (InterruptedException ie) { Thread.currentThread().interrupt(); }
                    delayMs *= 2;
                } else {
                    log.error("Azure OpenAI embedding error on attempt {}: {} - {}",
                              attempt, e.getStatusCode(), e.getResponseBodyAsString());
                    throw new BadRequestException("Failed to generate embedding: " + e.getStatusCode());
                }
            } catch (Exception e) {
                log.error("Embedding failed unexpectedly on attempt {}: {}", attempt, e.getMessage());
                throw new BadRequestException("Failed to generate embedding: " + e.getMessage());
            }
        }

        throw new BadRequestException("Failed to generate embedding after " + maxRetries + " attempts (rate limited)");
    }

    // Combine title + description for richer embedding
    public float[] embedTicket(String title, String description) {
        return embed(title + " " + description);
    }
}
