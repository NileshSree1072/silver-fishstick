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
public class UserMetricsResponse {

    private UUID userId;
    private String userName;

    private LocalDateTime periodStart;
    private LocalDateTime periodEnd;

    private int totalTicketsSubmitted;
    private double avgResponseTimeMinutes;
    private int repeatIssueCount;
    private double avgSatisfactionGiven;
    private int autoClosedCount;
    private double ticketQualityScore;
}
