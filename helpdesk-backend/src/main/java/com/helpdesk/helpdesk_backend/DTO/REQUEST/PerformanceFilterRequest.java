package com.helpdesk.helpdesk_backend.DTO.REQUEST;

import java.time.LocalDateTime;
import java.util.UUID;

import com.helpdesk.helpdesk_backend.ENUM.Priority;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PerformanceFilterRequest {

    private UUID agentId;
    private UUID userId;
    private LocalDateTime from;
    private LocalDateTime to;
    private UUID category;
    private Priority priority;
}
