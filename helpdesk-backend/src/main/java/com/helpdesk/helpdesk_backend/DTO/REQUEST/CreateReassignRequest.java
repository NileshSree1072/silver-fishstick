package com.helpdesk.helpdesk_backend.DTO.REQUEST;

import java.util.UUID;
import lombok.Data;

@Data
public class CreateReassignRequest {
    private UUID   targetCategoryId;
    private String reason;
}
