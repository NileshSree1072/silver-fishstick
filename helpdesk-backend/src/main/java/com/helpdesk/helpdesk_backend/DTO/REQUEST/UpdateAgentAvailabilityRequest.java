package com.helpdesk.helpdesk_backend.DTO.REQUEST;

import com.helpdesk.helpdesk_backend.ENUM.AgentAvailabilityStatus;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UpdateAgentAvailabilityRequest {
    @NotNull
    private AgentAvailabilityStatus status;

    @Size(max = 160)
    private String reason;
}
