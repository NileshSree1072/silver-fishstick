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
@Table(name = "agent_performance_snapshots")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AgentPerformanceSnapshot {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "agent_id", nullable = false)
    private User agent;

    @Column(name = "period_start", nullable = false)
    private LocalDateTime periodStart;

    @Column(name = "period_end", nullable = false)
    private LocalDateTime periodEnd;

    @Builder.Default
    @Column(name = "total_assigned", nullable = false)
    private int totalAssigned = 0;

    @Builder.Default
    @Column(name = "total_resolved", nullable = false)
    private int totalResolved = 0;

    @Builder.Default
    @Column(name = "total_transferred_out", nullable = false)
    private int totalTransferredOut = 0;

    @Builder.Default
    @Column(name = "late_assigned_count", nullable = false)
    private int lateAssignedCount = 0;

    @Builder.Default
    @Column(name = "sla_eligible_count", nullable = false)
    private int slaEligibleCount = 0;

    @Builder.Default
    @Column(name = "sla_compliant_count", nullable = false)
    private int slaCompliantCount = 0;

    @Column(name = "avg_first_response_minutes")
    private Double avgFirstResponseMinutes;

    @Column(name = "avg_handle_time_minutes")
    private Double avgHandleTimeMinutes;

    @Column(name = "avg_satisfaction_score")
    private Double avgSatisfactionScore;

    @Builder.Default
    @Column(name = "computed_at", nullable = false)
    private LocalDateTime computedAt = LocalDateTime.now();
}
