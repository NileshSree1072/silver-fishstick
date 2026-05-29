package com.helpdesk.helpdesk_backend.DTO.RESPONSE;

import java.util.UUID;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class AuthResponse {
    private String token;
    private String role;
    private String name;
    private UUID userId;
}
