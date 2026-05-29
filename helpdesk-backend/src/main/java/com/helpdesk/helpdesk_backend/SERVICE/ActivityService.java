package com.helpdesk.helpdesk_backend.SERVICE;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedList;
import java.util.List;
import java.util.UUID;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import com.helpdesk.helpdesk_backend.DTO.RESPONSE.ActivityEvent;
import com.helpdesk.helpdesk_backend.DTO.RESPONSE.ActivityEvent.EventType;
import com.helpdesk.helpdesk_backend.ENTITY.Ticket;
import com.helpdesk.helpdesk_backend.ENTITY.User;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class ActivityService {

    private final SimpMessagingTemplate messagingTemplate;

    // Bounded thread-safe in-memory list (max 100 items, newest first)
    private final List<ActivityEvent> eventList = Collections.synchronizedList(new LinkedList<>());

    /**
     * Publishes an event to the websocket topic and registers it in memory.
     */
    public void publish(ActivityEvent event) {
        synchronized (eventList) {
            eventList.add(0, event);
            if (eventList.size() > 100) {
                eventList.remove(eventList.size() - 1);
            }
        }

        // Logging based on warning level
        if ("ERROR".equalsIgnoreCase(event.getLevel())) {
            log.error("[SYSTEM EVENT] {} - {}", event.getMessage(), event.getDetail());
        } else if ("WARN".equalsIgnoreCase(event.getLevel())) {
            log.warn("[SYSTEM EVENT] {} - {}", event.getMessage(), event.getDetail());
        } else {
            log.info("[SYSTEM EVENT] {} - {}", event.getMessage(), event.getDetail());
        }

        // Send over WebSocket broker
        messagingTemplate.convertAndSend("/topic/admin/activity", event);
    }

    /**
     * Returns the recent 100 activity events.
     */
    public List<ActivityEvent> getRecentActivities() {
        synchronized (eventList) {
            return new ArrayList<>(eventList);
        }
    }

    // ── CONVENIENCE PUBLISHERS ──────────────────────────────────────

    public void ticketCreated(Ticket ticket) {
        ActivityEvent event = ActivityEvent.builder()
                .type(EventType.TICKET_CREATED)
                .message("Ticket created by " + (ticket.getCreatedBy() != null ? ticket.getCreatedBy().getName() : "Unknown"))
                .detail("Priority: " + ticket.getPriority() + " · Category: " + (ticket.getCategory() != null ? ticket.getCategory().getName() : "General"))
                .ticketId(ticket.getId())
                .ticketTitle(ticket.getTitle())
                .timestamp(LocalDateTime.now())
                .level("INFO")
                .build();
        publish(event);
    }

    public void ticketAssigned(Ticket ticket, User agent) {
        ActivityEvent event = ActivityEvent.builder()
                .type(EventType.TICKET_ASSIGNED)
                .message("Ticket assigned to " + (agent != null ? agent.getName() : "Unassigned"))
                .detail("Category: " + (ticket.getCategory() != null ? ticket.getCategory().getName() : "General") + " · Priority: " + ticket.getPriority())
                .ticketId(ticket.getId())
                .ticketTitle(ticket.getTitle())
                .timestamp(LocalDateTime.now())
                .level("INFO")
                .build();
        publish(event);
    }

    public void ticketResolved(Ticket ticket, String resolvedBy) {
        LocalDateTime start = ticket.getCreatedAt();
        LocalDateTime end = ticket.getResolvedAt() != null ? ticket.getResolvedAt() : LocalDateTime.now();
        Duration duration = Duration.between(start, end);
        long hours = duration.toHours();
        long minutes = duration.toMinutes() % 60;

        ActivityEvent event = ActivityEvent.builder()
                .type(EventType.TICKET_RESOLVED)
                .message("Ticket resolved by " + resolvedBy)
                .detail(String.format("Resolution time: %dh %dm", hours, minutes))
                .ticketId(ticket.getId())
                .ticketTitle(ticket.getTitle())
                .timestamp(LocalDateTime.now())
                .level("INFO")
                .build();
        publish(event);
    }

    public void aiResolved(Ticket ticket, double similarityScore) {
        ActivityEvent event = ActivityEvent.builder()
                .type(EventType.AI_RESOLVED)
                .message("AI auto-resolved ticket instantly")
                .detail(String.format("Similarity: %.0f%% · No agent needed", similarityScore * 100))
                .ticketId(ticket.getId())
                .ticketTitle(ticket.getTitle())
                .timestamp(LocalDateTime.now())
                .level("INFO")
                .build();
        publish(event);
    }

    public void aiFailed(Ticket ticket, String reason) {
        ActivityEvent event = ActivityEvent.builder()
                .type(EventType.AI_FAILED)
                .message("AI could not auto-resolve — routed to agent")
                .detail("Reason: " + reason)
                .ticketId(ticket.getId())
                .ticketTitle(ticket.getTitle())
                .timestamp(LocalDateTime.now())
                .level("WARN")
                .build();
        publish(event);
    }

    public void slaWarning(Ticket ticket, long hoursRemaining) {
        ActivityEvent event = ActivityEvent.builder()
                .type(EventType.SLA_WARNING)
                .message("SLA deadline approaching for ticket")
                .detail(hoursRemaining + "h remaining · Priority: " + ticket.getPriority())
                .ticketId(ticket.getId())
                .ticketTitle(ticket.getTitle())
                .timestamp(LocalDateTime.now())
                .level("WARN")
                .build();
        publish(event);
    }

    public void slaBreach(Ticket ticket) {
        ActivityEvent event = ActivityEvent.builder()
                .type(EventType.SLA_BREACH)
                .message("SLA BREACHED — immediate action required")
                .detail("Priority: " + ticket.getPriority() + " · Agent: " + (ticket.getAssignedTo() != null ? ticket.getAssignedTo().getName() : "Unassigned"))
                .ticketId(ticket.getId())
                .ticketTitle(ticket.getTitle())
                .timestamp(LocalDateTime.now())
                .level("ERROR")
                .build();
        publish(event);
    }

    public void agentReplied(Ticket ticket, User agent) {
        ActivityEvent event = ActivityEvent.builder()
                .type(EventType.AGENT_REPLIED)
                .message("Agent replied to ticket")
                .detail("Agent: " + (agent != null ? agent.getName() : "Unknown"))
                .ticketId(ticket.getId())
                .ticketTitle(ticket.getTitle())
                .timestamp(LocalDateTime.now())
                .level("INFO")
                .build();
        publish(event);
    }

    public void embeddingComputed(UUID ticketId, long durationMs, int dims) {
        ActivityEvent event = ActivityEvent.builder()
                .type(EventType.EMBEDDING_COMPUTED)
                .message("Vector embedding computed")
                .detail("Duration: " + durationMs + "ms · Dims: " + dims)
                .ticketId(ticketId)
                .timestamp(LocalDateTime.now())
                .level("INFO")
                .build();
        publish(event);
    }

    public void systemError(String context, String errorMessage) {
        String truncatedMsg = errorMessage != null ? errorMessage.substring(0, Math.min(errorMessage.length(), 100)) : "";
        ActivityEvent event = ActivityEvent.builder()
                .type(EventType.SYSTEM_ERROR)
                .message("System error in " + context)
                .detail(truncatedMsg)
                .timestamp(LocalDateTime.now())
                .level("ERROR")
                .build();
        publish(event);
    }
}
