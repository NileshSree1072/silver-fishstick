package com.helpdesk.helpdesk_backend.ENTITY;

import java.time.LocalDateTime;
import java.util.UUID;

import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "ticket_links")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class TicketLink {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ticket_a_id")
    private Ticket ticketA;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ticket_b_id")
    private Ticket ticketB;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "linked_by")
    private User linkedBy;
    @Builder.Default
    private LocalDateTime linkedAt = LocalDateTime.now();
}
