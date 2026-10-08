package com.helpdesk.helpdesk_backend.SERVICE;

import com.helpdesk.helpdesk_backend.DTO.REQUEST.CreateAgentRequest;
import com.helpdesk.helpdesk_backend.DTO.REQUEST.UpdateAgentAvailabilityRequest;
import com.helpdesk.helpdesk_backend.DTO.REQUEST.UpdateProfileRequest;
import com.helpdesk.helpdesk_backend.DTO.REQUEST.UpdateUserRoleRequest;
import com.helpdesk.helpdesk_backend.DTO.RESPONSE.UserResponse;
import com.helpdesk.helpdesk_backend.ENTITY.Category;
import com.helpdesk.helpdesk_backend.ENTITY.User;
import com.helpdesk.helpdesk_backend.ENUM.AgentAvailabilityStatus;
import com.helpdesk.helpdesk_backend.ENUM.Role;
import com.helpdesk.helpdesk_backend.ENUM.TicketStatus;
import com.helpdesk.helpdesk_backend.EXCEPTION.BadRequestException;
import com.helpdesk.helpdesk_backend.EXCEPTION.ConflictException;
import com.helpdesk.helpdesk_backend.EXCEPTION.NotFoundException;
import com.helpdesk.helpdesk_backend.REPOSITORY.CategoryRepository;
import com.helpdesk.helpdesk_backend.REPOSITORY.ReplyRepository;
import com.helpdesk.helpdesk_backend.REPOSITORY.TicketRepository;
import com.helpdesk.helpdesk_backend.REPOSITORY.UserRepository;
import com.helpdesk.helpdesk_backend.UTIL.UserMapper;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AdminUserService {

    private final UserRepository     userRepo;
    private final CategoryRepository categoryRepo;
    private final TicketRepository   ticketRepo;
    private final ReplyRepository    replyRepo;
    private final PasswordEncoder    passwordEncoder;
    private final UserMapper         userMapper;
    private final SimpMessagingTemplate messagingTemplate;
    private final NotificationService notificationService;
    private final TicketTimelineService timelineService;

    // ── LIST USERS ───────────────────────────────────────────────

    // All users paginated with optional search
    public Page<UserResponse> getAllUsers(String search, Pageable pageable) {
        if (search != null && !search.isBlank()) {
            return userRepo.searchByNameOrEmail(search, pageable)
                    .map(userMapper::toResponse);
        }
        return userRepo.findAll(pageable).map(userMapper::toResponse);
    }

    // All users filtered by role
    public Page<UserResponse> getUsersByRole(Role role, Pageable pageable) {
        return userRepo.findByRole(role, pageable).map(userMapper::toResponse);
    }

    // All active agents with their live stats
    public List<UserResponse> getAllAgents() {
        return userRepo.findByRoleAndIsActiveTrue(Role.AGENT)
                .stream()
                .map(userMapper::toAgentResponse)
                .toList();
    }

    // Single user detail
    @Transactional(readOnly = true)
    public UserResponse getUserById(UUID id) {
        User user = findOrThrow(id);
        return user.getRole() == Role.AGENT
                ? userMapper.toAgentResponse(user)
                : userMapper.toResponse(user);
    }

    // ── CREATE AGENT ─────────────────────────────────────────────
    // Admin creates agent accounts directly
    // Agents don't self-register — admin provisions them

    public UserResponse createAgent(CreateAgentRequest req) {
        if (userRepo.existsByEmail(req.getEmail()))
            throw new ConflictException("Email already in use");

        Category category = null;
        if (req.getCategoryId() != null) {
            category = categoryRepo.findById(req.getCategoryId())
                    .orElseThrow(() -> new NotFoundException("Category", req.getCategoryId()));
        }

        User agent = User.builder()
            .name(req.getName())
            .email(req.getEmail())
            .password(passwordEncoder.encode(req.getPassword()))
            .role(Role.AGENT)
            .category(category)
            .isActive(true)
            .build();

        return userMapper.toResponse(userRepo.save(agent));
    }

    // ── ROLE MANAGEMENT ──────────────────────────────────────────

    public UserResponse updateUserRole(UUID userId, UpdateUserRoleRequest req) {
        User user = findOrThrow(userId);

        // Prevent admin from demoting themselves
        if (user.getRole() == Role.ADMIN && req.getRole() != Role.ADMIN)
            throw new BadRequestException("Cannot demote an admin account");

        // If promoting to AGENT, category is required
        if (req.getRole() == Role.AGENT && req.getCategoryId() == null)
            throw new BadRequestException("Category is required when assigning agent role");

        userRepo.updateRole(userId, req.getRole());

        // Assign category if becoming an agent
        if (req.getRole() == Role.AGENT) {
            categoryRepo.findById(req.getCategoryId())
                    .orElseThrow(() -> new NotFoundException("Category", req.getCategoryId()));
            userRepo.updateAgentCategory(userId, req.getCategoryId());
        }

        // If demoting from agent → clear their category
        if (req.getRole() == Role.USER) {
            userRepo.updateAgentCategory(userId, null);
        }

        return userMapper.toResponse(findOrThrow(userId));
    }

    // ── CATEGORY ASSIGNMENT ──────────────────────────────────────

    public UserResponse assignAgentCategory(UUID agentId, UUID categoryId) {
        User agent = findOrThrow(agentId);

        if (agent.getRole() != Role.AGENT)
            throw new BadRequestException("User is not an agent");

        if (categoryId != null) {
            categoryRepo.findById(categoryId)
                .orElseThrow(() -> new NotFoundException("Category", categoryId));
        }

        userRepo.updateAgentCategory(agentId, categoryId);

        return userMapper.toAgentResponse(findOrThrow(agentId));
    }

    // ── ACTIVATE / DEACTIVATE ────────────────────────────────────

    public UserResponse deactivateUser(UUID userId) {
        User user = findOrThrow(userId);

        if (user.getRole() == Role.ADMIN)
            throw new BadRequestException("Cannot deactivate an admin account");

        // Reassign open tickets before deactivating agent
        if (user.getRole() == Role.AGENT) {
            reassignOpenTickets(user);
        }

        if (user.getRole() == Role.AGENT) {
            userRepo.updateAvailability(userId, AgentAvailabilityStatus.OFFLINE, "Account deactivated");
        }
        userRepo.updateActiveStatus(userId, false);
        return userMapper.toResponse(findOrThrow(userId));
    }

    public UserResponse activateUser(UUID userId) {
        User user = findOrThrow(userId);
        userRepo.updateActiveStatus(userId, true);
        if (user.getRole() == Role.AGENT) {
            userRepo.updateAvailability(userId, AgentAvailabilityStatus.ONLINE, null);
        }
        return userMapper.toResponse(findOrThrow(userId));
    }

    @Transactional
    public UserResponse updateAgentAvailability(UUID agentId, UpdateAgentAvailabilityRequest req) {
        User agent = findOrThrow(agentId);
        if (agent.getRole() != Role.AGENT)
            throw new BadRequestException("User is not an agent");
        if (!agent.isActive())
            throw new BadRequestException("Cannot update availability for an inactive agent");

        String reason = req.getReason() != null && !req.getReason().isBlank()
                ? req.getReason().trim()
                : null;
        userRepo.updateAvailability(agentId, req.getStatus(), reason);
        return userMapper.toAgentResponse(findOrThrow(agentId));
    }

    // ── AGENT WORKLOAD ───────────────────────────────────────────

    // Shows how many open tickets each agent has
    // Used by admin to manually balance workload
    public List<Map<String, Object>> getAgentWorkload() {
        return userRepo.findByRoleAndIsActiveTrue(Role.AGENT)
                .stream()
                .map(agent -> {
                    long open = ticketRepo.countByAssignedToAndStatus(
                                    agent, TicketStatus.OPEN)
                              + ticketRepo.countByAssignedToAndStatus(
                                    agent, TicketStatus.IN_PROGRESS);
                    Map<String, Object> workload = new HashMap<>();
                    workload.put("agentId", agent.getId());
                    workload.put("name", agent.getName());
                    workload.put("agentName", agent.getName());
                    workload.put("category", agent.getCategory() != null
                            ? agent.getCategory().getName()
                            : "Unassigned");
                    workload.put("openTickets", open);
                    return workload;
                })
                .sorted(Comparator.comparingLong(
                        m -> (Long) m.get("openTickets")))
                .toList();
    }

    // ── AGENT STATS (richer) ─────────────────────────────────────

    // Full per-agent stats for the Agent Management tab
    public List<Map<String, Object>> getAgentStats() {
        return userRepo.findByRole(Role.AGENT)
                .stream()
                .map(agent -> {
                    long open     = ticketRepo.countByAssignedToAndStatus(agent, TicketStatus.OPEN);
                    long progress = ticketRepo.countByAssignedToAndStatus(agent, TicketStatus.IN_PROGRESS);
                    long resolved = ticketRepo.countByAssignedToAndStatus(agent, TicketStatus.RESOLVED);
                    long total    = ticketRepo.countByAssignedTo(agent);
                    long replies  = replyRepo.countBySenderAndIsInternalFalse(agent);
                    String lastActivity = replyRepo.findTopBySenderOrderByCreatedAtDesc(agent)
                            .map(r -> r.getCreatedAt().toString())
                            .orElse(null);

                    Map<String, Object> stats = new HashMap<>();
                    stats.put("agentId",      agent.getId());
                    stats.put("name",         agent.getName());
                    stats.put("email",        agent.getEmail());
                    stats.put("isActive",     agent.isActive());
                    stats.put("availabilityStatus", agent.getAvailabilityStatus() != null
                            ? agent.getAvailabilityStatus().name() : null);
                    stats.put("availabilityUpdatedAt", agent.getAvailabilityUpdatedAt() != null
                            ? agent.getAvailabilityUpdatedAt().toString() : null);
                    stats.put("availabilityReason", agent.getAvailabilityReason());
                    stats.put("maxActiveTickets", agent.getMaxActiveTickets());
                    stats.put("assignable", agent.isActive()
                            && agent.getAvailabilityStatus() != null
                            && agent.getAvailabilityStatus().isAssignable()
                            && (open + progress) < (agent.getMaxActiveTickets() != null
                                    ? agent.getMaxActiveTickets() : 10));
                    stats.put("category",     agent.getCategory() != null
                            ? agent.getCategory().getName() : null);
                    stats.put("openTickets",  open);
                    stats.put("inProgressTickets", progress);
                    stats.put("resolvedTickets",   resolved);
                    stats.put("totalTickets", total);
                    stats.put("replyCount",   replies);
                    stats.put("lastActivity", lastActivity);
                    return stats;
                })
                .sorted(Comparator.comparingLong(
                        m -> -((Long) m.get("openTickets"))))
                .toList();
    }

    // ── TICKET ASSIGNMENT ────────────────────────────────────────

    // Admin assigns a ticket to a specific agent
    // Admin assigns a ticket to a specific agent
    public void assignTicketToAgent(UUID ticketId, UUID agentId) {
        com.helpdesk.helpdesk_backend.ENTITY.Ticket ticket = ticketRepo.findById(ticketId)
                .orElseThrow(() -> new NotFoundException("Ticket", ticketId));
        User agent = findOrThrow(agentId);
        if (agent.getRole() != Role.AGENT && agent.getRole() != Role.ADMIN)
            throw new BadRequestException("Target user is not an agent");
        if (agent.getRole() == Role.AGENT && !isAgentAssignable(agent))
            throw new BadRequestException("Agent is not available for new assignments");

        // Remember previous assignee so we can notify them
        User previousAssignee = ticket.getAssignedTo();

        ticket.setAssignedTo(agent);
        if (ticket.getStatus() == TicketStatus.OPEN)
            ticket.setStatus(TicketStatus.IN_PROGRESS);
        ticketRepo.save(ticket);

        // Record timeline events
        if (previousAssignee == null) {
            boolean late = timelineService.isLateAssigned(ticket);
            timelineService.recordAssigned(ticket, agent, late);
        } else if (!previousAssignee.getId().equals(agent.getId())) {
            timelineService.recordTransferred(ticket, previousAssignee, agent, "Reassigned by Administrator");
            boolean late = timelineService.isLateAssigned(ticket);
            timelineService.recordAssigned(ticket, agent, late);
        }

        // Notify the old agent via WebSocket so their queue updates immediately
        if (previousAssignee != null && !previousAssignee.getId().equals(agent.getId())) {
            // Push to the ticket topic — the old agent is subscribed, so reloadTicket fires
            Map<String, Object> reassignEvent = new HashMap<>();
            reassignEvent.put("type", "TICKET_REASSIGNED");
            reassignEvent.put("ticketId", ticketId.toString());
            reassignEvent.put("newAssigneeId", agent.getId().toString());
            reassignEvent.put("newAssigneeName", agent.getName());
            messagingTemplate.convertAndSend("/topic/ticket/" + ticketId, reassignEvent);
        }

        // Notify the new agent they've received a ticket
        notificationService.notifyAgentTicketAssigned(ticket);
    }

    // Admin bulk assigns tickets to a specific agent
    @org.springframework.transaction.annotation.Transactional
    public void bulkAssignTicketsToAgent(List<UUID> ticketIds, UUID agentId) {
        if (ticketIds == null || ticketIds.isEmpty()) return;
        User agent = findOrThrow(agentId);
        if (agent.getRole() != Role.AGENT && agent.getRole() != Role.ADMIN)
            throw new BadRequestException("Target user is not an agent");
        if (agent.getRole() == Role.AGENT && !isAgentAssignable(agent))
            throw new BadRequestException("Agent is not available for new assignments");

        for (UUID ticketId : ticketIds) {
            com.helpdesk.helpdesk_backend.ENTITY.Ticket ticket = ticketRepo.findById(ticketId)
                    .orElseThrow(() -> new NotFoundException("Ticket", ticketId));
            User previousAssignee = ticket.getAssignedTo();
            ticket.setAssignedTo(agent);
            if (ticket.getStatus() == TicketStatus.OPEN)
                ticket.setStatus(TicketStatus.IN_PROGRESS);
            ticketRepo.save(ticket);

            // Record timeline events
            if (previousAssignee == null) {
                boolean late = timelineService.isLateAssigned(ticket);
                timelineService.recordAssigned(ticket, agent, late);
            } else if (!previousAssignee.getId().equals(agent.getId())) {
                timelineService.recordTransferred(ticket, previousAssignee, agent, "Bulk reassigned by Administrator");
                boolean late = timelineService.isLateAssigned(ticket);
                timelineService.recordAssigned(ticket, agent, late);
            }
        }
    }

    // ── PROFILE UPDATE (self-service for any logged-in user) ─────

    public UserResponse updateProfile(UUID userId, UpdateProfileRequest req) {
        User user = findOrThrow(userId);

        if (req.getName() != null)
            user.setName(req.getName());

        if (req.getEmail() != null) {
            if (userRepo.existsByEmailAndIdNot(req.getEmail(), userId))
                throw new ConflictException("Email already in use");
            user.setEmail(req.getEmail());
        }

        if (req.getPassword() != null) {
            user.setPassword(passwordEncoder.encode(req.getPassword()));
        }

        return userMapper.toResponse(userRepo.save(user));
    }

    // ── PRIVATE HELPERS ──────────────────────────────────────────

    private User findOrThrow(UUID id) {
        return userRepo.findById(id)
                .orElseThrow(() -> new NotFoundException("User", id));
    }

    private boolean isAgentAssignable(User agent) {
        long activeTickets = ticketRepo.countByAssignedToAndStatus(agent, TicketStatus.OPEN)
                + ticketRepo.countByAssignedToAndStatus(agent, TicketStatus.IN_PROGRESS);
        int maxActiveTickets = agent.getMaxActiveTickets() != null ? agent.getMaxActiveTickets() : 10;
        return agent.isActive()
                && agent.getAvailabilityStatus() != null
                && agent.getAvailabilityStatus().isAssignable()
                && activeTickets < maxActiveTickets;
    }

    // When deactivating an agent, move their open tickets
    // back to unassigned so admin can reassign manually
    private void reassignOpenTickets(User agent) {
        ticketRepo.findByAssignedTo(agent,
                PageRequest.of(0, 1000)).forEach(ticket -> {
            if (ticket.getStatus() == TicketStatus.OPEN
                    || ticket.getStatus() == TicketStatus.IN_PROGRESS) {
                ticket.setAssignedTo(null);
                ticketRepo.save(ticket);
            }
        });
    }
}
