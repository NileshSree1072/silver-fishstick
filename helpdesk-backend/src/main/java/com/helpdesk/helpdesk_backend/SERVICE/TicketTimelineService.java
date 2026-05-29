package com.helpdesk.helpdesk_backend.SERVICE;

import java.time.LocalDateTime;
import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.helpdesk.helpdesk_backend.ENTITY.SlaRule;
import com.helpdesk.helpdesk_backend.ENTITY.Ticket;
import com.helpdesk.helpdesk_backend.ENTITY.TicketTimeline;
import com.helpdesk.helpdesk_backend.ENTITY.User;
import com.helpdesk.helpdesk_backend.ENUM.TimelineEventType;
import com.helpdesk.helpdesk_backend.ENUM.TicketStatus;
import com.helpdesk.helpdesk_backend.REPOSITORY.SlaRuleRepository;
import com.helpdesk.helpdesk_backend.REPOSITORY.TicketTimelineRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class TicketTimelineService {

    private final TicketTimelineRepository timelineRepo;
    private final SlaRuleRepository slaRuleRepo;

    // ── RECORD METHODS ─────────────────────────────────────────────────────

    @Transactional
    public void recordCreated(Ticket ticket, User createdBy) {
        save(TicketTimeline.builder()
                .ticket(ticket)
                .actor(createdBy)
                .eventType(TimelineEventType.CREATED)
                .actorRole(createdBy.getRole().name())
                .note("Ticket created")
                .build());
    }

    @Transactional
    public void recordAssigned(Ticket ticket, User agent, boolean isLateAssigned) {
        save(TicketTimeline.builder()
                .ticket(ticket)
                .actor(agent)
                .eventType(TimelineEventType.ASSIGNED)
                .actorRole(agent.getRole().name())
                .note("Ticket assigned to " + agent.getName())
                .build());

        if (isLateAssigned) {
            save(TicketTimeline.builder()
                    .ticket(ticket)
                    .actor(agent)
                    .eventType(TimelineEventType.LATE_ASSIGNED)
                    .actorRole(agent.getRole().name())
                    .note("Assigned with less than 20% SLA window remaining")
                    .build());
        }
    }

    @Transactional
    public void recordFirstReply(Ticket ticket, User agent) {
        boolean alreadyExists = timelineRepo
                .findFirstByTicketAndEventTypeOrderByOccurredAtAsc(ticket, TimelineEventType.FIRST_REPLY)
                .isPresent();
        if (!alreadyExists) {
            save(TicketTimeline.builder()
                    .ticket(ticket)
                    .actor(agent)
                    .eventType(TimelineEventType.FIRST_REPLY)
                    .actorRole(agent.getRole().name())
                    .note("First agent reply sent")
                    .build());
        }
    }

    @Transactional
    public void recordReplySent(Ticket ticket, User sender) {
        save(TicketTimeline.builder()
                .ticket(ticket)
                .actor(sender)
                .eventType(TimelineEventType.REPLY_SENT)
                .actorRole(sender.getRole().name())
                .note("Reply sent by " + sender.getName())
                .build());
    }

    @Transactional
    public void recordTransferred(Ticket ticket, User fromAgent, User toAgent, String reason) {
        String targetName = toAgent != null ? toAgent.getName() : "Unassigned";
        String note = "Transferred to " + targetName + ". Reason: " + reason;
        save(TicketTimeline.builder()
                .ticket(ticket)
                .actor(fromAgent)
                .eventType(TimelineEventType.TRANSFERRED)
                .actorRole(fromAgent.getRole().name())
                .note(note)
                .build());
    }

    @Transactional
    public void recordStatusChanged(Ticket ticket, User changedBy, TicketStatus newStatus) {
        save(TicketTimeline.builder()
                .ticket(ticket)
                .actor(changedBy)
                .eventType(TimelineEventType.STATUS_CHANGED)
                .actorRole(changedBy.getRole().name())
                .note("Status changed to " + newStatus.name())
                .build());
    }

    @Transactional
    public void recordResolved(Ticket ticket, User resolvedBy) {
        save(TicketTimeline.builder()
                .ticket(ticket)
                .actor(resolvedBy)
                .eventType(TimelineEventType.RESOLVED)
                .actorRole(resolvedBy.getRole().name())
                .note("Ticket resolved by " + resolvedBy.getName())
                .build());
    }

    @Transactional
    public void recordBreach(Ticket ticket) {
        User assignedTo = ticket.getAssignedTo();
        String note = "SLA deadline exceeded for priority " + ticket.getPriority().name();
        save(TicketTimeline.builder()
                .ticket(ticket)
                .actor(assignedTo) // null if unassigned
                .eventType(TimelineEventType.BREACHED)
                .actorRole(assignedTo != null ? assignedTo.getRole().name() : null)
                .note(note)
                .build());
    }

    // ── LATE ASSIGNMENT HELPER ─────────────────────────────────────────────

    /**
     * Returns true when the ticket is being assigned with less than 20% of its
     * SLA resolution window remaining.
     */
    public boolean isLateAssigned(Ticket ticket) {
        Optional<SlaRule> ruleOpt = slaRuleRepo.findByPriority(ticket.getPriority());
        int resolutionHours = ruleOpt.map(SlaRule::getResolutionHours)
                .orElseGet(() -> defaultResolutionHours(ticket));

        long totalMinutes = resolutionHours * 60L;
        long elapsedMinutes = java.time.Duration.between(
                ticket.getCreatedAt(), LocalDateTime.now()).toMinutes();

        return elapsedMinutes > totalMinutes * 0.80;
    }

    // ── PRIVATE HELPERS ────────────────────────────────────────────────────

    private void save(TicketTimeline event) {
        try {
            timelineRepo.save(event);
        } catch (Exception ex) {
            log.warn("Failed to save timeline event {} for ticket {}: {}",
                    event.getEventType(), event.getTicket().getId(), ex.getMessage());
        }
    }

    private int defaultResolutionHours(Ticket ticket) {
        return switch (ticket.getPriority()) {
            case URGENT -> 4;
            case HIGH   -> 12;
            case MEDIUM -> 24;
            case LOW    -> 72;
        };
    }
}
