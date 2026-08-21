package com.helpdesk.helpdesk_backend.DTO.RESPONSE;

import java.time.LocalDateTime;
import java.util.UUID;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ArticleResponse {
    private UUID          id;
    private String        title;
    private String        content;
    private UUID          categoryId;
    private String        categoryName;
    private UUID          authorId;
    private String        authorName;
    private boolean       isPublished;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    
}
