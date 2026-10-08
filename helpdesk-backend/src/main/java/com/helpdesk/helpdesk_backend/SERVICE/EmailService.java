package com.helpdesk.helpdesk_backend.SERVICE;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import com.helpdesk.helpdesk_backend.ENUM.EmailTemplateType;
import com.helpdesk.helpdesk_backend.ENTITY.Ticket;
import com.helpdesk.helpdesk_backend.ENTITY.User;

import jakarta.mail.internet.MimeMessage;

import java.util.HashMap;
import java.util.Map;

import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
public class EmailService {

    private final JavaMailSender mailSender;
    private final String      senderAddress;
    private final EmailTemplateService emailTemplateService;

    public EmailService(
            JavaMailSender mailSender,
            @Value("${spring.mail.username}") String sender,
            EmailTemplateService emailTemplateService) {
        this.mailSender   = mailSender;
        this.senderAddress = sender;
        this.emailTemplateService = emailTemplateService;
    }

    // ── PUBLIC METHODS ───────────────────────────────────────────

    public void sendTicketCreated(User user, Ticket ticket) {
        sendRendered(EmailTemplateType.TICKET_CREATED, user.getEmail(), templateTokens(user, ticket));
    }

    public void sendAgentReplied(User user, Ticket ticket) {
        sendRendered(EmailTemplateType.AGENT_REPLIED, user.getEmail(), templateTokens(user, ticket));
    }

    public void sendTicketResolved(User user, Ticket ticket) {
        sendRendered(EmailTemplateType.TICKET_RESOLVED, user.getEmail(), templateTokens(user, ticket));
    }

    public void sendSLABreach(User admin, Ticket ticket) {
        sendRendered(EmailTemplateType.SLA_BREACH, admin.getEmail(), templateTokens(admin, ticket));
    }

    // ── PRIVATE HELPERS ──────────────────────────────────────────

    private void sendRendered(EmailTemplateType templateType, String to, Map<String, String> tokens) {
        String subject = emailTemplateService.renderSubject(templateType, tokens);
        String htmlBody = emailTemplateService.renderBody(templateType, tokens);
        send(to, subject, htmlBody);
    }

    private void send(String to, String subject, String htmlBody) {
        try {
            log.info("Sending email to {} with subject={}", to, subject);
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(senderAddress);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(htmlBody, true);
            mailSender.send(message);
            log.info("Email send completed successfully to {}", to);
        } catch (Exception e) {
            log.error("Email failed to send to {} (subject={})", to, subject, e);
        }
    }

    private Map<String, String> templateTokens(User user, Ticket ticket) {
        Map<String, String> tokens = new HashMap<>();
        tokens.put("userName", safe(user.getName()));
        tokens.put("recipientName", safe(user.getName()));
        tokens.put("userEmail", safe(user.getEmail()));
        tokens.put("ticketId", ticket != null && ticket.getId() != null ? ticket.getId().toString() : "");
        tokens.put("ticketTitle", ticket != null && ticket.getTitle() != null ? ticket.getTitle() : "");
        tokens.put("priority", ticket != null && ticket.getPriority() != null ? ticket.getPriority().name() : "");
        tokens.put("createdAt", ticket != null && ticket.getCreatedAt() != null ? ticket.getCreatedAt().toString() : "");
        return tokens;
    }

    private String safe(String value) {
        return value == null ? "" : value;
    }
}
