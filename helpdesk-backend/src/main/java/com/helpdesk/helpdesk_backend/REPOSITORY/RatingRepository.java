package com.helpdesk.helpdesk_backend.REPOSITORY;

import com.helpdesk.helpdesk_backend.ENTITY.Rating;
import com.helpdesk.helpdesk_backend.ENTITY.Ticket;
import com.helpdesk.helpdesk_backend.ENTITY.User;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface RatingRepository extends JpaRepository<Rating, UUID> {

    // Check if a ticket already has a rating
    boolean existsByTicket(Ticket ticket);

    // Get rating for a specific ticket
    Optional<Rating> findByTicket(Ticket ticket);

    // All ratings given by a user
    List<Rating> findByUser(User user);

    // ANALYTICS — average score across all ratings
    @Query("SELECT AVG(r.score) FROM Rating r")
    Double findOverallAverageScore();

    // ANALYTICS — average score per agent
    // Returns [agentId, agentName, avgScore, ratingCount]
    @Query("""
        SELECT t.assignedTo.id,
               t.assignedTo.name,
               AVG(r.score),
               COUNT(r.id)
        FROM Rating r
        JOIN r.ticket t
        WHERE t.assignedTo IS NOT NULL
        GROUP BY t.assignedTo.id, t.assignedTo.name
        ORDER BY AVG(r.score) DESC
    """)
    List<Object[]> findAverageScorePerAgent();

    // ANALYTICS — average score per category
    @Query("""
        SELECT t.category.name,
               AVG(r.score),
               COUNT(r.id)
        FROM Rating r
        JOIN r.ticket t
        WHERE t.category IS NOT NULL
        GROUP BY t.category.name
        ORDER BY AVG(r.score) ASC
    """)
    List<Object[]> findAverageScorePerCategory();

    // ANALYTICS — score distribution (how many 1s, 2s, 3s, 4s, 5s)
    @Query("""
        SELECT r.score, COUNT(r.id)
        FROM Rating r
        GROUP BY r.score
        ORDER BY r.score ASC
    """)
    List<Object[]> findScoreDistribution();

    // ANALYTICS — ratings in a date range (for trend chart)
    @Query("""
        SELECT r FROM Rating r
        WHERE r.createdAt BETWEEN :from AND :to
        ORDER BY r.createdAt ASC
    """)
    List<Rating> findByDateRange(
        @Param("from") LocalDateTime from,
        @Param("to")   LocalDateTime to
    );

    // ANALYTICS — count of ratings for a specific agent
    @Query("""
        SELECT COUNT(r) FROM Rating r
        JOIN r.ticket t
        WHERE t.assignedTo = :agent
    """)
    long countByAgent(@Param("agent") User agent);

    // ANALYTICS — average score for a specific agent
    @Query("""
        SELECT AVG(r.score) FROM Rating r
        JOIN r.ticket t
        WHERE t.assignedTo = :agent
    """)
    Double findAverageScoreByAgent(@Param("agent") User agent);
}
