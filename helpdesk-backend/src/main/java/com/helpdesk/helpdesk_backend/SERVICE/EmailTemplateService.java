package com.helpdesk.helpdesk_backend.SERVICE;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.helpdesk.helpdesk_backend.DTO.REQUEST.UpdateEmailTemplateRequest;
import com.helpdesk.helpdesk_backend.DTO.RESPONSE.EmailTemplateResponse;
import com.helpdesk.helpdesk_backend.ENTITY.EmailTemplate;
import com.helpdesk.helpdesk_backend.ENUM.EmailTemplateType;
import com.helpdesk.helpdesk_backend.REPOSITORY.EmailTemplateRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class EmailTemplateService {

    private final EmailTemplateRepository emailTemplateRepository;

    @Transactional
    public List<EmailTemplateResponse> getAllTemplates() {
        ensureDefaults();
        return emailTemplateRepository.findAll().stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public EmailTemplateResponse getTemplate(EmailTemplateType templateType) {
        return toResponse(findOrCreateTemplate(templateType));
    }

    @Transactional
    public EmailTemplateResponse updateTemplate(EmailTemplateType templateType,
            UpdateEmailTemplateRequest request) {
        EmailTemplate template = findOrCreateTemplate(templateType);
        template.setSubjectTemplate(request.getSubjectTemplate() == null ? "" : request.getSubjectTemplate().trim());
        template.setBodyTemplate(request.getBodyTemplate() == null ? "" : request.getBodyTemplate().trim());
        return toResponse(emailTemplateRepository.save(template));
    }

    @Transactional
    public String renderSubject(EmailTemplateType templateType, Map<String, String> variables) {
        return render(findOrCreateTemplate(templateType).getSubjectTemplate(), variables, false);
    }

    @Transactional
    public String renderBody(EmailTemplateType templateType, Map<String, String> variables) {
        return render(findOrCreateTemplate(templateType).getBodyTemplate(), variables, true);
    }

    private void ensureDefaults() {
        for (EmailTemplateType templateType : EmailTemplateType.values()) {
            findOrCreateTemplate(templateType);
        }
    }

    private EmailTemplate findOrCreateTemplate(EmailTemplateType templateType) {
        return emailTemplateRepository.findByTemplateType(templateType)
                .orElseGet(() -> emailTemplateRepository.save(defaultTemplate(templateType)));
    }

    private EmailTemplate defaultTemplate(EmailTemplateType templateType) {
        return switch (templateType) {
            case TICKET_CREATED -> EmailTemplate.builder()
                    .templateType(templateType)
                    .subjectTemplate("Your ticket has been received - #{{ticketId}}")
                    .bodyTemplate("""
                            <h2>Hi {{recipientName}},</h2>
                            <p>Your ticket <strong>"{{ticketTitle}}"</strong> has been received and assigned to our support team.</p>
                            <p>Priority: <strong>{{priority}}</strong></p>
                            <p>Ticket ID: <strong>#{{ticketId}}</strong></p>
                            <p>We will get back to you shortly.</p>
                            """)
                    .build();
            case AGENT_REPLIED -> EmailTemplate.builder()
                    .templateType(templateType)
                    .subjectTemplate("New reply on your ticket: {{ticketTitle}}")
                    .bodyTemplate("""
                            <h2>Hi {{recipientName}},</h2>
                            <p>Our support team has replied to your ticket: <strong>"{{ticketTitle}}"</strong></p>
                            <p>Login to view the full reply and respond.</p>
                            """)
                    .build();
            case TICKET_RESOLVED -> EmailTemplate.builder()
                    .templateType(templateType)
                    .subjectTemplate("Your ticket has been resolved: {{ticketTitle}}")
                    .bodyTemplate("""
                            <h2>Hi {{recipientName}},</h2>
                            <p>Your ticket <strong>"{{ticketTitle}}"</strong> has been marked as resolved.</p>
                            <p>Please login to confirm the resolution and rate your experience.</p>
                            """)
                    .build();
            case SLA_BREACH -> EmailTemplate.builder()
                    .templateType(templateType)
                    .subjectTemplate("SLA Breach Alert: {{ticketTitle}}")
                    .bodyTemplate("""
                            <h2>SLA Breach Alert</h2>
                            <p>Hi {{recipientName}}, ticket <strong>"{{ticketTitle}}"</strong> has exceeded its SLA deadline.</p>
                            <p>Priority: <strong>{{priority}}</strong></p>
                            <p>Created: <strong>{{createdAt}}</strong></p>
                            <p>Please take immediate action.</p>
                            """)
                    .build();
        };
    }

    private EmailTemplateResponse toResponse(EmailTemplate template) {
        return EmailTemplateResponse.builder()
                .id(template.getId())
                .templateType(template.getTemplateType().name())
                .subjectTemplate(template.getSubjectTemplate())
                .bodyTemplate(template.getBodyTemplate())
                .createdAt(template.getCreatedAt())
                .updatedAt(template.getUpdatedAt())
                .build();
    }

    private String render(String template, Map<String, String> variables, boolean escapeValues) {
        String result = template;
        Map<String, String> safeVariables = new LinkedHashMap<>();
        if (variables != null) {
            variables.forEach((key, value) -> safeVariables.put(key, value == null ? "" : value));
        }
        for (Map.Entry<String, String> entry : safeVariables.entrySet()) {
            String value = escapeValues ? escapeHtml(entry.getValue()) : entry.getValue();
            result = result.replace("{{" + entry.getKey() + "}}", value);
        }
        return result;
    }

    private String escapeHtml(String value) {
        return value
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&#39;");
    }
}