package com.helpdesk.helpdesk_backend.DTO.REQUEST;

import lombok.Data;

@Data
public class UpdateEmailTemplateRequest {
    private String subjectTemplate;
    private String bodyTemplate;
}