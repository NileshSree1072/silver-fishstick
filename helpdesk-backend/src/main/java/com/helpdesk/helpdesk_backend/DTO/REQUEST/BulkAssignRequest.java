package com.helpdesk.helpdesk_backend.DTO.REQUEST;

import java.util.List;
import java.util.UUID;
import lombok.Data;

@Data
public class BulkAssignRequest {
    private List<UUID> ticketIds;
    private UUID       assignedToId;
}
