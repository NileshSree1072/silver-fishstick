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
public class TimelineEventResponse {

    private UUID id;
    private UUID ticketId;
    private String ticketTitle;
    private String ticketNumber;

    private String eventType;
    private UUID actorId;
    private String actorName;
    private String actorRole;

    private String note;
    private LocalDateTime occurredAt;

    // Extra field for breach log — "SYSTEM" or "AGENT"
    private String faultType;

    // Extra field for transfer log — SLA status at time of transfer
    private String slaStatusAtTransfer;

    // Priority of the ticket (for breach/transfer log)
    private String priority;
}
