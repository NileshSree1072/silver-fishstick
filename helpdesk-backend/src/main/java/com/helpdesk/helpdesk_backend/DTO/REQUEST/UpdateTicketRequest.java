// dto/request/UpdateTicketRequest.java
// Used by agent to change status, priority, or reassign
package com.helpdesk.helpdesk_backend.DTO.REQUEST;

import java.util.UUID;

import com.helpdesk.helpdesk_backend.ENUM.Priority;
import com.helpdesk.helpdesk_backend.ENUM.TicketStatus;

import lombok.Data;

@Data
public class UpdateTicketRequest {
    private TicketStatus status;
    private Priority     priority;
    private UUID         assignedToId;  // reassign to another agent
    private UUID         categoryId;   // re-categorize
}