package com.helpdesk.helpdesk_backend.CONTROLLER;

import java.util.List;
import java.util.UUID;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.helpdesk.helpdesk_backend.DTO.REQUEST.AiOutputFeedbackRequest;
import com.helpdesk.helpdesk_backend.DTO.REQUEST.AiRewriteRequest;
import com.helpdesk.helpdesk_backend.ENTITY.User;
import com.helpdesk.helpdesk_backend.EXCEPTION.BadRequestException;
import com.helpdesk.helpdesk_backend.EXCEPTION.NotFoundException;
import com.helpdesk.helpdesk_backend.SERVICE.AIService;

import jakarta.validation.Valid;

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
    public ResponseEntity<Map<String, Object>> getDraft(
            @PathVariable UUID ticketId) {
        try {
            AIService.DraftResult result = aiService.generateDraftReply(ticketId);
            return ResponseEntity.ok(Map.of("draft", result.draft(), "sources", result.sources()));
        } catch (Exception e) {
            log.error("Failed to generate AI draft for ticket {}: {}", ticketId, e.getMessage());
            return ResponseEntity.ok(Map.of("draft",
                "Unable to generate an AI draft at this time. The AI service may be unavailable. Please write your reply manually.",
                "sources", List.of()));
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

    // AGENT: sentiment, customer deadline and suggested priority
    @GetMapping("/insights/{ticketId}")
    @PreAuthorize("hasAnyRole('AGENT','ADMIN')")
    public ResponseEntity<Map<String, Object>> insights(@PathVariable UUID ticketId) {
        try {
            return ResponseEntity.ok(aiService.getInsights(ticketId));
        } catch (NotFoundException e) {
            throw e;
        } catch (Exception e) {
            log.error("Failed to generate insights for ticket {}: {}", ticketId, e.getMessage());
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(Map.of("message", "AI insights are unavailable right now."));
        }
    }

    // AGENT: possible duplicates / related tickets
    @GetMapping("/similar/{ticketId}")
    @PreAuthorize("hasAnyRole('AGENT','ADMIN')")
    public ResponseEntity<List<Map<String, Object>>> similar(@PathVariable UUID ticketId) {
        try {
            return ResponseEntity.ok(aiService.findSimilarTickets(ticketId));
        } catch (NotFoundException e) {
            throw e;
        } catch (Exception e) {
            log.error("Similar-ticket search failed for {}: {}", ticketId, e.getMessage());
            return ResponseEntity.ok(List.of());
        }
    }

    // AGENT: improve / shorten / translate a reply before sending
    @PostMapping("/rewrite")
    @PreAuthorize("hasAnyRole('AGENT','ADMIN')")
    public ResponseEntity<Map<String, String>> rewrite(@Valid @RequestBody AiRewriteRequest req) {
        try {
            return ResponseEntity.ok(Map.of("text", aiService.rewriteReply(req.getTicketId(), req.getText(), req.getMode())));
        } catch (BadRequestException | NotFoundException e) {
            throw e;
        } catch (Exception e) {
            log.error("Rewrite failed for ticket {}: {}", req.getTicketId(), e.getMessage());
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(Map.of("message", "AI rewrite is unavailable right now."));
        }
    }

    // AGENT: thumbs-up / thumbs-down on a summary, draft or insight
    @PostMapping("/feedback")
    @PreAuthorize("hasAnyRole('AGENT','ADMIN')")
    public ResponseEntity<Void> feedback(@Valid @RequestBody AiOutputFeedbackRequest req, Authentication auth) {
        aiService.recordOutputFeedback(req.getTicketId(), (User) auth.getPrincipal(), req.getKind(), req.getHelpful());
        return ResponseEntity.noContent().build();
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
