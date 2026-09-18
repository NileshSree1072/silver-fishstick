package com.helpdesk.helpdesk_backend.SERVICE;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.helpdesk.helpdesk_backend.DTO.REQUEST.CreateReassignRequest;
import com.helpdesk.helpdesk_backend.DTO.RESPONSE.ReassignRequestResponse;
import com.helpdesk.helpdesk_backend.ENTITY.Category;
import com.helpdesk.helpdesk_backend.ENTITY.ReassignmentRequest;
import com.helpdesk.helpdesk_backend.ENTITY.ReassignmentRequest.RequestStatus;
import com.helpdesk.helpdesk_backend.ENTITY.Ticket;
import com.helpdesk.helpdesk_backend.ENTITY.User;
import com.helpdesk.helpdesk_backend.ENUM.TicketStatus;
import com.helpdesk.helpdesk_backend.EXCEPTION.BadRequestException;
import com.helpdesk.helpdesk_backend.EXCEPTION.NotFoundException;
import com.helpdesk.helpdesk_backend.REPOSITORY.CategoryRepository;
import com.helpdesk.helpdesk_backend.REPOSITORY.ReassignmentRequestRepository;
import com.helpdesk.helpdesk_backend.REPOSITORY.TicketRepository;
import com.helpdesk.helpdesk_backend.REPOSITORY.UserRepository;

import lombok.RequiredArgsConstructor;


@Service
@RequiredArgsConstructor
public class ReassignmentRequestService {

    private final ReassignmentRequestRepository requestRepo;
    private final TicketRepository ticketRepo;
    private final CategoryRepository categoryRepo;
    private final UserRepository userRepo;
    private final SimpMessagingTemplate messagingTemplate;
    private final TicketTimelineService timelineService;

    @Transactional
    public ReassignRequestResponse createRequest(UUID ticketId, CreateReassignRequest req, User requestedBy) {
        Ticket ticket = ticketRepo.findById(ticketId)
                .orElseThrow(() -> new NotFoundException("Ticket", ticketId));
        
        // Double check: is there already a pending reassignment request for this ticket?
        List<ReassignmentRequest> existing = requestRepo.findByTicketId(ticketId);
        boolean hasPending = existing.stream().anyMatch(r -> r.getStatus() == RequestStatus.PENDING);
        if (hasPending) {
            throw new BadRequestException("A pending reassignment request already exists for this ticket.");
        }

        Category targetCat = null;
        if (req.getTargetCategoryId() != null) {
            targetCat = categoryRepo.findById(req.getTargetCategoryId())
                    .orElseThrow(() -> new NotFoundException("Category", req.getTargetCategoryId()));
        }

        ReassignmentRequest reassignReq = ReassignmentRequest.builder()
                .ticket(ticket)
                .requestedBy(requestedBy)
                .targetCategory(targetCat)
                .reason(req.getReason())
                .status(RequestStatus.PENDING)
                .createdAt(LocalDateTime.now())
                .build();

        return toResponse(requestRepo.save(reassignReq));
    }

    public List<ReassignRequestResponse> getPendingRequests() {
        return requestRepo.findByStatus(RequestStatus.PENDING).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public void resolveRequest(UUID requestId, boolean approve, User resolver) {
        ReassignmentRequest req = requestRepo.findById(requestId)
                .orElseThrow(() -> new NotFoundException("ReassignmentRequest", requestId));

        if (req.getStatus() != RequestStatus.PENDING) {
            throw new BadRequestException("Request is already resolved.");
        }

        if (approve) {
            req.setStatus(RequestStatus.APPROVED);
            Ticket ticket = req.getTicket();
            User oldAssignee = ticket.getAssignedTo();

            // Reassign the ticket: set assigned to null (unassigned) and update category if specified
            ticket.setAssignedTo(null);
            if (req.getTargetCategory() != null) {
                ticket.setCategory(req.getTargetCategory());
            }
            ticket.setStatus(TicketStatus.OPEN); // move back to OPEN so it can be assigned
            ticketRepo.save(ticket);

            // Record timeline event
            if (oldAssignee != null) {
                timelineService.recordTransferred(ticket, oldAssignee, null, "Reassignment request approved: " + req.getReason());
            }

            // Notify the old agent via WebSocket so their queue updates immediately
            if (oldAssignee != null) {
                Map<String, Object> reassignEvent = new HashMap<>();
                reassignEvent.put("type", "TICKET_REASSIGNED");
                reassignEvent.put("ticketId", ticket.getId().toString());
                reassignEvent.put("newAssigneeId", null);
                reassignEvent.put("newAssigneeName", "Unassigned");
                messagingTemplate.convertAndSend("/topic/ticket/" + ticket.getId(), reassignEvent);
            }
        } else {
            req.setStatus(RequestStatus.REJECTED);
        }

        req.setResolvedAt(LocalDateTime.now());
        requestRepo.save(req);
    }

    private ReassignRequestResponse toResponse(ReassignmentRequest req) {
        return ReassignRequestResponse.builder()
                .id(req.getId())
                .ticketId(req.getTicket().getId())
                .ticketTitle(req.getTicket().getTitle())
                .requestedById(req.getRequestedBy().getId())
                .requestedByName(req.getRequestedBy().getName())
                .targetCategoryId(req.getTargetCategory() != null ? req.getTargetCategory().getId() : null)
                .targetCategoryName(req.getTargetCategory() != null ? req.getTargetCategory().getName() : null)
                .reason(req.getReason())
                .status(req.getStatus().name())
                .createdAt(req.getCreatedAt())
                .resolvedAt(req.getResolvedAt())
                .build();
    }
}
