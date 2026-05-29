package com.helpdesk.helpdesk_backend.DTO.RESPONSE;

import java.time.LocalDateTime;
import java.util.UUID;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AgentMetricsResponse {

    private UUID agentId;
    private String agentName;
    private String agentCategory;

    private LocalDateTime periodStart;
    private LocalDateTime periodEnd;

    private int totalAssigned;
    private int totalResolved;
    private int totalTransferredOut;
    private int lateAssignedCount;
    private int slaEligibleCount;
    private int slaCompliantCount;

    private double slaComplianceRate;
    private double avgFirstResponseMinutes;
    private double avgHandleTimeMinutes;
    private double avgSatisfactionScore;
    private double resolutionRate;
    private double transferRate;
}
