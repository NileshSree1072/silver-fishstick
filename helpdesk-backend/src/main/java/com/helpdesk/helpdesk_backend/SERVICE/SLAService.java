package com.helpdesk.helpdesk_backend.SERVICE;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.helpdesk.helpdesk_backend.DTO.REQUEST.UpdateSlaRequest;
import com.helpdesk.helpdesk_backend.ENTITY.SlaRule;
import com.helpdesk.helpdesk_backend.ENTITY.Ticket;
import com.helpdesk.helpdesk_backend.ENTITY.User;
import com.helpdesk.helpdesk_backend.ENUM.NotificationType;
import com.helpdesk.helpdesk_backend.ENUM.Priority;
import com.helpdesk.helpdesk_backend.ENUM.Role;
import com.helpdesk.helpdesk_backend.ENUM.TicketStatus;
import com.helpdesk.helpdesk_backend.EXCEPTION.NotFoundException;
import com.helpdesk.helpdesk_backend.REPOSITORY.NotificationRepository;
import com.helpdesk.helpdesk_backend.REPOSITORY.SlaRuleRepository;
import com.helpdesk.helpdesk_backend.REPOSITORY.TicketRepository;
import com.helpdesk.helpdesk_backend.REPOSITORY.UserRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import com.helpdesk.helpdesk_backend.SERVICE.ActivityService;
import com.helpdesk.helpdesk_backend.SERVICE.TicketTimelineService;

@Service
@RequiredArgsConstructor
@Slf4j
public class SLAService {

    private final TicketRepository ticketRepo;
    private final UserRepository userRepo;
    private final SlaRuleRepository slaRuleRepo;
    private final NotificationService notificationService;
    private final NotificationRepository notificationRepo;
    private final ActivityService activityService;
    private final TicketTimelineService timelineService;

    /**
     * Periodically check open/in-progress tickets for SLA breaches.
     * Runs every 15 minutes.
     */
    @Scheduled(fixedRate = 900000)
    @Transactional
    public void checkSLABreaches() {
        log.info("Checking SLA breaches for unresolved tickets...");
        List<Ticket> activeTickets = ticketRepo.findByStatusIn(List.of(TicketStatus.OPEN, TicketStatus.IN_PROGRESS));
        List<User> admins = userRepo.findByRoleAndIsActiveTrue(Role.ADMIN);

        if (admins.isEmpty()) {
            log.warn("No active administrators configured to receive SLA breach alerts.");
            return;
        }

        Map<Priority, Integer> breachCounts = new HashMap<>();
        for (Priority p : Priority.values()) {
            breachCounts.put(p, 0);
        }

        int totalBreachesNotified = 0;
        LocalDateTime now = LocalDateTime.now();

        for (Ticket ticket : activeTickets) {
            SlaRule rule = slaRuleRepo.findByPriority(ticket.getPriority())
                    .orElseGet(() -> getDefaultRule(ticket.getPriority()));

            LocalDateTime deadline = ticket.getCreatedAt().plusHours(rule.getResolutionHours());

            if (deadline.isBefore(now)) {
                // Count breach
                breachCounts.put(ticket.getPriority(), breachCounts.get(ticket.getPriority()) + 1);

                // Notify admin only once
                boolean alreadyNotified = notificationRepo.existsByTicketIdAndType(ticket.getId(), NotificationType.SLA_BREACH);
                if (!alreadyNotified) {
                    notificationService.notifyAdminSLABreach(ticket, admins);
                    totalBreachesNotified++;
                    activityService.slaBreach(ticket);
                    timelineService.recordBreach(ticket);
                }
            } else {
                long hoursRemaining = java.time.Duration.between(now, deadline).toHours();
                if (hoursRemaining <= 2) {
                    activityService.slaWarning(ticket, hoursRemaining);
                }
            }
        }

        log.info("SLA check completed. New breaches notified: {}. Total active breaches by priority: LOW={}, MEDIUM={}, HIGH={}, URGENT={}",
                totalBreachesNotified,
                breachCounts.get(Priority.LOW),
                breachCounts.get(Priority.MEDIUM),
                breachCounts.get(Priority.HIGH),
                breachCounts.get(Priority.URGENT)
        );
    }

    /**
     * Calculates the SLA status and deadline details for a single ticket.
     */
    public Map<String, Object> getTicketSLAStatus(Ticket ticket) {
        SlaRule rule = slaRuleRepo.findByPriority(ticket.getPriority())
                .orElseGet(() -> getDefaultRule(ticket.getPriority()));

        int resolutionHours = rule.getResolutionHours();
        LocalDateTime deadline = ticket.getCreatedAt().plusHours(resolutionHours);
        
        String status;
        long hoursRemaining;

        if (ticket.getStatus() == TicketStatus.RESOLVED || ticket.getStatus() == TicketStatus.CLOSED) {
            // Ticket is resolved/closed, check historical breach
            LocalDateTime completionTime = ticket.getResolvedAt() != null ? ticket.getResolvedAt() : ticket.getUpdatedAt();
            if (completionTime.isAfter(deadline)) {
                status = "BREACHED";
            } else {
                status = "OK";
            }
            hoursRemaining = 0;
        } else {
            LocalDateTime now = LocalDateTime.now();
            if (now.isAfter(deadline)) {
                status = "BREACHED";
                hoursRemaining = 0;
            } else {
                hoursRemaining = java.time.Duration.between(now, deadline).toHours();
                if (hoursRemaining < 0) hoursRemaining = 0;
                status = (hoursRemaining <= 2) ? "WARNING" : "OK";
            }
        }

        Map<String, Object> result = new HashMap<>();
        result.put("status", status);
        result.put("deadline", deadline);
        result.put("hoursRemaining", hoursRemaining);
        result.put("resolutionHours", resolutionHours);
        result.put("resolutionSLA", resolutionHours);
        return result;
    }

    /**
     * Retrieve all configured SLA rules.
     */
    public List<SlaRule> getAllRules() {
        return slaRuleRepo.findAllByOrderByPriorityAsc();
    }

    /**
     * Update an SLA rule's hours.
     */
    @Transactional
    public SlaRule updateRule(UpdateSlaRequest req) {
        SlaRule rule = slaRuleRepo.findByPriority(req.getPriority())
                .orElseThrow(() -> new NotFoundException("SLA rule not found for priority: " + req.getPriority()));

        rule.setResponseHours(req.getResponseHours());
        rule.setResolutionHours(req.getResolutionHours());
        return slaRuleRepo.save(rule);
    }

    /**
     * Fallback helper to provide default rules if database is unseeded.
     */
    private SlaRule getDefaultRule(Priority priority) {
        int resHours = switch (priority) {
            case URGENT -> 4;
            case HIGH -> 12;
            case MEDIUM -> 24;
            case LOW -> 72;
        };
        int respHours = switch (priority) {
            case URGENT -> 1;
            case HIGH -> 2;
            case MEDIUM -> 4;
            case LOW -> 8;
        };
        return SlaRule.builder()
                .priority(priority)
                .responseHours(respHours)
                .resolutionHours(resHours)
                .build();
    }
}
