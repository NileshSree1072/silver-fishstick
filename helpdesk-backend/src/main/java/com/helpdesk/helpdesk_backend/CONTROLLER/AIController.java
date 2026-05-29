package com.helpdesk.helpdesk_backend.CONTROLLER;

import java.util.List;
import java.util.UUID;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.helpdesk.helpdesk_backend.SERVICE.AIService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
@Slf4j
public class AIController {

    private final AIService aiService;

    // AGENT: get AI draft reply for a ticket
    @GetMapping("/draft/{ticketId}")
    @PreAuthorize("hasAnyRole('AGENT','ADMIN')")
    public ResponseEntity<Map<String, String>> getDraft(
            @PathVariable UUID ticketId) {
        try {
            String draft = aiService.generateDraftReply(ticketId);
            return ResponseEntity.ok(Map.of("draft", draft));
        } catch (Exception e) {
            log.error("Failed to generate AI draft for ticket {}: {}", ticketId, e.getMessage());
            return ResponseEntity.ok(Map.of("draft",
                "Unable to generate an AI draft at this time. The AI service may be unavailable. Please write your reply manually."));
        }
    }

    // AGENT: summarize a long ticket thread
    @GetMapping("/summarize/{ticketId}")
    @PreAuthorize("hasAnyRole('AGENT','ADMIN')")
    public ResponseEntity<Map<String, String>> summarize(
            @PathVariable UUID ticketId) {
        try {
            String summary = aiService.summarizeTicket(ticketId);
            return ResponseEntity.ok(Map.of("summary", summary));
        } catch (Exception e) {
            log.error("Failed to summarize ticket {}: {}", ticketId, e.getMessage());
            return ResponseEntity.ok(Map.of("summary",
                "Unable to generate a summary at this time. The AI service may be unavailable."));
        }
    }

    // USER: semantic search before submitting ticket
    @GetMapping("/search")
    public ResponseEntity<List<Map<String, Object>>> search(
            @RequestParam String query) {
        try {
            return ResponseEntity.ok(aiService.semanticSearch(query));
        } catch (Exception e) {
            log.error("Semantic search failed for query '{}': {}", query, e.getMessage());
            // Return empty list instead of 500 — deflection is best-effort
            return ResponseEntity.ok(List.of());
        }
    }
}
