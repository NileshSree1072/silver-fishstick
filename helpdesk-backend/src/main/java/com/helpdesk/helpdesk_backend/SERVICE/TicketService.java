package com.helpdesk.helpdesk_backend.SERVICE;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import org.springframework.stereotype.Service;

import com.helpdesk.helpdesk_backend.DTO.REQUEST.CreateTicketRequest;
import com.helpdesk.helpdesk_backend.DTO.REQUEST.UpdateTicketRequest;
import com.helpdesk.helpdesk_backend.DTO.RESPONSE.TicketResponse;
import com.helpdesk.helpdesk_backend.ENTITY.Category;
import com.helpdesk.helpdesk_backend.ENTITY.Ticket;
import com.helpdesk.helpdesk_backend.ENTITY.User;
import com.helpdesk.helpdesk_backend.ENUM.Priority;
import com.helpdesk.helpdesk_backend.ENUM.Role;
import com.helpdesk.helpdesk_backend.ENUM.TicketStatus;
import com.helpdesk.helpdesk_backend.EXCEPTION.NotFoundException;
import com.helpdesk.helpdesk_backend.EXCEPTION.UnauthorizedException;
import com.helpdesk.helpdesk_backend.REPOSITORY.CategoryRepository;
import com.helpdesk.helpdesk_backend.REPOSITORY.TicketRepository;
import com.helpdesk.helpdesk_backend.REPOSITORY.UserRepository;
import com.helpdesk.helpdesk_backend.UTIL.TicketMapper;

import lombok.RequiredArgsConstructor;
import java.util.Objects;

import com.helpdesk.helpdesk_backend.SERVICE.ActivityService;
import com.helpdesk.helpdesk_backend.SERVICE.TicketTimelineService;

@Service
@RequiredArgsConstructor
public class TicketService {
    private static final DateTimeFormatter TICKET_DATE_FORMAT = DateTimeFormatter.ofPattern("yyyyMMdd");

    private final TicketRepository ticketRepo;
    private final UserRepository userRepo;
    private final CategoryRepository categoryRepo;
    private final AssignmentService assignmentService;
    private final NotificationService notificationService;
    private final TicketMapper mapper;
    private final AIService aiService;
    private final ActivityService activityService;
    private final TicketTimelineService timelineService;

    // ── CREATE ──────────────────────────────────────

    public TicketResponse createTicket(CreateTicketRequest req, User currentUser) {

        Category category = null;
        if (req.getCategoryId() != null) {
            category = categoryRepo.findById(Objects.requireNonNull(req.getCategoryId()))
                    .orElseThrow(() -> new NotFoundException("Category", req.getCategoryId()));
        }

        Ticket ticket = Ticket.builder()
                .ticketNumber(generateTicketNumber())
                .title(req.getTitle())
                .description(req.getDescription())
                .priority(req.getPriority() != null ? req.getPriority() : Priority.MEDIUM)
                .category(category)
                .createdBy(currentUser)
                .status(TicketStatus.OPEN)
                .build();

        ticketRepo.save(Objects.requireNonNull(ticket));
        activityService.ticketCreated(ticket);
        timelineService.recordCreated(ticket, currentUser);
        // Auto-assign to agent immediately
        assignmentService.autoAssign(ticket);
        if (ticket.getAssignedTo() != null) {
            notificationService.notifyAgentNewTicket(ticket);
        }

        // AI runs in background — if it resolves the ticket,
        // it updates status + notifies user via WebSocket
        aiService.processNewTicket(ticket);

        return mapper.toResponse(ticket);
    }

    // ── READ ────────────────────────────────────────

    // User: get their own tickets
    public Page<TicketResponse> getMyTickets(User user,
            TicketStatus status,
            Priority priority,
            UUID categoryId,
            String q,
            Pageable pageable) {
        Page<Ticket> page = ticketRepo.filterMyTickets(user, status, priority, categoryId, normalizeQuery(q), pageable);
        return page.map(mapper::toResponse);
    }

    // Agent: get assigned tickets
    public Page<TicketResponse> getAssignedTickets(User agent,
            TicketStatus status,
            Priority priority,
            UUID categoryId,
            String q,
            Pageable pageable) {
        Page<Ticket> page = ticketRepo.filterAssignedTickets(agent, status, priority, categoryId, normalizeQuery(q), pageable);
        return page.map(mapper::toResponse);
    }

    // Admin: get all tickets, Agent: get group tickets
    public Page<TicketResponse> getAllTickets(TicketStatus status,
            Priority priority,
            UUID categoryId,
            String q,
            Pageable pageable, User currentUser) {
        Page<Ticket> page;
        if (currentUser.getRole() == Role.AGENT) {
            page = ticketRepo.filterAgentCategoryTickets(currentUser.getCategory(), status, priority, categoryId, normalizeQuery(q), pageable);
        } else {
            page = ticketRepo.filterAllTickets(status, priority, categoryId, normalizeQuery(q), pageable);
        }
        return page.map(mapper::toResponse);
    }

    // Agent/Admin: search tickets by title or description
    public Page<TicketResponse> searchTickets(String q, Pageable pageable, User currentUser) {
        Page<Ticket> page;
        if (currentUser.getRole() == Role.AGENT) {
            page = ticketRepo.searchByAgentCategory(currentUser.getCategory(), q, pageable);
        } else {
            page = ticketRepo.searchAllTickets(q, pageable);
        }
        return page.map(mapper::toResponse);
    }

    // Any role: get one ticket by id
    public TicketResponse getTicketById(UUID id, User currentUser) {
        Ticket ticket = findTicketOrThrow(id);
        assertCanView(ticket, currentUser); // security check
        return mapper.toResponse(ticket);
    }

    // ── UPDATE ──────────────────────────────────────

    public TicketResponse updateTicket(UUID id,
            UpdateTicketRequest req,
            User currentUser) {
        Ticket ticket = findTicketOrThrow(id);
        assertCanView(ticket, currentUser); // security check

        TicketStatus previousStatus = ticket.getStatus();
        if (req.getStatus() != null) {
            ticket.setStatus(req.getStatus());
            if (req.getStatus() == TicketStatus.RESOLVED) {
                ticket.setResolvedAt(LocalDateTime.now());
                notificationService.notifyUserTicketResolved(ticket);
            }
            if (!req.getStatus().equals(previousStatus)) {
                timelineService.recordStatusChanged(ticket, currentUser, req.getStatus());
                if (req.getStatus() == TicketStatus.RESOLVED) {
                    timelineService.recordResolved(ticket, currentUser);
                }
            }
        }

        if (req.getPriority() != null) {
            ticket.setPriority(req.getPriority());
        }

        if (req.getAssignedToId() != null) {
            User agent = userRepo.findById(Objects.requireNonNull(req.getAssignedToId()))
                    .orElseThrow(() -> new NotFoundException("Agent", req.getAssignedToId()));
            User previousAssignee = ticket.getAssignedTo();
            ticket.setAssignedTo(agent);
            notificationService.notifyAgentNewTicket(ticket);

            if (previousAssignee == null) {
                boolean late = timelineService.isLateAssigned(ticket);
                timelineService.recordAssigned(ticket, agent, late);
            } else if (!previousAssignee.getId().equals(agent.getId())) {
                timelineService.recordTransferred(ticket, previousAssignee, agent, "Reassigned by " + currentUser.getName());
                boolean late = timelineService.isLateAssigned(ticket);
                timelineService.recordAssigned(ticket, agent, late);
            }
        }

        if (req.getCategoryId() != null) {
            Category cat = categoryRepo.findById(Objects.requireNonNull(req.getCategoryId()))
                    .orElseThrow(() -> new NotFoundException("Category", req.getCategoryId()));
            ticket.setCategory(cat);
        }

        boolean resolved = req.getStatus() == TicketStatus.RESOLVED;

        Ticket savedTicket = ticketRepo.save(ticket);
        if (resolved) {
            activityService.ticketResolved(savedTicket, currentUser.getName());
        }

        return mapper.toResponse(Objects.requireNonNull(savedTicket));
    }

    // USER: reopen a resolved/closed ticket
    public TicketResponse reopenTicket(UUID id, User currentUser) {
        Ticket ticket = findTicketOrThrow(id);

        if (!ticket.getCreatedBy().getId().equals(currentUser.getId()))
            throw new UnauthorizedException("You can only reopen your own tickets");

        ticket.setStatus(TicketStatus.OPEN);
        ticket.setResolvedAt(null);
        return mapper.toResponse(ticketRepo.save(ticket));
    }

    // USER: close a resolved/open ticket
    public TicketResponse closeTicket(UUID id, User currentUser) {
        Ticket ticket = findTicketOrThrow(id);

        if (!ticket.getCreatedBy().getId().equals(currentUser.getId()))
            throw new UnauthorizedException("You can only close your own tickets");

        ticket.setStatus(TicketStatus.CLOSED);
        if (ticket.getResolvedAt() == null) {
            ticket.setResolvedAt(LocalDateTime.now());
        }
        return mapper.toResponse(ticketRepo.save(ticket));
    }

    // ── HELPERS ─────────────────────────────────────

    private Ticket findTicketOrThrow(UUID id) {
        return ticketRepo.findById(Objects.requireNonNull(id))
                .orElseThrow(() -> new NotFoundException("Ticket", id));
    }

    private String generateTicketNumber() {
        long sequence = ticketRepo.nextTicketSequence();
        return "HD-" + LocalDateTime.now().format(TICKET_DATE_FORMAT) + "-" + String.format("%06d", sequence);
    }

    private String normalizeQuery(String q) {
        return q == null || q.isBlank() ? null : q.trim();
    }

    // Users can only see their own tickets
    // Agents can see tickets assigned to them
    // Admins can see everything
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
}
