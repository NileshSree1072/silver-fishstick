package com.helpdesk.helpdesk_backend.UTIL;

import java.util.List;

import org.springframework.stereotype.Component;

import com.helpdesk.helpdesk_backend.DTO.RESPONSE.TicketResponse;
import com.helpdesk.helpdesk_backend.ENTITY.Ticket;

@Component
public class TicketMapper {

    public TicketResponse toResponse(Ticket ticket) {
        return TicketResponse.builder()
                .id(ticket.getId())
                .ticketNumber(ticket.getTicketNumber())
                .title(ticket.getTitle())
                .description(ticket.getDescription())
                .status(ticket.getStatus())
                .priority(ticket.getPriority())
                .categoryId(ticket.getCategory() != null
                        ? ticket.getCategory().getId() : null)
                .categoryName(ticket.getCategory() != null
                        ? ticket.getCategory().getName() : null)
                .createdById(ticket.getCreatedBy().getId())
                .createdByName(ticket.getCreatedBy().getName())
                .assignedToId(ticket.getAssignedTo() != null
                        ? ticket.getAssignedTo().getId() : null)
                .assignedToName(ticket.getAssignedTo() != null
                        ? ticket.getAssignedTo().getName() : null)
                .aiResolved(ticket.isAiResolved())
                .aiFeedback(ticket.getAiFeedback())
                .aiConfidence(ticket.getAiConfidence())
                .createdAt(ticket.getCreatedAt())
                .updatedAt(ticket.getUpdatedAt())
                .resolvedAt(ticket.getResolvedAt())
                .build();
    }

    public List<TicketResponse> toResponseList(List<Ticket> tickets) {
        return tickets.stream().map(this::toResponse).toList();
    }
}
