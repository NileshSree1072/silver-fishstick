package com.helpdesk.helpdesk_backend.SERVICE;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import com.helpdesk.helpdesk_backend.DTO.RESPONSE.AgentMetricsResponse;
import com.helpdesk.helpdesk_backend.DTO.RESPONSE.UserMetricsResponse;
import com.helpdesk.helpdesk_backend.ENTITY.Rating;
import com.helpdesk.helpdesk_backend.ENTITY.Ticket;
import com.helpdesk.helpdesk_backend.ENTITY.TicketTimeline;
import com.helpdesk.helpdesk_backend.ENTITY.User;
import com.helpdesk.helpdesk_backend.ENUM.Role;
import com.helpdesk.helpdesk_backend.ENUM.TicketStatus;
import com.helpdesk.helpdesk_backend.ENUM.TimelineEventType;
import com.helpdesk.helpdesk_backend.EXCEPTION.NotFoundException;
import com.helpdesk.helpdesk_backend.REPOSITORY.RatingRepository;
import com.helpdesk.helpdesk_backend.REPOSITORY.TicketRepository;
import com.helpdesk.helpdesk_backend.REPOSITORY.TicketTimelineRepository;
import com.helpdesk.helpdesk_backend.REPOSITORY.UserRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class FairPerformanceService {

    private final TicketTimelineRepository timelineRepo;
    private final TicketRepository ticketRepo;
    private final UserRepository userRepo;
    private final RatingRepository ratingRepo;
    private final SLAService slaService;

    // ── AGENT METRICS ──────────────────────────────────────────────────────

    public AgentMetricsResponse getAgentMetrics(UUID agentId,
                                                LocalDateTime from,
                                                LocalDateTime to) {
        User agent = userRepo.findById(agentId)
                .orElseThrow(() -> new NotFoundException("Agent", agentId));

        // All timeline entries for this agent in the window
        List<TicketTimeline> agentEntries =
                timelineRepo.findByActorAndOccurredAtBetween(agent, from, to);

        // Grouped by event type
        Map<TimelineEventType, List<TicketTimeline>> byType = agentEntries.stream()
                .collect(Collectors.groupingBy(TicketTimeline::getEventType));

        List<TicketTimeline> assignedEvents = byType.getOrDefault(TimelineEventType.ASSIGNED, List.of());
        List<TicketTimeline> resolvedEvents = byType.getOrDefault(TimelineEventType.RESOLVED, List.of());
        List<TicketTimeline> transferredEvents = byType.getOrDefault(TimelineEventType.TRANSFERRED, List.of());
        List<TicketTimeline> lateAssignedEvents = byType.getOrDefault(TimelineEventType.LATE_ASSIGNED, List.of());

        int totalAssigned       = assignedEvents.size();
        int totalResolved       = resolvedEvents.size();
        int totalTransferredOut = transferredEvents.size();
        int lateAssignedCount   = lateAssignedEvents.size();
        int slaEligibleCount    = Math.max(0, totalAssigned - lateAssignedCount);

        // Collect ticket IDs that were late-assigned (excluded from SLA calc)
        java.util.Set<UUID> lateAssignedTicketIds = lateAssignedEvents.stream()
                .map(e -> e.getTicket().getId())
                .collect(Collectors.toSet());

        // SLA compliance: count eligible tickets resolved before their deadline
        int slaCompliantCount = 0;
        for (TicketTimeline assigned : assignedEvents) {
            Ticket ticket = assigned.getTicket();
            if (lateAssignedTicketIds.contains(ticket.getId())) continue;

            // ticket must be resolved
            if (ticket.getResolvedAt() == null) continue;

            Map<String, Object> slaStatus = slaService.getTicketSLAStatus(ticket);
            LocalDateTime deadline = (LocalDateTime) slaStatus.get("deadline");
            if (ticket.getResolvedAt().isBefore(deadline)) {
                slaCompliantCount++;
            }
        }

        // Avg first response time: minutes between ASSIGNED and FIRST_REPLY for each ticket
        List<TicketTimeline> firstReplyEvents = byType.getOrDefault(TimelineEventType.FIRST_REPLY, List.of());
        double avgFirstResponseMinutes = 0.0;
        if (!firstReplyEvents.isEmpty()) {
            List<Double> frts = new ArrayList<>();
            for (TicketTimeline firstReply : firstReplyEvents) {
                Ticket ticket = firstReply.getTicket();
                // Find the ASSIGNED event for this same ticket by this agent
                timelineRepo.findByTicketAndEventTypeOrderByOccurredAtAsc(ticket, TimelineEventType.ASSIGNED)
                        .stream()
                        .filter(e -> e.getActor() != null && e.getActor().getId().equals(agentId))
                        .findFirst()
                        .ifPresent(assignedEvt -> {
                            long mins = Duration.between(
                                    assignedEvt.getOccurredAt(), firstReply.getOccurredAt()).toMinutes();
                            if (mins >= 0) frts.add((double) mins);
                        });
            }
            if (!frts.isEmpty()) {
                avgFirstResponseMinutes = frts.stream().mapToDouble(d -> d).average().orElse(0.0);
            }
        }

        // Avg handle time: minutes between ASSIGNED and RESOLVED for each ticket
        double avgHandleTimeMinutes = 0.0;
        if (!resolvedEvents.isEmpty()) {
            List<Double> handleTimes = new ArrayList<>();
            for (TicketTimeline resolved : resolvedEvents) {
                Ticket ticket = resolved.getTicket();
                timelineRepo.findByTicketAndEventTypeOrderByOccurredAtAsc(ticket, TimelineEventType.ASSIGNED)
                        .stream()
                        .filter(e -> e.getActor() != null && e.getActor().getId().equals(agentId))
                        .findFirst()
                        .ifPresent(assignedEvt -> {
                            long mins = Duration.between(
                                    assignedEvt.getOccurredAt(), resolved.getOccurredAt()).toMinutes();
                            if (mins >= 0) handleTimes.add((double) mins);
                        });
            }
            if (!handleTimes.isEmpty()) {
                avgHandleTimeMinutes = handleTimes.stream().mapToDouble(d -> d).average().orElse(0.0);
            }
        }

        // Avg satisfaction
        Double avgSatisfaction = ratingRepo.findAverageScoreByAgent(agent);
        double avgSatisfactionScore = avgSatisfaction != null ? avgSatisfaction : 0.0;

        // Derived rates
        double slaComplianceRate = slaEligibleCount > 0
                ? (double) slaCompliantCount / slaEligibleCount * 100.0 : 0.0;
        double resolutionRate = totalAssigned > 0
                ? (double) totalResolved / totalAssigned * 100.0 : 0.0;
        double transferRate = totalAssigned > 0
                ? (double) totalTransferredOut / totalAssigned * 100.0 : 0.0;

        String categoryName = agent.getCategory() != null ? agent.getCategory().getName() : null;

        return AgentMetricsResponse.builder()
                .agentId(agentId)
                .agentName(agent.getName())
                .agentCategory(categoryName)
                .periodStart(from)
                .periodEnd(to)
                .totalAssigned(totalAssigned)
                .totalResolved(totalResolved)
                .totalTransferredOut(totalTransferredOut)
                .lateAssignedCount(lateAssignedCount)
                .slaEligibleCount(slaEligibleCount)
                .slaCompliantCount(slaCompliantCount)
                .slaComplianceRate(slaComplianceRate)
                .avgFirstResponseMinutes(avgFirstResponseMinutes)
                .avgHandleTimeMinutes(avgHandleTimeMinutes)
                .avgSatisfactionScore(avgSatisfactionScore)
                .resolutionRate(resolutionRate)
                .transferRate(transferRate)
                .build();
    }

    public List<AgentMetricsResponse> getAllAgentMetrics(LocalDateTime from, LocalDateTime to) {
        List<User> agents = userRepo.findByRoleAndIsActiveTrue(Role.AGENT);
        return agents.stream()
                .map(a -> getAgentMetrics(a.getId(), from, to))
                .collect(Collectors.toList());
    }

    // ── USER METRICS ───────────────────────────────────────────────────────

    public UserMetricsResponse getUserMetrics(UUID userId,
                                              LocalDateTime from,
                                              LocalDateTime to) {
        User user = userRepo.findById(userId)
                .orElseThrow(() -> new NotFoundException("User", userId));

        // Tickets submitted in date range
        List<Ticket> userTickets = ticketRepo.findByCreatedByAndCreatedAtBetween(user, from, to);
        int totalTicketsSubmitted = userTickets.size();

        // Avg response time: minutes between an agent reply and the next user reply
        double avgResponseTimeMinutes = calculateAvgUserResponseTime(user, userTickets);

        // Repeat issues: tickets in same category within 30 days of a previous one
        int repeatIssueCount = calculateRepeatIssueCount(userTickets);

        // Avg satisfaction given
        List<Rating> ratings = ratingRepo.findByUser(user);
        double avgSatisfactionGiven = ratings.isEmpty() ? 0.0 :
                ratings.stream().mapToInt(Rating::getScore).average().orElse(0.0);

        // Auto-closed: CLOSED status with no rating
        long autoClosedCount = userTickets.stream()
                .filter(t -> t.getStatus() == TicketStatus.CLOSED)
                .filter(t -> !ratingRepo.existsByTicket(t))
                .count();

        // Ticket quality score (0-5 heuristic)
        double ticketQualityScore = calculateTicketQualityScore(userTickets);

        return UserMetricsResponse.builder()
                .userId(userId)
                .userName(user.getName())
                .periodStart(from)
                .periodEnd(to)
                .totalTicketsSubmitted(totalTicketsSubmitted)
                .avgResponseTimeMinutes(avgResponseTimeMinutes)
                .repeatIssueCount(repeatIssueCount)
                .avgSatisfactionGiven(avgSatisfactionGiven)
                .autoClosedCount((int) autoClosedCount)
                .ticketQualityScore(ticketQualityScore)
                .build();
    }

    public Page<UserMetricsResponse> getAllUserMetrics(LocalDateTime from, LocalDateTime to,
                                                       int page, int size) {
        org.springframework.data.domain.Pageable pageable = PageRequest.of(page, size);
        org.springframework.data.domain.Page<User> usersPage =
                userRepo.findByRoleAndIsActiveTrue(Role.USER, pageable);

        List<UserMetricsResponse> content = usersPage.getContent().stream()
                .map(u -> getUserMetrics(u.getId(), from, to))
                .collect(Collectors.toList());

        return new PageImpl<>(content, pageable, usersPage.getTotalElements());
    }

    // ── PRIVATE HELPERS ────────────────────────────────────────────────────

    private double calculateAvgUserResponseTime(User user, List<Ticket> tickets) {
        List<Double> responseTimes = new ArrayList<>();

        for (Ticket ticket : tickets) {
            List<TicketTimeline> entries =
                    timelineRepo.findByTicketIdOrderByOccurredAtAsc(ticket.getId());

            // Find pairs: agent REPLY_SENT → next user REPLY_SENT
            for (int i = 0; i < entries.size() - 1; i++) {
                TicketTimeline current = entries.get(i);
                if (current.getEventType() != TimelineEventType.REPLY_SENT) continue;
                if (current.getActor() == null) continue;
                // Agent sent a reply
                if (current.getActor().getRole() != Role.AGENT) continue;

                // Find next user reply
                for (int j = i + 1; j < entries.size(); j++) {
                    TicketTimeline next = entries.get(j);
                    if (next.getEventType() != TimelineEventType.REPLY_SENT) continue;
                    if (next.getActor() == null) continue;
                    if (next.getActor().getId().equals(user.getId())) {
                        long mins = Duration.between(
                                current.getOccurredAt(), next.getOccurredAt()).toMinutes();
                        if (mins >= 0) responseTimes.add((double) mins);
                        break;
                    }
                }
            }
        }
        return responseTimes.isEmpty() ? 0.0 :
                responseTimes.stream().mapToDouble(d -> d).average().orElse(0.0);
    }

    private int calculateRepeatIssueCount(List<Ticket> tickets) {
        int count = 0;
        for (int i = 0; i < tickets.size(); i++) {
            Ticket t = tickets.get(i);
            if (t.getCategory() == null) continue;
            for (int j = 0; j < i; j++) {
                Ticket prev = tickets.get(j);
                if (prev.getCategory() == null) continue;
                if (!t.getCategory().getId().equals(prev.getCategory().getId())) continue;
                long daysBetween = Duration.between(
                        prev.getCreatedAt(), t.getCreatedAt()).toDays();
                if (daysBetween <= 30) {
                    count++;
                    break;
                }
            }
        }
        return count;
    }

    private double calculateTicketQualityScore(List<Ticket> tickets) {
        if (tickets.isEmpty()) return 0.0;
        List<Double> scores = new ArrayList<>();
        for (Ticket ticket : tickets) {
            double score = 0.0;
            // Has description > 100 chars
            if (ticket.getDescription() != null && ticket.getDescription().length() > 100) score += 1;
            // Category was set
            if (ticket.getCategory() != null) score += 1;
            // Priority not changed (check timeline: no STATUS_CHANGED involving priority)
            // Simple proxy: if ticket has timeline events only for CREATED/ASSIGNED/RESOLVED → good
            List<TicketTimeline> timelineEntries =
                    timelineRepo.findByTicketIdOrderByOccurredAtAsc(ticket.getId());
            boolean categoryChanged = timelineEntries.stream()
                    .anyMatch(e -> e.getNote() != null && e.getNote().contains("Category"));
            boolean priorityChanged = timelineEntries.stream()
                    .anyMatch(e -> e.getNote() != null && e.getNote().contains("priority"));
            if (!categoryChanged) score += 1;
            if (!priorityChanged) score += 1;
            // First reply resolved it (quick resolution)
            long replyCount = timelineEntries.stream()
                    .filter(e -> e.getEventType() == TimelineEventType.REPLY_SENT).count();
            if (replyCount <= 2) score += 1;
            scores.add(score);
        }
        return scores.stream().mapToDouble(d -> d).average().orElse(0.0);
    }
}
