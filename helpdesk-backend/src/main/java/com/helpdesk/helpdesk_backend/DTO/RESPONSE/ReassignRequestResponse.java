package com.helpdesk.helpdesk_backend.DTO.RESPONSE;

import java.time.LocalDateTime;
import java.util.UUID;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ReassignRequestResponse {
    private UUID          id;
    private UUID          ticketId;
    private String        ticketTitle;
    private UUID          requestedById;
    private String        requestedByName;
    private UUID          targetCategoryId;
    private String        targetCategoryName;
    private String        reason;
    private String        status;
    private LocalDateTime createdAt;
    private LocalDateTime resolvedAt;
}
