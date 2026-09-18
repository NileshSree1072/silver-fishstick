package com.helpdesk.helpdesk_backend.SERVICE;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;

import com.helpdesk.helpdesk_backend.DTO.RESPONSE.TicketResponse;
import com.helpdesk.helpdesk_backend.ENTITY.Ticket;
import com.helpdesk.helpdesk_backend.ENTITY.TicketLink;
import com.helpdesk.helpdesk_backend.ENTITY.User;
import com.helpdesk.helpdesk_backend.ENUM.TicketStatus;
import com.helpdesk.helpdesk_backend.EXCEPTION.BadRequestException;
import com.helpdesk.helpdesk_backend.EXCEPTION.ConflictException;
import com.helpdesk.helpdesk_backend.EXCEPTION.NotFoundException;
import com.helpdesk.helpdesk_backend.EXCEPTION.UnauthorizedException;
import com.helpdesk.helpdesk_backend.REPOSITORY.TicketLinkRepository;
import com.helpdesk.helpdesk_backend.REPOSITORY.TicketRepository;
import com.helpdesk.helpdesk_backend.ENUM.Role;
import com.helpdesk.helpdesk_backend.UTIL.TicketMapper;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class TicketLinkService {

    private final TicketLinkRepository linkRepo;
    private final TicketRepository     ticketRepo;
    private final NotificationService  notificationService;
    private final ReplyService         replyService;
    private final TicketMapper         mapper;

    private void assertCanView(Ticket ticket, User user) {
        boolean isOwner = ticket.getCreatedBy().getId().equals(user.getId());
        boolean isAssigned = ticket.getAssignedTo() != null
                && ticket.getAssignedTo().getId().equals(user.getId());
        boolean isAdmin = user.getRole() == Role.ADMIN;
        boolean isAgent = user.getRole() == Role.AGENT;

        if (isAgent) {
            boolean sameCategory = (ticket.getCategory() == null) || 
                    (user.getCategory() != null && ticket.getCategory().getId().equals(user.getCategory().getId()));
            if (!sameCategory && !isAssigned) {
                throw new UnauthorizedException("Access denied: Ticket belongs to another group");
            }
        }

        if (!isOwner && !isAssigned && !isAdmin && !isAgent)
            throw new UnauthorizedException("Access denied");
    }

    // Link two tickets together
    public void linkTickets(UUID ticketAId, UUID ticketBId, User agent) {

        if (ticketAId.equals(ticketBId))
            throw new BadRequestException("Cannot link a ticket to itself");

        Ticket ticketA = ticketRepo.findById(ticketAId)
                .orElseThrow(() -> new NotFoundException("Ticket", ticketAId));
        Ticket ticketB = ticketRepo.findById(ticketBId)
                .orElseThrow(() -> new NotFoundException("Ticket", ticketBId));

        assertCanView(ticketA, agent);
        assertCanView(ticketB, agent);

        if (linkRepo.existsLink(ticketAId, ticketBId))
            throw new ConflictException("Tickets are already linked");

        TicketLink link = TicketLink.builder()
                .ticketA(ticketA)
                .ticketB(ticketB)
                .linkedBy(agent)
                .build();

        linkRepo.save(link);
    }

    // Get all tickets linked to a given ticket (internal use)
    public List<TicketResponse> getLinkedTickets(UUID ticketId) {
        return linkRepo.findByTicketId(ticketId)
                .stream()
                .map(link -> link.getTicketA().getId().equals(ticketId)
                        ? link.getTicketB()
                        : link.getTicketA())
                .map(mapper::toResponse)
                .toList();
    }

    // Get all tickets linked to a given ticket (secured)
    public List<TicketResponse> getLinkedTickets(UUID ticketId, User user) {
        Ticket parentTicket = ticketRepo.findById(ticketId)
                .orElseThrow(() -> new NotFoundException("Ticket", ticketId));
        assertCanView(parentTicket, user);

        return linkRepo.findByTicketId(ticketId)
                .stream()
                .map(link -> link.getTicketA().getId().equals(ticketId)
                        ? link.getTicketB()
                        : link.getTicketA())
                .filter(ticket -> {
                    try {
                        assertCanView(ticket, user);
                        return true;
                    } catch (UnauthorizedException e) {
                        return false;
                    }
                })
                .map(mapper::toResponse)
                .toList();
    }

    // Remove a link between two tickets
    public void unlinkTickets(UUID ticketAId, UUID ticketBId, User user) {
        Ticket ticketA = ticketRepo.findById(ticketAId)
                .orElseThrow(() -> new NotFoundException("Ticket", ticketAId));
        Ticket ticketB = ticketRepo.findById(ticketBId)
                .orElseThrow(() -> new NotFoundException("Ticket", ticketBId));

        assertCanView(ticketA, user);
        assertCanView(ticketB, user);

        linkRepo.findByTicketId(ticketAId)
                .stream()
                .filter(link ->
                    link.getTicketA().getId().equals(ticketBId) ||
                    link.getTicketB().getId().equals(ticketBId))
                .findFirst()
                .ifPresent(linkRepo::delete);
    }

    // Resolve all linked tickets when one is resolved
    // Agent resolves one ticket → all linked ones auto-resolve
    // and their users get notified
    public void bulkResolveLinked(UUID resolvedTicketId, User agent) {
        Ticket resolvedTicket = ticketRepo.findById(resolvedTicketId)
                .orElseThrow(() -> new NotFoundException("Ticket", resolvedTicketId));

        getLinkedTickets(resolvedTicketId).forEach(linked -> {
            ticketRepo.findById(linked.getId()).ifPresent(ticket -> {
                if (ticket.getStatus() != TicketStatus.RESOLVED
                        && ticket.getStatus() != TicketStatus.CLOSED) {
                    
                    boolean isAdmin = agent.getRole() == Role.ADMIN;
                    boolean isAssignedToMe = ticket.getAssignedTo() != null 
                            && ticket.getAssignedTo().getId().equals(agent.getId());
                    boolean isUnassigned = ticket.getAssignedTo() == null;

                    if (isAdmin || isAssignedToMe || isUnassigned) {
                        ticket.setStatus(TicketStatus.RESOLVED);
                        ticket.setResolvedAt(LocalDateTime.now());
                        ticketRepo.save(ticket);
                        notificationService.notifyUserTicketResolved(ticket);

                        String noteMsg = String.format("System: Bulk resolved by Agent %s via link with parent case '%s'.", 
                                agent.getName(), resolvedTicket.getTitle());
                        replyService.addInternalNote(ticket, agent, noteMsg);
                    } else {
                        String noteMsg = String.format("System: Linked case '%s' was resolved by Agent %s. Assigned agent %s should review and resolve this duplicate case.",
                                resolvedTicket.getTitle(), agent.getName(), ticket.getAssignedTo().getName());
                        replyService.addInternalNote(ticket, agent, noteMsg);

                        notificationService.notifyAgentDuplicateResolved(ticket, resolvedTicket, agent);
                    }
                }
            });
        });
    }
}
