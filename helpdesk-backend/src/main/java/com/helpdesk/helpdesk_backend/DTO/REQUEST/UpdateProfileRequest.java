package com.helpdesk.helpdesk_backend.DTO.REQUEST;

import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class UpdateProfileRequest {

    @Size(min = 2, max = 100)
    private String name;

    @Email
    private String email;

    @Size(min = 8, message = "Password must be at least 8 characters")
    private String password;    // optional — only if changing password
}
