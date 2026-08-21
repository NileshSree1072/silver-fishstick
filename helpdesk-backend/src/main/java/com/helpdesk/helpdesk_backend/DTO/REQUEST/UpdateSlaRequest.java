package com.helpdesk.helpdesk_backend.DTO.REQUEST;

import com.helpdesk.helpdesk_backend.ENUM.Priority;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UpdateSlaRequest {

    @NotNull(message = "Priority is required")
    private Priority priority;

    @Min(value = 1, message = "Response hours must be at least 1")
    private int responseHours;

    @Min(value = 1, message = "Resolution hours must be at least 1")
    private int resolutionHours;
}
