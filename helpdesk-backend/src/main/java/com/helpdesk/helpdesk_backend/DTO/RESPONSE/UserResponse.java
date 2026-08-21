package com.helpdesk.helpdesk_backend.DTO.RESPONSE;

import java.time.LocalDateTime;
import java.util.UUID;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class UserResponse {
    private UUID          id;
    private String        name;
    private String        email;
    private String        role;
    private UUID          categoryId;
    private String        categoryName;
    private boolean       isActive;
    private String        availabilityStatus;
    private LocalDateTime availabilityUpdatedAt;
    private String        availabilityReason;
    private Integer       maxActiveTickets;
    private boolean       assignable;
    private LocalDateTime createdAt;

    // Agent-specific stats — null for non-agents
    private Long   totalAssignedTickets;
    private Long   resolvedTickets;
    private Double averageRating;
}
