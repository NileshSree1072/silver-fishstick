package com.helpdesk.helpdesk_backend.DTO.REQUEST;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CreateReplyRequest {

    @NotBlank(message = "Message cannot be empty")
    private String message;

    // Only agents can set this to true
    // If a user sends isInternal = true, we ignore it in the service
    // @JsonProperty ensures Jackson maps "isInternal" in JSON to Lombok's setInternal() setter
    @JsonProperty("isInternal")
    private boolean isInternal = false;
}
