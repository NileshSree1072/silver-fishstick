package com.helpdesk.helpdesk_backend.DTO.REQUEST;

import java.util.UUID;

import lombok.Data;

@Data
public class UpdateArticleRequest {
    
    private String title;
    private String content;
    private UUID categoryId;
    
}
