package com.helpdesk.helpdesk_backend.DTO.RESPONSE;

import java.time.LocalDateTime;
import java.util.UUID;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class RatingResponse {
    private UUID          id;
    private UUID          ticketId;
    private String        ticketTitle;
    private UUID          userId;
    private String        userName;
    private int           score;
    private String        comment;
    private LocalDateTime createdAt;
}
