package com.helpdesk.helpdesk_backend.DTO.REQUEST;

import java.time.LocalDateTime;
import java.util.UUID;

import com.helpdesk.helpdesk_backend.ENUM.TimelineEventType;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TimelineFilterRequest {

    private UUID ticketId;
    private UUID actorId;
    private TimelineEventType eventType;
    private LocalDateTime from;
    private LocalDateTime to;

    @Builder.Default
    private int page = 0;

    @Builder.Default
    private int size = 20;
}
