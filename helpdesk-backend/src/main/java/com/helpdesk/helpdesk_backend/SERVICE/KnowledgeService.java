package com.helpdesk.helpdesk_backend.SERVICE;

import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import com.helpdesk.helpdesk_backend.DTO.REQUEST.CreateArticleRequest;
import com.helpdesk.helpdesk_backend.DTO.REQUEST.UpdateArticleRequest;
import com.helpdesk.helpdesk_backend.DTO.RESPONSE.ArticleResponse;
import com.helpdesk.helpdesk_backend.ENTITY.Category;
import com.helpdesk.helpdesk_backend.ENTITY.KnowledgeArticle;
import com.helpdesk.helpdesk_backend.ENTITY.Ticket;
import com.helpdesk.helpdesk_backend.ENTITY.User;
import com.helpdesk.helpdesk_backend.ENUM.Role;
import com.helpdesk.helpdesk_backend.EXCEPTION.BadRequestException;
import com.helpdesk.helpdesk_backend.EXCEPTION.NotFoundException;
import com.helpdesk.helpdesk_backend.EXCEPTION.UnauthorizedException;
import com.helpdesk.helpdesk_backend.REPOSITORY.CategoryRepository;
import com.helpdesk.helpdesk_backend.REPOSITORY.KnowledgeRepository;
import com.helpdesk.helpdesk_backend.UTIL.ArticleMapper;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class KnowledgeService {
    private final ArticleMapper articleMapper;
    private final KnowledgeRepository knowledgeRepository;
    private final EmbeddingService embeddingService;
    private final CategoryRepository categoryRepository;
    private final AIService aiService;

    //Agent create draft article
    public ArticleResponse createDraftArticle(CreateArticleRequest request, User author) {
        
        Category category = null;
        if(request.getCategoryId() != null) {
            category = categoryRepository.findById(request.getCategoryId())
                    .orElseThrow(() -> new NotFoundException("Category", request.getCategoryId()));
        }
        
        KnowledgeArticle article = KnowledgeArticle.builder()
                .title(request.getTitle())
                .content(request.getContent())
                .category(category)
                .author(author)
                .isPublished(false)   // always starts as draft
                .build();

        knowledgeRepository.save(article);

        embedArticleAsync(article);
        return articleMapper.toResponse(article);
    }

    //agent update the draft
    

    public ArticleResponse updateDraftArticle(UUID articleId, UpdateArticleRequest request, User currentUser) {
        KnowledgeArticle article = findOrThrow(articleId);
        
        // Only admins or the article's own author can update
        if (currentUser.getRole() != Role.ADMIN && !article.getAuthor().getId().equals(currentUser.getId())) {
            throw new UnauthorizedException("You don't have permission to update this article");
        }

        // Published articles can only be edited by admins
        if (article.isPublished() && currentUser.getRole() != Role.ADMIN) {
            throw new BadRequestException("Cannot update a published article. Ask admin to unpublish first.");
        }

        if(request.getTitle() != null) {
            article.setTitle(request.getTitle());
        }
        if(request.getContent() != null) {
            article.setContent(request.getContent());
        }

        if(request.getCategoryId() != null) {
            Category category = categoryRepository.findById(request.getCategoryId())
                    .orElseThrow(() -> new NotFoundException("Category", request.getCategoryId()));
            article.setCategory(category);
        }
        knowledgeRepository.save(article);

        if(request.getContent() != null || request.getTitle() != null) {
            embedArticleAsync(article);
        }

        return articleMapper.toResponse(article);
    }


    // ── ADMIN: publish an article ────────────────────────────────

    public ArticleResponse publishArticle(UUID id) {
        KnowledgeArticle article = findOrThrow(id);

        // Make sure embedding exists before publishing
        // So AI can use it immediately after publish
        if (article.getEmbedding() == null) {
            float[] embedding = embeddingService.embed(
                    article.getTitle() + " " + article.getContent());
            article.setEmbedding(embedding);
        }

        article.setPublished(true);
        return articleMapper.toResponse(knowledgeRepository.save(article));
    }

    // ── ADMIN: unpublish an article ──────────────────────────────

    public ArticleResponse unpublishArticle(UUID id) {
        KnowledgeArticle article = findOrThrow(id);
        article.setPublished(false);
        return articleMapper.toResponse(knowledgeRepository.save(article));
    }

    // ── ADMIN/AGENT: delete an article ───────────────────────────

    public void deleteArticle(UUID id, User currentUser) {
        KnowledgeArticle article = findOrThrow(id);
        if (currentUser.getRole() != Role.ADMIN && !article.getAuthor().getId().equals(currentUser.getId())) {
            throw new UnauthorizedException("You don't have permission to delete this article");
        }
        knowledgeRepository.delete(article);
    }

    // All published articles (public — no auth needed)
    public List<ArticleResponse> getPublishedArticles() {
        return articleMapper.toResponseList(
                knowledgeRepository.findByIsPublishedTrueOrderByCreatedAtDesc());
    }

    // Published articles by category
    public List<ArticleResponse> getByCategory(UUID categoryId) {
        Category category = categoryRepository.findById(categoryId)
            .orElseThrow(() -> new NotFoundException("Category", categoryId));
        return articleMapper.toResponseList(
                knowledgeRepository.findByIsPublishedTrueAndCategoryOrderByCreatedAtDesc(
                        category));
    }

    // Keyword search across published articles
    public List<ArticleResponse> search(String query) {
        return articleMapper.toResponseList(knowledgeRepository.searchPublishedArticles(query));
    }

    // Single article by id
    public ArticleResponse getById(UUID id) {
        return articleMapper.toResponse(findOrThrow(id));
    }

    // ── READ: agent endpoints ────────────────────────────────────

    // Agent's own articles (drafts + published)
    public List<ArticleResponse> getMyArticles(User agent) {
        return articleMapper.toResponseList(
                knowledgeRepository.findByAuthorOrderByCreatedAtDesc(agent));
    }

    // ── READ: admin endpoints ────────────────────────────────────

    // All articles pending approval
    public List<ArticleResponse> getPendingArticles() {
        return articleMapper.toResponseList(
                knowledgeRepository.findByIsPublishedFalseOrderByCreatedAtDesc());
    }

    // All articles paginated
    public Page<ArticleResponse> getAllArticles(Pageable pageable) {
        return knowledgeRepository.findAll(pageable).map(articleMapper::toResponse);
    }

     // ── SHORTCUT: agent creates article directly from a resolved ticket ──
    // Called when agent clicks "Save as article" on a resolved ticket
    // Pre-fills title and content from the ticket + its solution reply

    public ArticleResponse createFromTicket(UUID ticketId,
                                             String additionalNotes,
                                             User agent,
                                             Ticket ticket,
                                             String solutionMessage) {
        java.util.Map<String, String> aiKb = aiService.generateKBFromTicket(ticket);
        
        CreateArticleRequest req = new CreateArticleRequest();
        req.setTitle(aiKb.getOrDefault("title", "How to fix: " + ticket.getTitle()));
        
        String content = aiKb.getOrDefault("content", "## Problem Description\n" + ticket.getDescription() + "\n\n## Resolution\n" + solutionMessage);
        if (additionalNotes != null && !additionalNotes.trim().isEmpty()) {
            content += "\n\n## Additional Agent Notes\n" + additionalNotes;
        }
        req.setContent(content);

        if (ticket.getCategory() != null) {
            req.setCategoryId(ticket.getCategory().getId());
        }
        return createDraftArticle(req, agent);
    }

    

    // ── HELPERS ─────────────────────────────────────────────────

    private KnowledgeArticle findOrThrow(UUID id) {
        return knowledgeRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Article", id));
    }

    // Generate and store embedding on the article
    // Done after save so the article ID exists in DB
    private void embedArticleAsync(KnowledgeArticle article) {
        try {
            float[] embedding = embeddingService.embed(
                    article.getTitle() + " " + article.getContent());
            article.setEmbedding(embedding);
            knowledgeRepository.save(article);
        } catch (Exception e) {
            log.warn("Failed to embed article {}: {}", article.getId(), e.getMessage());
            // Non-fatal — article still saved, just without embedding
        }
    }

}
