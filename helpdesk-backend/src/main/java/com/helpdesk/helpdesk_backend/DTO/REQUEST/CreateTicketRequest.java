package com.helpdesk.helpdesk_backend.DTO.REQUEST;

import java.util.UUID;

import com.helpdesk.helpdesk_backend.ENUM.Priority;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CreateTicketRequest {
    @NotBlank(message = "Title is required")
    @Size(max=255,message="Title cannot exceed 255 characters")
    private String title;

    @NotBlank(message = "Description is required")
    private String description;

    private UUID categoryId;
    private Priority priority;

    
}
