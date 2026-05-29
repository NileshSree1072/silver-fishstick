package com.helpdesk.helpdesk_backend.DTO.REQUEST;

import java.util.UUID;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CreateArticleRequest {
    @NotBlank(message = "Title cannot be empty")
    @Size(max=255)
    private String title;

    @NotBlank(message = "Content cannot be empty")
    @Size(max=1000)
    private String content;

    private UUID categoryId;

    

}
