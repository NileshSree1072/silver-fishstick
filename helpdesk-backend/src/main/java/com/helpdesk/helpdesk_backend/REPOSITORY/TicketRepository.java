package com.helpdesk.helpdesk_backend.REPOSITORY;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Page;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.helpdesk.helpdesk_backend.ENTITY.Category;
import com.helpdesk.helpdesk_backend.ENTITY.Ticket;
import com.helpdesk.helpdesk_backend.ENTITY.User;
import com.helpdesk.helpdesk_backend.ENUM.Priority;
import com.helpdesk.helpdesk_backend.ENUM.TicketStatus;

@Repository
public interface TicketRepository extends JpaRepository<Ticket, UUID> {

    // USER — my tickets (paginated)
    Page<Ticket> findByCreatedBy(User user, Pageable pageable);

    // USER — my tickets filtered by status
    Page<Ticket> findByCreatedByAndStatus(User user, TicketStatus status, Pageable pageable);

    @Query(value = "SELECT nextval('ticket_number_seq')", nativeQuery = true)
    long nextTicketSequence();

    @Query("""
        SELECT t FROM Ticket t
        WHERE t.createdBy = :user
          AND (:status IS NULL OR t.status = :status)
          AND (:priority IS NULL OR t.priority = :priority)
          AND (:categoryId IS NULL OR t.category.id = :categoryId)
          AND (:q IS NULL OR :q = ''
               OR LOWER(t.ticketNumber) LIKE LOWER(CONCAT('%', :q, '%'))
               OR LOWER(t.title) LIKE LOWER(CONCAT('%', :q, '%'))
               OR LOWER(t.description) LIKE LOWER(CONCAT('%', :q, '%')))
    """)
    Page<Ticket> filterMyTickets(
        @Param("user") User user,
        @Param("status") TicketStatus status,
        @Param("priority") Priority priority,
        @Param("categoryId") UUID categoryId,
        @Param("q") String q,
        Pageable pageable);

    // AGENT — assigned tickets (paginated)
    Page<Ticket> findByAssignedTo(User agent, Pageable pageable);

    // AGENT — assigned tickets filtered by status
    Page<Ticket> findByAssignedToAndStatus(User agent, TicketStatus status, Pageable pageable);

    @Query("""
        SELECT t FROM Ticket t
        WHERE t.assignedTo = :agent
          AND (:status IS NULL OR t.status = :status)
          AND (:priority IS NULL OR t.priority = :priority)
          AND (:categoryId IS NULL OR t.category.id = :categoryId)
          AND (:q IS NULL OR :q = ''
               OR LOWER(t.ticketNumber) LIKE LOWER(CONCAT('%', :q, '%'))
               OR LOWER(t.title) LIKE LOWER(CONCAT('%', :q, '%'))
               OR LOWER(t.description) LIKE LOWER(CONCAT('%', :q, '%')))
    """)
    Page<Ticket> filterAssignedTickets(
        @Param("agent") User agent,
        @Param("status") TicketStatus status,
        @Param("priority") Priority priority,
        @Param("categoryId") UUID categoryId,
        @Param("q") String q,
        Pageable pageable);

    // ADMIN — tickets assigned to agent filtered by multiple statuses
    Page<Ticket> findByAssignedToAndStatusIn(User agent, java.util.List<TicketStatus> statuses, Pageable pageable);

    // ADMIN — all unassigned tickets
    Page<Ticket> findByAssignedToIsNull(Pageable pageable);

    // ADMIN — unassigned tickets with status filter
    Page<Ticket> findByAssignedToIsNullAndStatus(TicketStatus status, Pageable pageable);

    @Query("""
        SELECT t FROM Ticket t
        WHERE t.assignedTo IS NULL
          AND (:status IS NULL OR t.status = :status)
          AND (:priority IS NULL OR t.priority = :priority)
          AND (:categoryId IS NULL OR t.category.id = :categoryId)
          AND (:q IS NULL OR :q = ''
               OR LOWER(t.ticketNumber) LIKE LOWER(CONCAT('%', :q, '%'))
               OR LOWER(t.title) LIKE LOWER(CONCAT('%', :q, '%'))
               OR LOWER(t.description) LIKE LOWER(CONCAT('%', :q, '%')))
    """)
    Page<Ticket> filterUnassignedTickets(
        @Param("status") TicketStatus status,
        @Param("priority") Priority priority,
        @Param("categoryId") UUID categoryId,
        @Param("q") String q,
        Pageable pageable);

    // ADMIN — filter by status
    Page<Ticket> findByStatus(TicketStatus status, Pageable pageable);

    // ADMIN — filter by category
    Page<Ticket> findByCategory(Category category, Pageable pageable);

    boolean existsByCategory(Category category);

    // ADMIN — filter by priority
    Page<Ticket> findByPriority(Priority priority, Pageable pageable);

    @Query("""
        SELECT t FROM Ticket t
        WHERE (:status IS NULL OR t.status = :status)
          AND (:priority IS NULL OR t.priority = :priority)
          AND (:categoryId IS NULL OR t.category.id = :categoryId)
          AND (:q IS NULL OR :q = ''
               OR LOWER(t.ticketNumber) LIKE LOWER(CONCAT('%', :q, '%'))
               OR LOWER(t.title) LIKE LOWER(CONCAT('%', :q, '%'))
               OR LOWER(t.description) LIKE LOWER(CONCAT('%', :q, '%'))
               OR LOWER(t.createdBy.name) LIKE LOWER(CONCAT('%', :q, '%')))
    """)
    Page<Ticket> filterAllTickets(
        @Param("status") TicketStatus status,
        @Param("priority") Priority priority,
        @Param("categoryId") UUID categoryId,
        @Param("q") String q,
        Pageable pageable);

    // AGENT — search assigned tickets by title or description
    @Query("""
        SELECT t FROM Ticket t
        WHERE t.assignedTo = :agent
          AND (LOWER(t.title)       LIKE LOWER(CONCAT('%',:q,'%'))
           OR  LOWER(t.description) LIKE LOWER(CONCAT('%',:q,'%'))
           OR  LOWER(t.ticketNumber) LIKE LOWER(CONCAT('%',:q,'%')))
    """)
    Page<Ticket> searchAssignedTickets(
        @Param("agent") User agent,
        @Param("q") String q,
        Pageable pageable
    );

    // AGENT/ADMIN — search ALL tickets by title or description (used by link-ticket picker)
    @Query("""
        SELECT t FROM Ticket t
        WHERE (LOWER(t.title)       LIKE LOWER(CONCAT('%',:q,'%'))
           OR  LOWER(t.description) LIKE LOWER(CONCAT('%',:q,'%'))
           OR  LOWER(t.ticketNumber) LIKE LOWER(CONCAT('%',:q,'%')))
    """)
    Page<Ticket> searchAllTickets(
        @Param("q") String q,
        Pageable pageable
    );

    // AGENT GROUP — get tickets belonging to the agent's category (or unassigned)
    @Query("SELECT t FROM Ticket t WHERE (:category IS NULL AND t.category IS NULL) OR (t.category = :category OR t.category IS NULL)")
    Page<Ticket> findByAgentCategory(@Param("category") Category category, Pageable pageable);

    @Query("SELECT t FROM Ticket t WHERE ((:category IS NULL AND t.category IS NULL) OR (t.category = :category OR t.category IS NULL)) AND t.status = :status")
    Page<Ticket> findByAgentCategoryAndStatus(@Param("category") Category category, @Param("status") TicketStatus status, Pageable pageable);

    @Query("""
        SELECT t FROM Ticket t
        WHERE ((:agentCategory IS NULL AND t.category IS NULL) OR (t.category = :agentCategory OR t.category IS NULL))
          AND (:status IS NULL OR t.status = :status)
          AND (:priority IS NULL OR t.priority = :priority)
          AND (:categoryId IS NULL OR t.category.id = :categoryId)
          AND (:q IS NULL OR :q = ''
               OR LOWER(t.ticketNumber) LIKE LOWER(CONCAT('%', :q, '%'))
               OR LOWER(t.title) LIKE LOWER(CONCAT('%', :q, '%'))
               OR LOWER(t.description) LIKE LOWER(CONCAT('%', :q, '%'))
               OR LOWER(t.createdBy.name) LIKE LOWER(CONCAT('%', :q, '%')))
    """)
    Page<Ticket> filterAgentCategoryTickets(
        @Param("agentCategory") Category agentCategory,
        @Param("status") TicketStatus status,
        @Param("priority") Priority priority,
        @Param("categoryId") UUID categoryId,
        @Param("q") String q,
        Pageable pageable);

    @Query("""
        SELECT t FROM Ticket t
        WHERE ((:category IS NULL AND t.category IS NULL) OR (t.category = :category OR t.category IS NULL))
          AND (LOWER(t.title)       LIKE LOWER(CONCAT('%',:q,'%'))
           OR  LOWER(t.description) LIKE LOWER(CONCAT('%',:q,'%'))
           OR  LOWER(t.ticketNumber) LIKE LOWER(CONCAT('%',:q,'%')))
    """)
    Page<Ticket> searchByAgentCategory(
        @Param("category") Category category,
        @Param("q") String q,
        Pageable pageable
    );

    // ANALYTICS — count by status
    long countByStatus(TicketStatus status);

    // ANALYTICS — count by agent
    long countByAssignedTo(User agent);

    // ANALYTICS — count resolved by agent
    long countByAssignedToAndStatus(User agent, TicketStatus status);

    // ANALYTICS — tickets created in a date range
    @Query("""
        SELECT t FROM Ticket t
        WHERE t.createdAt BETWEEN :from AND :to
    """)
    List<Ticket> findByDateRange(
        @Param("from") LocalDateTime from,
        @Param("to")   LocalDateTime to
    );

    // ANALYTICS — count ai-resolved tickets
    long countByAiResolvedTrue();

    // SLA — find open tickets older than a given time
    @Query("""
        SELECT t FROM Ticket t
        WHERE t.status IN (
            com.helpdesk.helpdesk_backend.ENUM.TicketStatus.OPEN,
            com.helpdesk.helpdesk_backend.ENUM.TicketStatus.IN_PROGRESS
        )
          AND t.createdAt < :threshold
    """)
    List<Ticket> findTicketsExceedingSLA(
        @Param("threshold") LocalDateTime threshold
    );

    List<Ticket> findByStatusIn(List<TicketStatus> statuses);

    List<Ticket> findByCreatedByAndCreatedAtBetween(User user, LocalDateTime from, LocalDateTime to);
    
    List<Ticket> findByCreatedBy(User user);
}
