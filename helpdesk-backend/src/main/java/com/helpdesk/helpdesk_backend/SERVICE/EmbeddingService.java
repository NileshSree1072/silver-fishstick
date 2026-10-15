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
    private final WebClient openAiWebClient;
    private final ActivityService activityService;

    @Value("${app.azure.openai.endpoint:}")
    private String azureEndpoint;

    @Value("${app.azure.openai.api-key:}")
    private String azureApiKey;

    @Value("${app.openai.api-key:}")
    private String openAiApiKey;

    @Value("${app.openai.embedding-model:text-embedding-3-small}")
    private String openAiEmbeddingModel;

    @Value("${app.azure.openai.api-version}")
    private String apiVersion;

    public EmbeddingService(
            @Qualifier("azureOpenAiWebClient") WebClient azureOpenAiWebClient,
            @Qualifier("openAiWebClient") WebClient openAiWebClient,
            ActivityService activityService) {
        this.azureOpenAiWebClient = azureOpenAiWebClient;
        this.openAiWebClient = openAiWebClient;
        this.activityService = activityService;
    }

    /**
     * Convert text to a float[] vector using Azure OpenAI embeddings, standard OpenAI, or mock embeddings.
     * Retries up to 3 times with exponential backoff on 429.
     */
    public float[] embed(String text) {
        long startTime = System.currentTimeMillis();

        boolean hasAzure = azureEndpoint != null && !azureEndpoint.isBlank() && !azureEndpoint.startsWith("${");
        boolean hasOpenAi = openAiApiKey != null && !openAiApiKey.isBlank() && !openAiApiKey.startsWith("${");

        if (hasAzure) {
            log.info("Using Azure OpenAI for embedding generation.");
            return embedAzure(text, startTime);
        } else if (hasOpenAi) {
            log.info("Using standard OpenAI for embedding generation.");
            return embedStandard(text, startTime);
        } else {
            log.warn("Neither Azure OpenAI nor standard OpenAI configurations found. Falling back to deterministic Mock Embeddings.");
            float[] result = generateMockEmbedding(text);
            long durationMs = System.currentTimeMillis() - startTime;
            activityService.embeddingComputed(null, durationMs, result.length);
            return result;
        }
    }

    @SuppressWarnings("unchecked")
    private float[] embedAzure(String text, long startTime) {
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

                return parseEmbeddingResponse(response, startTime);

            } catch (WebClientResponseException e) {
                if (e.getStatusCode() == HttpStatus.TOO_MANY_REQUESTS && attempt < maxRetries) {
                    log.warn("Rate limited by Azure OpenAI (embeddings). Waiting {}ms before retry {}/{}",
                             delayMs, attempt + 1, maxRetries);
                    try { Thread.sleep(delayMs); } catch (InterruptedException ie) { Thread.currentThread().interrupt(); }
                    delayMs *= 2;
                } else {
                    log.error("Azure OpenAI embedding error on attempt {}: {} - {}",
                              attempt, e.getStatusCode(), e.getResponseBodyAsString());
                    throw new BadRequestException("Failed to generate embedding via Azure: " + e.getStatusCode());
                }
            } catch (Exception e) {
                log.error("Embedding failed unexpectedly on attempt {}: {}", attempt, e.getMessage());
                throw new BadRequestException("Failed to generate embedding via Azure: " + e.getMessage());
            }
        }

        throw new BadRequestException("Failed to generate embedding after " + maxRetries + " attempts (rate limited)");
    }

    @SuppressWarnings("unchecked")
    private float[] embedStandard(String text, long startTime) {
        Map<String, Object> requestBody = Map.of(
            "input", text.substring(0, Math.min(text.length(), 8000)),
            "model", openAiEmbeddingModel
        );

        int  maxRetries = 3;
        long delayMs    = 2000;

        for (int attempt = 1; attempt <= maxRetries; attempt++) {
            final int currentAttempt = attempt;
            try {
                Map<String, Object> response = openAiWebClient.post()
                        .uri("/embeddings")
                        .bodyValue(requestBody)
                        .retrieve()
                        .onStatus(HttpStatus.TOO_MANY_REQUESTS::equals, resp -> {
                            log.warn("OpenAI 429 rate-limit hit on embedding (attempt {}/{})",
                                     currentAttempt, maxRetries);
                            return resp.createException();
                        })
                        .bodyToMono(Map.class)
                        .block();

                if (response == null) {
                    throw new BadRequestException("OpenAI returned null embedding response");
                }

                return parseEmbeddingResponse(response, startTime);

            } catch (WebClientResponseException e) {
                if (e.getStatusCode() == HttpStatus.TOO_MANY_REQUESTS && attempt < maxRetries) {
                    log.warn("Rate limited by OpenAI (embeddings). Waiting {}ms before retry {}/{}",
                             delayMs, attempt + 1, maxRetries);
                    try { Thread.sleep(delayMs); } catch (InterruptedException ie) { Thread.currentThread().interrupt(); }
                    delayMs *= 2;
                } else {
                    log.error("OpenAI embedding error on attempt {}: {} - {}",
                              attempt, e.getStatusCode(), e.getResponseBodyAsString());
                    throw new BadRequestException("Failed to generate embedding via OpenAI: " + e.getStatusCode());
                }
            } catch (Exception e) {
                log.error("Embedding failed unexpectedly on attempt {}: {}", attempt, e.getMessage());
                throw new BadRequestException("Failed to generate embedding via OpenAI: " + e.getMessage());
            }
        }

        throw new BadRequestException("Failed to generate embedding after " + maxRetries + " attempts (rate limited)");
    }

    @SuppressWarnings("unchecked")
    private float[] parseEmbeddingResponse(Map<String, Object> response, long startTime) {
        List<Map<String, Object>> data = (List<Map<String, Object>>) response.get("data");
        if (data == null || data.isEmpty()) {
            throw new BadRequestException("OpenAI returned empty embedding data");
        }

        List<Double> embedding = (List<Double>) data.get(0).get("embedding");

        float[] result = new float[embedding.size()];
        for (int i = 0; i < embedding.size(); i++) {
            result[i] = embedding.get(i).floatValue();
        }
        long durationMs = System.currentTimeMillis() - startTime;
        activityService.embeddingComputed(null, durationMs, result.length);
        return result;
    }

    public static final java.util.Set<String> STOP_WORDS = java.util.Set.of(
        "the", "a", "an", "is", "it", "to", "for", "in", "on", "at", "by", "of", "and", "or", "with",
        "this", "that", "these", "those", "am", "are", "was", "were", "be", "been", "being", "have", "has",
        "had", "do", "does", "did", "from", "as", "if", "my", "your", "his", "her", "their", "our"
    );

    private float[] generateMockEmbedding(String text) {
        final int DIM = 3072;
        float[] vector = new float[DIM];
        if (text == null || text.isBlank()) {
            return vector;
        }

        String normalized = text.toLowerCase().replaceAll("[^a-z0-9\\s]", " ");
        String[] tokens = normalized.trim().split("\\s+");

        for (String token : tokens) {
            if (token.isBlank()) continue;
            boolean isStopWord = STOP_WORDS.contains(token);
            float tokenWeight = isStopWord ? 0.15f : (token.length() >= 4 ? 1.5f : 0.8f);

            int hash1 = Math.abs((token + "_h1").hashCode()) % DIM;
            int hash2 = Math.abs((token + "_h2").hashCode()) % DIM;
            int hash3 = Math.abs((token + "_h3").hashCode()) % DIM;
            int hash4 = Math.abs((token + "_h4").hashCode()) % DIM;
            int hash5 = Math.abs((token + "_h5").hashCode()) % DIM;

            vector[hash1] += tokenWeight;
            vector[hash2] += tokenWeight * 0.8f;
            vector[hash3] += tokenWeight * 0.6f;
            vector[hash4] += tokenWeight * 0.4f;
            vector[hash5] += tokenWeight * 0.2f;

            if (token.length() >= 3 && !isStopWord) {
                for (int i = 0; i <= token.length() - 3; i++) {
                    String trigram = token.substring(i, i + 3);
                    int triHash = Math.abs((trigram + "_tri").hashCode()) % DIM;
                    vector[triHash] += 0.35f;
                }
            }
        }

        double sumSq = 0.0;
        for (int i = 0; i < DIM; i++) {
            sumSq += vector[i] * vector[i];
        }
        float norm = (float) Math.sqrt(sumSq);
        if (norm > 0.0f) {
            for (int i = 0; i < DIM; i++) {
                vector[i] /= norm;
            }
        }
        return vector;
    }

    // Combine title + description for richer embedding
    public float[] embedTicket(String title, String description) {
        return embed(title + " " + description);
    }
}
