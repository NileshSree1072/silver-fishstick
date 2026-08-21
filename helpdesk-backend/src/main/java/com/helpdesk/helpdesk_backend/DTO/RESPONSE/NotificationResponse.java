package com.helpdesk.helpdesk_backend.DTO.RESPONSE;

import java.time.LocalDateTime;
import java.util.UUID;

import com.helpdesk.helpdesk_backend.ENUM.NotificationType;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class NotificationResponse {
    private UUID             id;
    private UUID             ticketId;
    private String           ticketTitle;
    private NotificationType type;
    private String           message;
    private boolean          isRead;
    private LocalDateTime    createdAt;
}
