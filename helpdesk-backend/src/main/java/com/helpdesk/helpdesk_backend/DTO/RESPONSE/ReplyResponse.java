package com.helpdesk.helpdesk_backend.DTO.RESPONSE;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ReplyResponse {

    private UUID          id;
    private UUID          ticketId;
    private UUID          senderId;
    private String        senderName;
    private String        senderRole;    // USER / AGENT / ADMIN
    private String        message;
    @JsonProperty("isInternal")
    private boolean       isInternal;
    @JsonProperty("isAiGenerated")
    private boolean       isAiGenerated;
    private List<AttachmentResponse> attachments;
    private LocalDateTime createdAt;
}
