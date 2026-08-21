package com.helpdesk.helpdesk_backend.DTO.RESPONSE;

import java.time.LocalDateTime;
import java.util.UUID;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class EmailTemplateResponse {
    private UUID id;
    private String templateType;
    private String subjectTemplate;
    private String bodyTemplate;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}