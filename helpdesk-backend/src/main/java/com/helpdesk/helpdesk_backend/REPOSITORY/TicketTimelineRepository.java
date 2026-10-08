package com.helpdesk.helpdesk_backend.REPOSITORY;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.helpdesk.helpdesk_backend.ENTITY.Ticket;
import com.helpdesk.helpdesk_backend.ENTITY.TicketTimeline;
import com.helpdesk.helpdesk_backend.ENTITY.User;
import com.helpdesk.helpdesk_backend.ENUM.TimelineEventType;

@Repository
public interface TicketTimelineRepository extends JpaRepository<TicketTimeline, UUID> {

    List<TicketTimeline> findByTicketOrderByOccurredAtAsc(Ticket ticket);

    List<TicketTimeline> findByTicketIdOrderByOccurredAtAsc(UUID ticketId);

    Optional<TicketTimeline> findFirstByTicketAndEventTypeOrderByOccurredAtAsc(
            Ticket ticket, TimelineEventType type);

    @Query("""
        SELECT tl FROM TicketTimeline tl
        WHERE (:ticketId IS NULL OR tl.ticket.id = :ticketId)
          AND (:actorId  IS NULL OR tl.actor.id  = :actorId)
          AND (:eventType IS NULL OR tl.eventType = :eventType)
          AND tl.occurredAt BETWEEN :from AND :to
        ORDER BY tl.occurredAt DESC
    """)
    Page<TicketTimeline> findWithFilters(
            @Param("ticketId")  UUID ticketId,
            @Param("actorId")   UUID actorId,
            @Param("eventType") TimelineEventType eventType,
            @Param("from")      LocalDateTime from,
            @Param("to")        LocalDateTime to,
            Pageable pageable);

    long countByActorAndEventType(User actor, TimelineEventType type);

    List<TicketTimeline> findByActorAndOccurredAtBetween(
            User actor, LocalDateTime from, LocalDateTime to);

    // Breach log with optional filters
    @Query("""
        SELECT tl FROM TicketTimeline tl
        WHERE tl.eventType = com.helpdesk.helpdesk_backend.ENUM.TimelineEventType.BREACHED
          AND (:agentId IS NULL OR tl.actor.id = :agentId)
          AND (:priority IS NULL OR tl.ticket.priority = :priority)
          AND tl.occurredAt BETWEEN :from AND :to
        ORDER BY tl.occurredAt DESC
    """)
    Page<TicketTimeline> findBreaches(
            @Param("agentId") UUID agentId,
            @Param("priority") com.helpdesk.helpdesk_backend.ENUM.Priority priority,
            @Param("from")    LocalDateTime from,
            @Param("to")      LocalDateTime to,
            Pageable pageable);

    // Transfer log with optional filters
    @Query("""
        SELECT tl FROM TicketTimeline tl
        WHERE tl.eventType = com.helpdesk.helpdesk_backend.ENUM.TimelineEventType.TRANSFERRED
          AND (:actorId IS NULL OR tl.actor.id = :actorId)
          AND (:categoryId IS NULL OR tl.ticket.category.id = :categoryId)
          AND tl.occurredAt BETWEEN :from AND :to
        ORDER BY tl.occurredAt DESC
    """)
    Page<TicketTimeline> findTransfers(
            @Param("actorId") UUID actorId,
            @Param("categoryId") UUID categoryId,
            @Param("from")    LocalDateTime from,
            @Param("to")      LocalDateTime to,
            Pageable pageable);

    // Check if a LATE_ASSIGNED event exists for a ticket
    boolean existsByTicketAndEventType(Ticket ticket, TimelineEventType eventType);

    // Get timeline entries for an actor and event type in a date range
    List<TicketTimeline> findByActorAndEventTypeAndOccurredAtBetween(
            User actor, TimelineEventType eventType,
            LocalDateTime from, LocalDateTime to);

    // Get all entries for a specific ticket + event type
    List<TicketTimeline> findByTicketAndEventTypeOrderByOccurredAtAsc(
            Ticket ticket, TimelineEventType eventType);
}
