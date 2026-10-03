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

@Entity
@Table(name = "user_performance_snapshots")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserPerformanceSnapshot {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "period_start", nullable = false)
    private LocalDateTime periodStart;

    @Column(name = "period_end", nullable = false)
    private LocalDateTime periodEnd;

    @Builder.Default
    @Column(name = "total_tickets_submitted", nullable = false)
    private int totalTicketsSubmitted = 0;

    @Column(name = "avg_response_minutes")
    private Double avgResponseMinutes;

    @Builder.Default
    @Column(name = "repeat_issue_count", nullable = false)
    private int repeatIssueCount = 0;

    @Column(name = "avg_satisfaction_given")
    private Double avgSatisfactionGiven;

    @Builder.Default
    @Column(name = "auto_closed_count", nullable = false)
    private int autoClosedCount = 0;

    @Builder.Default
    @Column(name = "computed_at", nullable = false)
    private LocalDateTime computedAt = LocalDateTime.now();
}
