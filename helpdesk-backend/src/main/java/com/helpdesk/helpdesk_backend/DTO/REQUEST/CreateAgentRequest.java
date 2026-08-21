package com.helpdesk.helpdesk_backend.DTO.REQUEST;

import java.util.UUID;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CreateAgentRequest {
    @NotBlank private String name;
    @Email    private String email;
    @Size(min = 8) private String password;

    // Which category to assign immediately
    private UUID categoryId;
}
