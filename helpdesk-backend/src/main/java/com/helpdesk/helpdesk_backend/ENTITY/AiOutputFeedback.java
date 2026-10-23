package com.helpdesk.helpdesk_backend.ENTITY;

import java.time.LocalDateTime;
import java.util.UUID;

import jakarta.persistence.Column;
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

// An agent's thumbs-up / thumbs-down on a piece of AI output
@Entity
@Table(name = "ai_output_feedback")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AiOutputFeedback {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ticket_id", nullable = false)
    private Ticket ticket;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    // SUMMARY / DRAFT / INSIGHTS
    @Column(nullable = false, length = 16)
    private String kind;

    @Column(nullable = false)
    private boolean helpful;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
