package com.helpdesk.helpdesk_backend.DTO.REQUEST;

import java.util.UUID;

import com.helpdesk.helpdesk_backend.ENUM.Role;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class UpdateUserRoleRequest {
    @NotNull(message = "Role is required")
    private Role role;

    // Required when promoting to AGENT
    // Which category will this agent handle?
    private UUID categoryId;
}
