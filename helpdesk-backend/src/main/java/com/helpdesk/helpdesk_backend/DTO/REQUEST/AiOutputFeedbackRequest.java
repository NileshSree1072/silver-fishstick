package com.helpdesk.helpdesk_backend.DTO.REQUEST;

import java.util.UUID;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class AiOutputFeedbackRequest {

    @NotNull(message = "ticketId is required")
    private UUID ticketId;

    // SUMMARY / DRAFT / INSIGHTS
    @NotBlank(message = "kind is required")
    private String kind;

    @NotNull(message = "helpful is required")
    private Boolean helpful;
}
