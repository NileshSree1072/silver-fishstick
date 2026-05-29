package com.helpdesk.helpdesk_backend.DTO.REQUEST;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CreateRatingRequest {

    @NotNull(message = "Score is required")
    @Min(value = 1, message = "Minimum score is 1")
    @Max(value = 5, message = "Maximum score is 5")
    private Integer score;

    // Optional written feedback from user
    private String comment;
}
