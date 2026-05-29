package com.helpdesk.helpdesk_backend.UTIL;

import java.util.List;

import org.springframework.stereotype.Component;

import com.helpdesk.helpdesk_backend.DTO.RESPONSE.ArticleResponse;
import com.helpdesk.helpdesk_backend.ENTITY.KnowledgeArticle;

@Component
public class ArticleMapper {
    
    public ArticleResponse toResponse(KnowledgeArticle article) {
        return ArticleResponse.builder()
                .id(article.getId())
                .title(article.getTitle())
                .content(article.getContent())
                .categoryId(article.getCategory() != null
                        ? article.getCategory().getId()
                        : null)
                .categoryName(article.getCategory() != null
                        ? article.getCategory().getName()
                        : null)
                .authorId(article.getAuthor().getId())
                .authorName(article.getAuthor().getName())
                .isPublished(article.isPublished())
                .createdAt(article.getCreatedAt())
                .updatedAt(article.getUpdatedAt())
                .build();
    }

    public List<ArticleResponse> toResponseList(List<KnowledgeArticle> articles) {
        return articles.stream().map(this::toResponse).toList();
    }
}
