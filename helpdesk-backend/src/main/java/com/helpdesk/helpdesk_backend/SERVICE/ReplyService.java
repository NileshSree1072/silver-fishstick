package com.helpdesk.helpdesk_backend.SERVICE;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import com.helpdesk.helpdesk_backend.DTO.REQUEST.CreateReplyRequest;
import com.helpdesk.helpdesk_backend.DTO.RESPONSE.ReplyResponse;
import com.helpdesk.helpdesk_backend.ENTITY.Attachment;
import com.helpdesk.helpdesk_backend.ENTITY.Reply;
import com.helpdesk.helpdesk_backend.ENTITY.Ticket;
import com.helpdesk.helpdesk_backend.ENTITY.User;
import com.helpdesk.helpdesk_backend.ENUM.AiFeedbackStatus;
import com.helpdesk.helpdesk_backend.ENUM.Role;
import com.helpdesk.helpdesk_backend.ENUM.TicketStatus;
import com.helpdesk.helpdesk_backend.EXCEPTION.BadRequestException;
import com.helpdesk.helpdesk_backend.EXCEPTION.NotFoundException;
import com.helpdesk.helpdesk_backend.EXCEPTION.UnauthorizedException;
import com.helpdesk.helpdesk_backend.REPOSITORY.AttachmentRepository;
import com.helpdesk.helpdesk_backend.REPOSITORY.ReplyRepository;
import com.helpdesk.helpdesk_backend.REPOSITORY.TicketRepository;
import com.helpdesk.helpdesk_backend.UTIL.ReplyMapper;

import lombok.RequiredArgsConstructor;
import java.util.Objects;

import com.helpdesk.helpdesk_backend.SERVICE.ActivityService;
import com.helpdesk.helpdesk_backend.SERVICE.StorageService;
import com.helpdesk.helpdesk_backend.SERVICE.TicketTimelineService;

@Service
@RequiredArgsConstructor
public class ReplyService {
    private final ReplyRepository replyRepository;
    private final TicketRepository ticketRepository;
    private final AttachmentRepository attachmentRepository;
    private final ReplyMapper mapper;
    private final StorageService storageService;
    private final NotificationService notificationService;
    private final SimpMessagingTemplate messagingTemplate;
    private final ActivityService activityService;
    private final TicketTimelineService timelineService;

    //Send reply

    public ReplyResponse sendReply(UUID ticketId, CreateReplyRequest req, User sender){
        return sendReply(ticketId, req, sender, List.of());
    }

    public ReplyResponse sendReply(UUID ticketId, CreateReplyRequest req, User sender, List<MultipartFile> files){
        Ticket ticket = ticketRepository.findById(Objects.requireNonNull(ticketId))
                .orElseThrow(() ->
                new NotFoundException("Ticket", ticketId)
            );

        boolean hasFiles = files != null && files.stream().anyMatch(file -> file != null && !file.isEmpty());
        if ((req.getMessage() == null || req.getMessage().trim().isEmpty()) && !hasFiles) {
            throw new BadRequestException("Reply message or attachment is required");
        }

        assertCanReply(ticket, sender);

        // Auto-assign: if an agent replies to an unassigned ticket, they become the owner
        boolean autoAssigned = false;
        if (sender.getRole() == Role.AGENT && ticket.getAssignedTo() == null) {
            ticket.setAssignedTo(sender);
            autoAssigned = true;
            // Record assignment via timeline
            boolean late = timelineService.isLateAssigned(ticket);
            timelineService.recordAssigned(ticket, sender, late);
        }

        boolean internal = (sender.getRole() != Role.USER) && req.isInternal();

        Reply reply = Reply.builder()
                .ticket(ticket)
                .sender(sender)
                .message(req.getMessage())
                .isInternal(internal)
                .isAiGenerated(false)
                .build();
        replyRepository.save(Objects.requireNonNull(reply));

        if (files != null) {
            for (MultipartFile file : files) {
                if (file == null || file.isEmpty()) {
                    continue;
                }
                String url = storageService.uploadFile(file, "tickets/" + ticket.getId() + "/replies/" + reply.getId());
                Attachment attachment = Attachment.builder()
                        .ticket(ticket)
                        .reply(reply)
                        .uploadedBy(sender)
                        .fileName(file.getOriginalFilename())
                        .fileUrl(url)
                        .fileSize(file.getSize())
                        .build();
                attachmentRepository.save(attachment);
            }
        }

        // Broadcast reply to all subscribers of this ticket's WebSocket topic
        messagingTemplate.convertAndSend(
            "/topic/ticket/" + ticket.getId(),
            mapper.toResponse(reply, attachmentRepository.findByReply(reply))
        );

        // Move ticket to IN_PROGRESS when an agent first replies (covers auto-assign case too)
        if (sender.getRole() == Role.AGENT && ticket.getStatus() == TicketStatus.OPEN) {
            ticket.setStatus(TicketStatus.IN_PROGRESS);
        }

        // Persist any ticket changes (auto-assign and/or status update)
        if (autoAssigned || (sender.getRole() == Role.AGENT && ticket.getStatus() == TicketStatus.IN_PROGRESS)) {
            ticketRepository.save(Objects.requireNonNull(ticket));
        }

        if (sender.getRole() == Role.USER) {
            notificationService.notifyAgentUserReplied(ticket, reply);
        } else if (!internal) {
            notificationService.notifyUserAgentReplied(ticket, reply);
        }

        if (sender.getRole() == Role.AGENT) {
            activityService.agentReplied(ticket, sender);
            // Record timeline events for agent replies
            if (!internal) {
                timelineService.recordFirstReply(ticket, sender);
                timelineService.recordReplySent(ticket, sender);
            }
        } else {
            // User reply
            timelineService.recordReplySent(ticket, sender);
        }

        return mapper.toResponse(reply, attachmentRepository.findByReply(reply));
    }

    //save Ai reply
    // resolve = true  → high confidence: ticket is marked RESOLVED pending customer confirmation
    // resolve = false → medium confidence: answer is posted but the ticket stays open for an agent
    public ReplyResponse saveAiReply(Ticket ticket, String message, User aiUser,
                                     String sourcesJson, boolean resolve, double confidence){
        Reply reply = Reply.builder()
                .ticket(ticket)
                .sender(aiUser)
                .message(message)
                .isInternal(false)
                .isAiGenerated(true)
                .aiSources(sourcesJson)
                .build();
        replyRepository.save(Objects.requireNonNull(reply));

        ticket.setAiFeedback(AiFeedbackStatus.PENDING);
        ticket.setAiConfidence(confidence);
        if (resolve) {
            ticket.setAiResolved(true);
            ticket.setStatus(TicketStatus.RESOLVED);
            ticket.setResolvedAt(LocalDateTime.now());
        }
        ticketRepository.save(ticket);

        if (resolve) {
            notificationService.notifyUserTicketResolved(ticket);
        } else {
            notificationService.notifyUserAgentReplied(ticket, reply);
        }

        // Topic is shared with the customer, so broadcast the customer-safe view
        messagingTemplate.convertAndSend(
            "/topic/ticket/" + ticket.getId(),
            mapper.toCustomerView(mapper.toResponse(reply))
        );

        return mapper.toResponse(reply);
    }
    

    //get replies

    public List<ReplyResponse> getReplies(UUID ticketId, User currentUser) {
        Ticket ticket = ticketRepository.findById(Objects.requireNonNull(ticketId))
                .orElseThrow(() ->
                new NotFoundException("Ticket", ticketId)
            );
        asserCanView(ticket, currentUser);

        if (currentUser.getRole() == Role.USER) {
            List<Reply> replies = replyRepository.findByTicketAndIsInternalFalseOrderByCreatedAtAsc(ticket);
            return mapper.toResponseList(replies, attachmentRepository::findByReply).stream()
                    .map(mapper::toCustomerView)
                    .toList();
        }

        List<Reply> replies = replyRepository.findByTicketOrderByCreatedAtAsc(ticket);
        return mapper.toResponseList(replies, attachmentRepository::findByReply);
    }

    public void addInternalNote(Ticket ticket, User sender, String message) {
        Reply reply = Reply.builder()
                .ticket(ticket)
                .sender(sender)
                .message(message)
                .isInternal(true)
                .isAiGenerated(false)
                .build();
        replyRepository.save(reply);
        messagingTemplate.convertAndSend(
            "/topic/ticket/" + ticket.getId(),
            mapper.toResponse(reply)
        );
    }

    //helpers

    private void asserCanView(Ticket ticket, User currentUser) {
        boolean isOwner    = ticket.getCreatedBy().getId().equals(currentUser.getId());
        boolean isAssigned = ticket.getAssignedTo() != null
                            && ticket.getAssignedTo().getId().equals(currentUser.getId());
        boolean isAdmin    = currentUser.getRole() == Role.ADMIN;
        boolean isAgent    = currentUser.getRole() == Role.AGENT;

        if (isAgent) {
            boolean sameCategory = (ticket.getCategory() == null) || 
                    (currentUser.getCategory() != null && ticket.getCategory().getId().equals(currentUser.getCategory().getId()));
            if (!sameCategory && !isAssigned) {
                throw new UnauthorizedException("Access denied: Ticket belongs to another group");
            }
        }

        if (!isOwner && !isAssigned && !isAdmin && !isAgent) {
            throw new UnauthorizedException("You don't have permission to view replies of this ticket");
        }
    }

    private void assertCanReply(Ticket ticket, User sender) {
        boolean isOwner    = ticket.getCreatedBy().getId().equals(sender.getId());
        boolean isAssigned = ticket.getAssignedTo() != null && ticket.getAssignedTo().getId().equals(sender.getId());
        boolean isAdmin    = sender.getRole() == Role.ADMIN;
        boolean isAgent    = sender.getRole() == Role.AGENT;

        if (isAgent) {
            boolean sameCategory = (ticket.getCategory() == null) || 
                    (sender.getCategory() != null && ticket.getCategory().getId().equals(sender.getCategory().getId()));
            if (!sameCategory && !isAssigned) {
                throw new UnauthorizedException("Access denied: Ticket belongs to another group");
            }
        }

        if (!isOwner && !isAssigned && !isAdmin && !isAgent) {
            throw new UnauthorizedException("You don't have permission to reply to this ticket");
        }
        if (ticket.getStatus() == TicketStatus.CLOSED) {
            throw new BadRequestException("Cannot reply to a closed ticket");
        }
    }
    
}
