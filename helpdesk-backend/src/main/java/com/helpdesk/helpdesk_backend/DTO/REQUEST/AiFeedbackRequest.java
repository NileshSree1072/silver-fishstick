package com.helpdesk.helpdesk_backend.DTO.REQUEST;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class AiFeedbackRequest {

    // true = the AI answer solved the issue, false = customer still needs an agent
    @NotNull(message = "helpful is required")
    private Boolean helpful;
}
