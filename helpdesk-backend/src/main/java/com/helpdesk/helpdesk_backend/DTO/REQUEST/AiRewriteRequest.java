package com.helpdesk.helpdesk_backend.DTO.REQUEST;

import java.util.UUID;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class AiRewriteRequest {

    @NotNull(message = "ticketId is required")
    private UUID ticketId;

    @NotBlank(message = "text is required")
    private String text;

    // IMPROVE / SHORTEN / TRANSLATE
    @NotBlank(message = "mode is required")
    private String mode;
}
