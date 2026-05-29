package com.helpdesk.helpdesk_backend.SERVICE;

import java.util.*;

import org.springframework.stereotype.Service;

import com.helpdesk.helpdesk_backend.DTO.REQUEST.*;
import com.helpdesk.helpdesk_backend.DTO.RESPONSE.*;
import com.helpdesk.helpdesk_backend.ENTITY.Rating;
import com.helpdesk.helpdesk_backend.ENTITY.Ticket;
import com.helpdesk.helpdesk_backend.ENTITY.User;
import com.helpdesk.helpdesk_backend.ENUM.TicketStatus;
import com.helpdesk.helpdesk_backend.EXCEPTION.BadRequestException;
import com.helpdesk.helpdesk_backend.EXCEPTION.ConflictException;
import com.helpdesk.helpdesk_backend.EXCEPTION.NotFoundException;
import com.helpdesk.helpdesk_backend.EXCEPTION.UnauthorizedException;
import com.helpdesk.helpdesk_backend.REPOSITORY.*;

import lombok.*;

@Service
@RequiredArgsConstructor
public class RatingService {

    private final RatingRepository  ratingRepo;
    private final TicketRepository  ticketRepo;

    // ── USER: submit a rating ────────────────────────────────────

    public RatingResponse submitRating(UUID ticketId,
                                        CreateRatingRequest req,
                                        User currentUser) {

        Ticket ticket = ticketRepo.findById(ticketId)
                .orElseThrow(() -> new NotFoundException("Ticket", ticketId));

        // Only the ticket owner can rate it
        if (!ticket.getCreatedBy().getId().equals(currentUser.getId()))
                        throw new UnauthorizedException("You can only rate your own tickets");

        // Can only rate resolved or closed tickets
        if (ticket.getStatus() != TicketStatus.RESOLVED
                && ticket.getStatus() != TicketStatus.CLOSED)
                        throw new BadRequestException(
                                "You can only rate a resolved or closed ticket");

        // One rating per ticket
        if (ratingRepo.existsByTicket(ticket))
                        throw new ConflictException("You have already rated this ticket");

        Rating rating = Rating.builder()
                .ticket(ticket)
                .user(currentUser)
                .score(req.getScore())
                .comment(req.getComment())
                .build();

        ratingRepo.save(rating);

        // Auto-close ticket after rating
        // Resolved → Closed once user confirms satisfaction
        ticket.setStatus(TicketStatus.CLOSED);
        ticketRepo.save(ticket);

        return toResponse(rating);
    }

    // ── USER: get rating for their ticket ────────────────────────

    public RatingResponse getRatingForTicket(UUID ticketId) {
        Ticket ticket = ticketRepo.findById(ticketId)
                .orElseThrow(() -> new NotFoundException("Ticket", ticketId));

        Rating rating = ratingRepo.findByTicket(ticket)
                .orElseThrow(() -> new NotFoundException("No rating found"));

        return toResponse(rating);
    }

    // ── ADMIN: full rating summary for analytics ─────────────────

    public RatingSummaryResponse getSummary() {

        // Overall average
        Double overallAvg = ratingRepo.findOverallAverageScore();

        // Score distribution — {1: count, 2: count ... 5: count}
        Map<Integer, Long> distribution = new LinkedHashMap<>();
        ratingRepo.findScoreDistribution()
                .forEach(row -> distribution.put(
                        ((Number) row[0]).intValue(),
                        ((Number) row[1]).longValue()));

        // Per-agent ratings
        List<RatingSummaryResponse.AgentRating> agentRatings =
                ratingRepo.findAverageScorePerAgent().stream()
                        .map(row -> RatingSummaryResponse.AgentRating.builder()
                                .agentId(UUID.fromString(row[0].toString()))
                                .agentName(row[1].toString())
                                .averageScore(((Number) row[2]).doubleValue())
                                .totalRatings(((Number) row[3]).longValue())
                                .build())
                        .toList();

        // Per-category ratings
        List<RatingSummaryResponse.CategoryRating> categoryRatings =
                ratingRepo.findAverageScorePerCategory().stream()
                        .map(row -> RatingSummaryResponse.CategoryRating.builder()
                                .categoryName(row[0].toString())
                                .averageScore(((Number) row[1]).doubleValue())
                                .totalRatings(((Number) row[2]).longValue())
                                .build())
                        .toList();

        return RatingSummaryResponse.builder()
                .overallAverage(overallAvg != null
                        ? Math.round(overallAvg * 100.0) / 100.0 : 0.0)
                .totalRatings(ratingRepo.count())
                .scoreDistribution(distribution)
                .agentRatings(agentRatings)
                .categoryRatings(categoryRatings)
                .build();
    }

    // ── MAPPER ───────────────────────────────────────────────────

    private RatingResponse toResponse(Rating r) {
        return RatingResponse.builder()
                .id(r.getId())
                .ticketId(r.getTicket().getId())
                .ticketTitle(r.getTicket().getTitle())
                .userId(r.getUser().getId())
                .userName(r.getUser().getName())
                .score(r.getScore())
                .comment(r.getComment())
                .createdAt(r.getCreatedAt())
                .build();
    }
}
