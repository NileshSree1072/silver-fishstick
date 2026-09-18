package com.helpdesk.helpdesk_backend.REPOSITORY;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.helpdesk.helpdesk_backend.ENTITY.TicketLink;

@Repository
public interface TicketLinkRepository extends JpaRepository<TicketLink, UUID> {

    // Find all tickets linked to a given ticket (either side)
    @Query("""
        SELECT tl FROM TicketLink tl
        WHERE tl.ticketA.id = :ticketId
           OR tl.ticketB.id = :ticketId
    """)
    List<TicketLink> findByTicketId(@Param("ticketId") UUID ticketId);

    // Check if two tickets are already linked
    @Query("""
        SELECT COUNT(tl) > 0 FROM TicketLink tl
        WHERE (tl.ticketA.id = :a AND tl.ticketB.id = :b)
           OR (tl.ticketA.id = :b AND tl.ticketB.id = :a)
    """)
    boolean existsLink(@Param("a") UUID a, @Param("b") UUID b);
}
