package com.helpdesk.helpdesk_backend.DTO.RESPONSE;

import java.time.LocalDateTime;
import java.util.UUID;

import com.helpdesk.helpdesk_backend.ENUM.Priority;
import com.helpdesk.helpdesk_backend.ENUM.TicketStatus;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class TicketResponse {

    private UUID           id;
    private String         ticketNumber;
    private String         title;
    private String         description;
    private TicketStatus   status;
    private Priority       priority;
    private String         categoryName;
    private UUID           categoryId;

    // Only expose what the frontend needs — not the full User entity
    private UUID           createdById;
    private String         createdByName;
    private UUID           assignedToId;
    private String         assignedToName;

    private boolean        aiResolved;
    private LocalDateTime  createdAt;
    private LocalDateTime  updatedAt;
    private LocalDateTime  resolvedAt;
}
