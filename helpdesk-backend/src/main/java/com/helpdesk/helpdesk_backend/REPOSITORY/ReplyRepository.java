package com.helpdesk.helpdesk_backend.REPOSITORY;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.helpdesk.helpdesk_backend.ENTITY.Reply;
import com.helpdesk.helpdesk_backend.ENTITY.Ticket;
import com.helpdesk.helpdesk_backend.ENTITY.User;

public interface ReplyRepository extends JpaRepository<Reply, UUID> {
    

    List<Reply> findByTicketAndIsInternalFalseOrderByCreatedAtAsc(Ticket ticket);
    
    List<Reply> findByTicketOrderByCreatedAtAsc(Ticket ticket);

    long countByTicket(Ticket ticket);
    long countByIsAiGeneratedTrue();

    long countBySenderAndIsInternalFalse(User sender);

    java.util.Optional<Reply> findTopBySenderOrderByCreatedAtDesc(User sender);
}
