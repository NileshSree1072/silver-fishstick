package com.helpdesk.helpdesk_backend.DTO.RESPONSE;

import java.time.LocalDateTime;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ActivityEvent {

    private EventType type;
    private String message;
    private String detail;
    private UUID ticketId;
    private String ticketTitle;
    private LocalDateTime timestamp;
    private String level; // "INFO" | "WARN" | "ERROR"

    public enum EventType {
        TICKET_CREATED, TICKET_ASSIGNED, TICKET_RESOLVED,
        AI_RESOLVED, AI_SUGGESTED, AI_FAILED, SLA_WARNING, SLA_BREACH,
        AGENT_REPLIED, EMBEDDING_COMPUTED, FILE_UPLOADED,
        SYSTEM_ERROR
    }
}
