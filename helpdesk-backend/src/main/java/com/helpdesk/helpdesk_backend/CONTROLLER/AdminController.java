package com.helpdesk.helpdesk_backend.CONTROLLER;

import com.helpdesk.helpdesk_backend.DTO.REQUEST.CreateAgentRequest;
import com.helpdesk.helpdesk_backend.DTO.REQUEST.CreateCategoryRequest;
import com.helpdesk.helpdesk_backend.DTO.REQUEST.UpdateUserRoleRequest;
import com.helpdesk.helpdesk_backend.DTO.REQUEST.UpdateAgentAvailabilityRequest;
import com.helpdesk.helpdesk_backend.DTO.REQUEST.UpdateEmailTemplateRequest;
import com.helpdesk.helpdesk_backend.DTO.RESPONSE.UserResponse;
import com.helpdesk.helpdesk_backend.DTO.RESPONSE.EmailTemplateResponse;
import com.helpdesk.helpdesk_backend.ENTITY.Category;
import com.helpdesk.helpdesk_backend.ENUM.EmailTemplateType;
import com.helpdesk.helpdesk_backend.ENUM.Role;
import com.helpdesk.helpdesk_backend.REPOSITORY.CategoryRepository;
import com.helpdesk.helpdesk_backend.SERVICE.EmailTemplateService;
import com.helpdesk.helpdesk_backend.REPOSITORY.KnowledgeRepository;
import com.helpdesk.helpdesk_backend.REPOSITORY.TicketRepository;
import com.helpdesk.helpdesk_backend.REPOSITORY.UserRepository;
import com.helpdesk.helpdesk_backend.SERVICE.AdminUserService;
import com.helpdesk.helpdesk_backend.UTIL.TicketMapper;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import com.helpdesk.helpdesk_backend.SERVICE.SLAService;
import com.helpdesk.helpdesk_backend.DTO.REQUEST.UpdateSlaRequest;
import com.helpdesk.helpdesk_backend.ENTITY.SlaRule;

import com.helpdesk.helpdesk_backend.SERVICE.ActivityService;
import com.helpdesk.helpdesk_backend.DTO.RESPONSE.ActivityEvent;
import com.helpdesk.helpdesk_backend.SERVICE.ReassignmentRequestService;
import com.helpdesk.helpdesk_backend.DTO.RESPONSE.ReassignRequestResponse;
import com.helpdesk.helpdesk_backend.DTO.RESPONSE.AgentMetricsResponse;
import com.helpdesk.helpdesk_backend.DTO.RESPONSE.UserMetricsResponse;
import com.helpdesk.helpdesk_backend.DTO.RESPONSE.TimelineEventResponse;
import com.helpdesk.helpdesk_backend.ENTITY.Ticket;
import com.helpdesk.helpdesk_backend.ENTITY.TicketTimeline;
import com.helpdesk.helpdesk_backend.ENTITY.User;
import com.helpdesk.helpdesk_backend.ENUM.Priority;
import com.helpdesk.helpdesk_backend.ENUM.TimelineEventType;
import com.helpdesk.helpdesk_backend.EXCEPTION.NotFoundException;
import com.helpdesk.helpdesk_backend.REPOSITORY.TicketTimelineRepository;
import com.helpdesk.helpdesk_backend.SERVICE.FairPerformanceService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.core.Authentication;

import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final AdminUserService   adminUserService;
    private final EmailTemplateService emailTemplateService;
    private final CategoryRepository categoryRepo;
    private final TicketRepository   ticketRepo;
    private final UserRepository     userRepo;
    private final KnowledgeRepository knowledgeRepo;
    private final TicketMapper        ticketMapper;
    private final SLAService          slaService;
    private final ActivityService     activityService;
    private final ReassignmentRequestService reassignmentRequestService;
    private final FairPerformanceService     performanceService;
    private final TicketTimelineRepository   timelineRepo;

    private User currentUser(Authentication auth) {
        return (User) auth.getPrincipal();
    }

    // ── USER LISTING ───────────────────────────────────────────

    // All users with optional search + role filter
    @GetMapping("/users")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Page<UserResponse>> getAllUsers(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Role   role,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "20") int size) {

        Pageable pageable = PageRequest.of(page, size,
                Sort.by("name").ascending());

        if (role != null)
            return ResponseEntity.ok(
                    adminUserService.getUsersByRole(role, pageable));

        return ResponseEntity.ok(
                adminUserService.getAllUsers(search, pageable));
    }

    // All agents with live stats
    @GetMapping("/agents")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<UserResponse>> getAllAgents() {
        return ResponseEntity.ok(adminUserService.getAllAgents());
    }

    // Single user detail
    @GetMapping("/users/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<UserResponse> getUserById(@PathVariable UUID id) {
        return ResponseEntity.ok(adminUserService.getUserById(id));
    }

    // Agent workload overview
    @GetMapping("/agents/workload")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<Map<String, Object>>> getWorkload() {
        return ResponseEntity.ok(adminUserService.getAgentWorkload());
    }

    // Full agent stats for Agent Management tab (includes reply count, last activity)
    @GetMapping("/agents/stats")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<Map<String, Object>>> getAgentStats() {
        return ResponseEntity.ok(adminUserService.getAgentStats());
    }

    // Tickets assigned to a specific agent
    @GetMapping("/agents/{agentId}/tickets")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<org.springframework.data.domain.Page<com.helpdesk.helpdesk_backend.DTO.RESPONSE.TicketResponse>> getAgentTickets(
            @PathVariable UUID agentId,
            @RequestParam(required = false) com.helpdesk.helpdesk_backend.ENUM.TicketStatus status,
            @RequestParam(required = false) com.helpdesk.helpdesk_backend.ENUM.Priority priority,
            @RequestParam(required = false) UUID categoryId,
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "0")   int page,
            @RequestParam(defaultValue = "50")  int size) {

        com.helpdesk.helpdesk_backend.ENTITY.User agent = userRepo.findById(agentId)
                .orElseThrow(() -> new RuntimeException("Agent not found"));

        org.springframework.data.domain.Pageable pageable =
                org.springframework.data.domain.PageRequest.of(page, size,
                        Sort.by("createdAt").descending());

        org.springframework.data.domain.Page<com.helpdesk.helpdesk_backend.ENTITY.Ticket> tickets =
                ticketRepo.filterAssignedTickets(agent, status, priority, categoryId,
                        q == null || q.isBlank() ? null : q.trim(), pageable);

        return ResponseEntity.ok(tickets.map(ticketMapper::toResponse));
    }

    // Unassigned tickets (admin can pick and assign)
    @GetMapping("/tickets/unassigned")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<org.springframework.data.domain.Page<com.helpdesk.helpdesk_backend.DTO.RESPONSE.TicketResponse>> getUnassignedTickets(
            @RequestParam(required = false) com.helpdesk.helpdesk_backend.ENUM.TicketStatus status,
            @RequestParam(required = false) com.helpdesk.helpdesk_backend.ENUM.Priority priority,
            @RequestParam(required = false) UUID categoryId,
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "0")   int page,
            @RequestParam(defaultValue = "50")  int size) {

        org.springframework.data.domain.Pageable pageable =
                org.springframework.data.domain.PageRequest.of(page, size,
                        Sort.by("createdAt").ascending());

        org.springframework.data.domain.Page<com.helpdesk.helpdesk_backend.ENTITY.Ticket> tickets =
                ticketRepo.filterUnassignedTickets(status, priority, categoryId,
                        q == null || q.isBlank() ? null : q.trim(), pageable);

        return ResponseEntity.ok(tickets.map(ticketMapper::toResponse));
    }

    // Assign a ticket to an agent
    @PatchMapping("/tickets/{ticketId}/assign/{agentId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> assignTicket(
            @PathVariable UUID ticketId,
            @PathVariable UUID agentId) {
        adminUserService.assignTicketToAgent(ticketId, agentId);
        return ResponseEntity.ok().build();
    }

    // Bulk assign tickets to an agent
    @PatchMapping("/tickets/bulk-assign")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> bulkAssignTickets(
            @RequestBody com.helpdesk.helpdesk_backend.DTO.REQUEST.BulkAssignRequest req) {
        adminUserService.bulkAssignTicketsToAgent(req.getTicketIds(), req.getAssignedToId());
        return ResponseEntity.ok().build();
    }

    // ── AGENT CREATION ───────────────────────────────────────────

    @PostMapping("/agents")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<UserResponse> createAgent(
            @Valid @RequestBody CreateAgentRequest req) {
        return ResponseEntity.status(201)
                .body(adminUserService.createAgent(req));
    }

    // ── ROLE MANAGEMENT ──────────────────────────────────────────

    @PatchMapping("/users/{id}/role")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<UserResponse> updateRole(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateUserRoleRequest req) {
        return ResponseEntity.ok(adminUserService.updateUserRole(id, req));
    }

    // ── CATEGORY ASSIGNMENT ──────────────────────────────────────

    @PatchMapping("/agents/{id}/category")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<UserResponse> assignCategory(
            @PathVariable UUID id,
            @RequestParam(required = false) UUID categoryId) {
        return ResponseEntity.ok(
                adminUserService.assignAgentCategory(id, categoryId));
    }

    @PatchMapping("/agents/{id}/availability")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<UserResponse> updateAgentAvailability(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateAgentAvailabilityRequest req) {
        return ResponseEntity.ok(
                adminUserService.updateAgentAvailability(id, req));
    }

    // ── ACTIVATE / DEACTIVATE ────────────────────────────────────

    @PatchMapping("/users/{id}/deactivate")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<UserResponse> deactivate(@PathVariable UUID id) {
        return ResponseEntity.ok(adminUserService.deactivateUser(id));
    }

    @PatchMapping("/users/{id}/activate")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<UserResponse> activate(@PathVariable UUID id) {
        return ResponseEntity.ok(adminUserService.activateUser(id));
    }

    // ── CATEGORY MANAGEMENT (already designed, now complete) ─────

    @GetMapping("/categories")
    @PreAuthorize("hasAnyRole('USER', 'AGENT', 'ADMIN')")
    public ResponseEntity<List<Category>> getCategories() {
        return ResponseEntity.ok(categoryRepo.findAllByOrderByNameAsc());
    }

    @PostMapping("/categories")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Category> createCategory(
            @Valid @RequestBody CreateCategoryRequest req) {
        String name = req.getName().trim();
        if (categoryRepo.existsByNameIgnoreCase(name))
            throw new RuntimeException("Category already exists");
        return ResponseEntity.status(201).body(
                categoryRepo.save(Category.builder()
                        .name(name)
                        .description(req.getDescription())
                        .build()));
    }

    @PatchMapping("/categories/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Category> updateCategory(
            @PathVariable UUID id,
            @Valid @RequestBody CreateCategoryRequest req) {
        Category cat = categoryRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Category not found"));
        String name = req.getName().trim();
        if (categoryRepo.existsByNameIgnoreCaseAndIdNot(name, id))
            throw new RuntimeException("Category already exists");
        cat.setName(name);
        cat.setDescription(req.getDescription());
        return ResponseEntity.ok(categoryRepo.save(cat));
    }

    @DeleteMapping("/categories/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteCategory(@PathVariable UUID id) {
        Category cat = categoryRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Category not found"));
        if (ticketRepo.existsByCategory(cat)
                || userRepo.existsByCategory(cat)
                || knowledgeRepo.existsByCategory(cat)) {
            throw new RuntimeException("Cannot delete category while it is in use");
        }
        categoryRepo.delete(cat);
        return ResponseEntity.noContent().build();
    }

    // ── EMAIL TEMPLATE MANAGEMENT ──────────────────────────────

    @GetMapping("/email-templates")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<EmailTemplateResponse>> getEmailTemplates() {
        return ResponseEntity.ok(emailTemplateService.getAllTemplates());
    }

    @PutMapping("/email-templates/{type}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<EmailTemplateResponse> updateEmailTemplate(
            @PathVariable EmailTemplateType type,
            @Valid @RequestBody UpdateEmailTemplateRequest req) {
        return ResponseEntity.ok(emailTemplateService.updateTemplate(type, req));
    }

    // ── SLA MANAGEMENT ──────────────────────────────────────────

    @GetMapping("/sla")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<SlaRule>> getSlaRules() {
        return ResponseEntity.ok(slaService.getAllRules());
    }

    @PatchMapping("/sla")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<SlaRule> updateSlaRule(@Valid @RequestBody UpdateSlaRequest req) {
        return ResponseEntity.ok(slaService.updateRule(req));
    }

    @GetMapping("/activity")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<ActivityEvent>> getRecentActivity() {
        return ResponseEntity.ok(activityService.getRecentActivities());
    }

    @GetMapping("/reassign-requests")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<ReassignRequestResponse>> getPendingReassignRequests() {
        return ResponseEntity.ok(reassignmentRequestService.getPendingRequests());
    }

    @PatchMapping("/reassign-requests/{requestId}/resolve")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> resolveReassignRequest(
            @PathVariable UUID requestId,
            @RequestParam boolean approve,
            Authentication auth) {
        reassignmentRequestService.resolveRequest(requestId, approve, currentUser(auth));
        return ResponseEntity.ok().build();
    }

    // ── TICKET TIMELINE LOG ──────────────────────────────────────────────

    @GetMapping("/logs/timeline")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Page<TimelineEventResponse>> getTimeline(
            @RequestParam(required = false) UUID ticketId,
            @RequestParam(required = false) UUID actorId,
            @RequestParam(required = false) TimelineEventType eventType,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "20") int size) {

        LocalDateTime fromDate = from != null ? from : LocalDateTime.now().minusDays(7);
        LocalDateTime toDate   = to   != null ? to   : LocalDateTime.now();
        Pageable pageable = PageRequest.of(page, size);

        Page<TicketTimeline> results = timelineRepo.findWithFilters(
                ticketId, actorId, eventType, fromDate, toDate, pageable);

        return ResponseEntity.ok(results.map(this::toEventResponse));
    }

    @GetMapping("/logs/timeline/{ticketId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<TimelineEventResponse>> getTicketTimeline(
            @PathVariable UUID ticketId) {
        List<TicketTimeline> events = timelineRepo.findByTicketIdOrderByOccurredAtAsc(ticketId);
        return ResponseEntity.ok(events.stream().map(this::toEventResponse).toList());
    }

    // ── SLA BREACH LOG ───────────────────────────────────────────────────

    @GetMapping("/logs/breaches")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Page<TimelineEventResponse>> getBreachLog(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to,
            @RequestParam(required = false) Priority priority,
            @RequestParam(required = false) UUID agentId,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "20") int size) {

        LocalDateTime fromDate = from != null ? from : LocalDateTime.now().minusDays(30);
        LocalDateTime toDate   = to   != null ? to   : LocalDateTime.now();
        Pageable pageable = PageRequest.of(page, size);

        Page<TicketTimeline> breaches = timelineRepo.findBreaches(agentId, priority, fromDate, toDate, pageable);

        return ResponseEntity.ok(breaches.map(evt -> {
            TimelineEventResponse resp = toEventResponse(evt);
            // Determine fault type: SYSTEM if ticket also has LATE_ASSIGNED
            boolean lateAssigned = timelineRepo.existsByTicketAndEventType(
                    evt.getTicket(), com.helpdesk.helpdesk_backend.ENUM.TimelineEventType.LATE_ASSIGNED);
            resp.setFaultType(lateAssigned ? "SYSTEM" : "AGENT");
            return resp;
        }));
    }

    // ── TRANSFER LOG ─────────────────────────────────────────────────────

    @GetMapping("/logs/transfers")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Page<TimelineEventResponse>> getTransferLog(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to,
            @RequestParam(required = false) UUID fromAgentId,
            @RequestParam(required = false) UUID toAgentId,
            @RequestParam(required = false) UUID categoryId,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "20") int size) {

        LocalDateTime fromDate = from != null ? from : LocalDateTime.now().minusDays(30);
        LocalDateTime toDate   = to   != null ? to   : LocalDateTime.now();
        Pageable pageable = PageRequest.of(page, size);

        Page<TicketTimeline> transfers = timelineRepo.findTransfers(fromAgentId, categoryId, fromDate, toDate, pageable);

        return ResponseEntity.ok(transfers.map(evt -> {
            TimelineEventResponse resp = toEventResponse(evt);
            // Compute SLA status at time of transfer
            Ticket ticket = evt.getTicket();
            java.util.Map<String, Object> slaStatus = slaService.getTicketSLAStatus(ticket);
            resp.setSlaStatusAtTransfer((String) slaStatus.get("status"));
            resp.setPriority(ticket.getPriority() != null ? ticket.getPriority().name() : null);
            return resp;
        }));
    }

    // ── AGENT PERFORMANCE ────────────────────────────────────────────────

    @GetMapping("/performance/agents")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<AgentMetricsResponse>> getAllAgentMetrics(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to) {

        LocalDateTime fromDate = from != null ? from : LocalDateTime.now().minusDays(30);
        LocalDateTime toDate   = to   != null ? to   : LocalDateTime.now();
        return ResponseEntity.ok(performanceService.getAllAgentMetrics(fromDate, toDate));
    }

    @GetMapping("/performance/agents/{agentId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<AgentMetricsResponse> getAgentMetrics(
            @PathVariable UUID agentId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to) {

        LocalDateTime fromDate = from != null ? from : LocalDateTime.now().minusDays(30);
        LocalDateTime toDate   = to   != null ? to   : LocalDateTime.now();
        return ResponseEntity.ok(performanceService.getAgentMetrics(agentId, fromDate, toDate));
    }

    // ── USER PERFORMANCE ─────────────────────────────────────────────────

    @GetMapping("/performance/users")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Page<UserMetricsResponse>> getAllUserMetrics(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "20") int size) {

        LocalDateTime fromDate = from != null ? from : LocalDateTime.now().minusDays(30);
        LocalDateTime toDate   = to   != null ? to   : LocalDateTime.now();
        return ResponseEntity.ok(performanceService.getAllUserMetrics(fromDate, toDate, page, size));
    }

    @GetMapping("/performance/users/{userId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<UserMetricsResponse> getUserMetrics(
            @PathVariable UUID userId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to) {

        LocalDateTime fromDate = from != null ? from : LocalDateTime.now().minusDays(30);
        LocalDateTime toDate   = to   != null ? to   : LocalDateTime.now();
        return ResponseEntity.ok(performanceService.getUserMetrics(userId, fromDate, toDate));
    }

    // ── PRIVATE HELPERS ──────────────────────────────────────────────────

    private TimelineEventResponse toEventResponse(TicketTimeline e) {
        return TimelineEventResponse.builder()
                .id(e.getId())
                .ticketId(e.getTicket() != null ? e.getTicket().getId() : null)
                .ticketTitle(e.getTicket() != null ? e.getTicket().getTitle() : null)
                .ticketNumber(e.getTicket() != null ? e.getTicket().getTicketNumber() : null)
                .eventType(e.getEventType() != null ? e.getEventType().name() : null)
                .actorId(e.getActor() != null ? e.getActor().getId() : null)
                .actorName(e.getActor() != null ? e.getActor().getName() : null)
                .actorRole(e.getActorRole())
                .note(e.getNote())
                .occurredAt(e.getOccurredAt())
                .priority(e.getTicket() != null && e.getTicket().getPriority() != null
                        ? e.getTicket().getPriority().name() : null)
                .build();
    }
}
