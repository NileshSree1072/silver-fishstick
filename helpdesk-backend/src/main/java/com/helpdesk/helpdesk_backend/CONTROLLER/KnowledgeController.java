package com.helpdesk.helpdesk_backend.CONTROLLER;

import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.helpdesk.helpdesk_backend.DTO.REQUEST.CreateArticleRequest;
import com.helpdesk.helpdesk_backend.DTO.REQUEST.UpdateArticleRequest;
import com.helpdesk.helpdesk_backend.DTO.RESPONSE.ArticleResponse;
import com.helpdesk.helpdesk_backend.ENTITY.Reply;
import com.helpdesk.helpdesk_backend.ENTITY.Ticket;
import com.helpdesk.helpdesk_backend.ENTITY.User;
import com.helpdesk.helpdesk_backend.REPOSITORY.ReplyRepository;
import com.helpdesk.helpdesk_backend.REPOSITORY.TicketRepository;
import com.helpdesk.helpdesk_backend.SERVICE.KnowledgeService;

import org.springframework.web.bind.annotation.RequestBody;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/knowledge")
@RequiredArgsConstructor
public class KnowledgeController {

    private final KnowledgeService knowledgeService;
    private final TicketRepository ticketRepo;
    private final ReplyRepository  replyRepo;

    private User currentUser(Authentication auth) {
        return (User) auth.getPrincipal();
    }

    // ── PUBLIC — no auth needed ──────────────────────────────────

    @GetMapping
    public ResponseEntity<List<ArticleResponse>> getPublished() {
        return ResponseEntity.ok(knowledgeService.getPublishedArticles());
    }

    @GetMapping("/{id}")
    public ResponseEntity<ArticleResponse> getOne(@PathVariable UUID id) {
        return ResponseEntity.ok(knowledgeService.getById(id));
    }

    @GetMapping("/category/{categoryId}")
    public ResponseEntity<List<ArticleResponse>> getByCategory(
            @PathVariable UUID categoryId) {
        return ResponseEntity.ok(knowledgeService.getByCategory(categoryId));
    }

    @GetMapping("/search")
    public ResponseEntity<List<ArticleResponse>> search(
            @RequestParam String q) {
        return ResponseEntity.ok(knowledgeService.search(q));
    }

    // ── AGENT ────────────────────────────────────────────────────

    // Create a new draft article
    @PostMapping
    @PreAuthorize("hasAnyRole('AGENT','ADMIN')")
    public ResponseEntity<ArticleResponse> create(
            @Valid @RequestBody CreateArticleRequest req,
            Authentication auth) {
        return ResponseEntity.status(201)
                .body(knowledgeService.createDraftArticle(req, currentUser(auth)));
    }

    // Update own draft article
    @PatchMapping("/{id}")
    @PreAuthorize("hasAnyRole('AGENT','ADMIN')")
    public ResponseEntity<ArticleResponse> update(
            @PathVariable UUID id,
            @RequestBody UpdateArticleRequest req,
            Authentication auth) {
        return ResponseEntity.ok(
                knowledgeService.updateDraftArticle(id, req, currentUser(auth)));
    }

    // Agent's own articles
    @GetMapping("/my")
    @PreAuthorize("hasAnyRole('AGENT','ADMIN')")
    public ResponseEntity<List<ArticleResponse>> myArticles(
            Authentication auth) {
        return ResponseEntity.ok(
                knowledgeService.getMyArticles(currentUser(auth)));
    }

    // Create article directly from a resolved ticket
    @PostMapping("/from-ticket/{ticketId}")
    @PreAuthorize("hasAnyRole('AGENT','ADMIN')")
    public ResponseEntity<ArticleResponse> createFromTicket(
            @PathVariable UUID ticketId,
            @RequestParam(required = false) String notes,
            Authentication auth) {

        Ticket ticket = ticketRepo.findById(ticketId)
                .orElseThrow(() -> new RuntimeException("Ticket not found"));

        // Get the last public reply as the solution
        List<Reply> replies = replyRepo
                .findByTicketAndIsInternalFalseOrderByCreatedAtAsc(ticket);

        String solution = replies.isEmpty() ? "See ticket description."
                : replies.get(replies.size() - 1).getMessage();

        return ResponseEntity.status(201).body(
                knowledgeService.createFromTicket(
                        ticketId, notes, currentUser(auth), ticket, solution));
    }

    // ── ADMIN ─────────────────────────────────────────────────────

    // All pending articles awaiting approval
    @GetMapping("/pending")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<ArticleResponse>> getPending() {
        return ResponseEntity.ok(knowledgeService.getPendingArticles());
    }

    // All articles (admin overview)
    @GetMapping("/all")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Page<ArticleResponse>> getAll(
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(knowledgeService.getAllArticles(
                PageRequest.of(page, size, Sort.by("createdAt").descending())));
    }

    // Publish an article
    @PatchMapping("/{id}/publish")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ArticleResponse> publish(@PathVariable UUID id) {
        return ResponseEntity.ok(knowledgeService.publishArticle(id));
    }

    // Unpublish — take it offline without deleting
    @PatchMapping("/{id}/unpublish")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ArticleResponse> unpublish(@PathVariable UUID id) {
        return ResponseEntity.ok(knowledgeService.unpublishArticle(id));
    }

    // Delete article permanently
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('AGENT','ADMIN')")
    public ResponseEntity<Void> delete(
            @PathVariable UUID id,
            Authentication auth) {
        knowledgeService.deleteArticle(id, currentUser(auth));
        return ResponseEntity.noContent().build();
    }
}
