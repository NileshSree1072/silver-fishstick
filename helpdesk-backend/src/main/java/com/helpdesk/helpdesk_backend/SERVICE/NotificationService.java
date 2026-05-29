package com.helpdesk.helpdesk_backend.SERVICE;

import java.util.List;
import java.util.UUID;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import com.helpdesk.helpdesk_backend.DTO.RESPONSE.NotificationResponse;
import com.helpdesk.helpdesk_backend.ENTITY.Notification;
import com.helpdesk.helpdesk_backend.ENTITY.Reply;
import com.helpdesk.helpdesk_backend.ENTITY.Ticket;
import com.helpdesk.helpdesk_backend.ENTITY.User;
import com.helpdesk.helpdesk_backend.ENUM.NotificationType;
import com.helpdesk.helpdesk_backend.REPOSITORY.NotificationRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepo;
    private final SimpMessagingTemplate messagingTemplate; // WebSocket sender
    private final EmailService emailService; // For important notifications

    // ── INTERNAL: create + push ──────────────────────

    private NotificationResponse createAndPush(User recipient,
            Ticket ticket,
            NotificationType type,
            String message) {
        // 1. Save to DB so it persists across sessions
        Notification notification = Notification.builder()
                .user(recipient)
                .ticket(ticket)
                .type(type)
                .message(message)
                .build();

        notificationRepo.save(notification);

        // 2. Push real-time via WebSocket to the user's personal topic
        NotificationResponse response = toResponse(notification);
        messagingTemplate.convertAndSend(
                "/topic/notifications/" + recipient.getId(),
                response);
        // Send email for important events
        switch (type) {
            case AGENT_REPLIED -> emailService.sendAgentReplied(recipient, ticket);
            case TICKET_RESOLVED -> emailService.sendTicketResolved(recipient, ticket);
            case SLA_BREACH -> emailService.sendSLABreach(recipient, ticket);
            default -> {} // no email for minor events
        }

        return response;
    }

    // ── PUBLIC METHODS called by TicketService and ReplyService ──

    // New ticket assigned → notify agent
    public void notifyAgentNewTicket(Ticket ticket) {
        if (ticket.getAssignedTo() == null)
            return;
        createAndPush(
                ticket.getAssignedTo(),
                ticket,
                NotificationType.NEW_TICKET,
                "New ticket assigned: " + ticket.getTitle());
    }

    // Agent replied publicly → notify user
    public void notifyUserAgentReplied(Ticket ticket, Reply reply) {
        createAndPush(
                ticket.getCreatedBy(),
                ticket,
                NotificationType.AGENT_REPLIED,
                "Agent replied to your ticket: " + ticket.getTitle());
    }

    // User replied → notify assigned agent
    public void notifyAgentUserReplied(Ticket ticket, Reply reply) {
        if (ticket.getAssignedTo() == null)
            return;
        createAndPush(
                ticket.getAssignedTo(),
                ticket,
                NotificationType.USER_REPLIED,
                "User replied on ticket: " + ticket.getTitle());
    }

    // Ticket resolved → notify user
    public void notifyUserTicketResolved(Ticket ticket) {
        createAndPush(
                ticket.getCreatedBy(),
                ticket,
                NotificationType.TICKET_RESOLVED,
                "Your ticket has been resolved: " + ticket.getTitle());
    }

    // Ticket reassigned → notify new agent
    public void notifyAgentTicketAssigned(Ticket ticket) {
        if (ticket.getAssignedTo() == null)
            return;
        createAndPush(
                ticket.getAssignedTo(),
                ticket,
                NotificationType.TICKET_ASSIGNED,
                "A ticket has been assigned to you: " + ticket.getTitle());
    }

    // SLA breach → notify admin(s)
    public void notifyAdminSLABreach(Ticket ticket, List<User> admins) {
        String msg = "SLA breached on ticket: " + ticket.getTitle();
        admins.forEach(admin -> createAndPush(admin, ticket, NotificationType.SLA_BREACH, msg));
    }

    public void notifyAgentDuplicateResolved(Ticket ticket, Ticket parentTicket, User resolver) {
        if (ticket.getAssignedTo() == null)
            return;
        createAndPush(
                ticket.getAssignedTo(),
                ticket,
                NotificationType.TICKET_ASSIGNED,
                String.format("Linked case '%s' was resolved by Agent %s. Please review your duplicate ticket '%s'.", 
                        parentTicket.getTitle(), resolver.getName(), ticket.getTitle())
        );
    }

    // ── FETCH & MARK READ ────────────────────────────

    public List<NotificationResponse> getMyNotifications(User user) {
        return notificationRepo
                .findByUserOrderByCreatedAtDesc(user)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public long getUnreadCount(User user) {
        return notificationRepo.countByUserAndIsReadFalse(user);
    }

    public void markOneRead(UUID notificationId) {
        notificationRepo.markOneRead(notificationId);
    }

    public void markAllRead(User user) {
        notificationRepo.markAllRead(user);
    }

    // ── MAPPER ───────────────────────────────────────

    private NotificationResponse toResponse(Notification n) {
        return NotificationResponse.builder()
                .id(n.getId())
                .ticketId(n.getTicket() != null ? n.getTicket().getId() : null)
                .ticketTitle(n.getTicket() != null ? n.getTicket().getTitle() : null)
                .type(n.getType())
                .message(n.getMessage())
                .isRead(n.isRead())
                .createdAt(n.getCreatedAt())
                .build();
    }
}