package com.helpdesk.helpdesk_backend.SERVICE;

import static org.junit.jupiter.api.Assertions.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import com.helpdesk.helpdesk_backend.DTO.RESPONSE.AgentMetricsResponse;
import com.helpdesk.helpdesk_backend.DTO.RESPONSE.UserMetricsResponse;
import com.helpdesk.helpdesk_backend.ENTITY.Category;
import com.helpdesk.helpdesk_backend.ENTITY.Rating;
import com.helpdesk.helpdesk_backend.ENTITY.Ticket;
import com.helpdesk.helpdesk_backend.ENTITY.TicketTimeline;
import com.helpdesk.helpdesk_backend.ENTITY.User;
import com.helpdesk.helpdesk_backend.ENUM.Priority;
import com.helpdesk.helpdesk_backend.ENUM.Role;
import com.helpdesk.helpdesk_backend.ENUM.TicketStatus;
import com.helpdesk.helpdesk_backend.ENUM.TimelineEventType;
import com.helpdesk.helpdesk_backend.REPOSITORY.CategoryRepository;
import com.helpdesk.helpdesk_backend.REPOSITORY.RatingRepository;
import com.helpdesk.helpdesk_backend.REPOSITORY.TicketRepository;
import com.helpdesk.helpdesk_backend.REPOSITORY.TicketTimelineRepository;
import com.helpdesk.helpdesk_backend.REPOSITORY.UserRepository;

@SpringBootTest
@Transactional
public class FairPerformanceServiceTest {

    @Autowired
    private FairPerformanceService performanceService;

    @Autowired
    private UserRepository userRepo;

    @Autowired
    private CategoryRepository categoryRepo;

    @Autowired
    private TicketRepository ticketRepo;

    @Autowired
    private TicketTimelineRepository timelineRepo;

    @Autowired
    private RatingRepository ratingRepo;

    private User testUser;
    private User testAgent;
    private Category testCategory;
    private Ticket testTicket;

    @BeforeEach
    public void setUp() {
        // Create Category
        testCategory = categoryRepo.save(Category.builder()
                .name("Test Service Cat " + UUID.randomUUID())
                .description("Category for testing performance metrics")
                .build());

        // Create User (Customer)
        testUser = userRepo.save(User.builder()
                .name("Metric Test Customer")
                .email("metric_customer_" + UUID.randomUUID() + "@test.com")
                .password("password123")
                .role(Role.USER)
                .isActive(true)
                .build());

        // Create Agent
        testAgent = userRepo.save(User.builder()
                .name("Metric Test Agent")
                .email("metric_agent_" + UUID.randomUUID() + "@test.com")
                .password("password123")
                .role(Role.AGENT)
                .isActive(true)
                .category(testCategory)
                .build());

        // Create Ticket
        testTicket = ticketRepo.save(Ticket.builder()
                .ticketNumber("HD-TEST-" + UUID.randomUUID().toString().substring(0, 8))
                .title("Performance Test Ticket")
                .description("Description for checking performance metric calculation correctness. Needs to be long enough to test description features.")
                .status(TicketStatus.RESOLVED)
                .priority(Priority.HIGH)
                .category(testCategory)
                .createdBy(testUser)
                .assignedTo(testAgent)
                .resolvedAt(LocalDateTime.now().minusHours(1))
                .createdAt(LocalDateTime.now().minusHours(5))
                .updatedAt(LocalDateTime.now())
                .build());

        // Create Timeline Events
        timelineRepo.save(TicketTimeline.builder()
                .ticket(testTicket)
                .eventType(TimelineEventType.CREATED)
                .actor(testUser)
                .actorRole("USER")
                .note("Submitted")
                .occurredAt(LocalDateTime.now().minusHours(5))
                .build());

        timelineRepo.save(TicketTimeline.builder()
                .ticket(testTicket)
                .eventType(TimelineEventType.ASSIGNED)
                .actor(testAgent)
                .actorRole("AGENT")
                .note("Assigned to Agent")
                .occurredAt(LocalDateTime.now().minusHours(4))
                .build());

        timelineRepo.save(TicketTimeline.builder()
                .ticket(testTicket)
                .eventType(TimelineEventType.FIRST_REPLY)
                .actor(testAgent)
                .actorRole("AGENT")
                .note("First Reply")
                .occurredAt(LocalDateTime.now().minusHours(3))
                .build());

        timelineRepo.save(TicketTimeline.builder()
                .ticket(testTicket)
                .eventType(TimelineEventType.REPLY_SENT)
                .actor(testAgent)
                .actorRole("AGENT")
                .note("Reply Sent")
                .occurredAt(LocalDateTime.now().minusHours(3))
                .build());

        timelineRepo.save(TicketTimeline.builder()
                .ticket(testTicket)
                .eventType(TimelineEventType.RESOLVED)
                .actor(testAgent)
                .actorRole("AGENT")
                .note("Resolved")
                .occurredAt(LocalDateTime.now().minusHours(1))
                .build());

        // Create Rating
        ratingRepo.save(Rating.builder()
                .ticket(testTicket)
                .user(testUser)
                .score(5)
                .comment("Excellent support!")
                .build());
    }

    @Test
    public void testGetAgentMetrics() {
        LocalDateTime from = LocalDateTime.now().minusDays(1);
        LocalDateTime to = LocalDateTime.now().plusDays(1);

        AgentMetricsResponse metrics = performanceService.getAgentMetrics(testAgent.getId(), from, to);

        assertNotNull(metrics);
        assertEquals(testAgent.getId(), metrics.getAgentId());
        assertEquals(testAgent.getName(), metrics.getAgentName());
        assertEquals(testCategory.getName(), metrics.getAgentCategory());
        assertEquals(1, metrics.getTotalAssigned());
        assertEquals(1, metrics.getTotalResolved());
        assertEquals(0, metrics.getTotalTransferredOut());
        assertEquals(0, metrics.getLateAssignedCount());
        assertEquals(1, metrics.getSlaEligibleCount());
        assertEquals(1, metrics.getSlaCompliantCount());
        assertEquals(100.0, metrics.getSlaComplianceRate());
        assertEquals(60.0, metrics.getAvgFirstResponseMinutes()); // ASSIGNED to FIRST_REPLY: 4h to 3h = 60 mins
        assertEquals(180.0, metrics.getAvgHandleTimeMinutes()); // ASSIGNED to RESOLVED: 4h to 1h = 180 mins
        assertEquals(5.0, metrics.getAvgSatisfactionScore());
    }

    @Test
    public void testGetUserMetrics() {
        LocalDateTime from = LocalDateTime.now().minusDays(1);
        LocalDateTime to = LocalDateTime.now().plusDays(1);

        UserMetricsResponse metrics = performanceService.getUserMetrics(testUser.getId(), from, to);

        assertNotNull(metrics);
        assertEquals(testUser.getId(), metrics.getUserId());
        assertEquals(testUser.getName(), metrics.getUserName());
        assertEquals(1, metrics.getTotalTicketsSubmitted());
        assertEquals(5.0, metrics.getAvgSatisfactionGiven());
    }

    @Test
    public void testGetAllAgentMetrics() {
        LocalDateTime from = LocalDateTime.now().minusDays(1);
        LocalDateTime to = LocalDateTime.now().plusDays(1);

        List<AgentMetricsResponse> allMetrics = performanceService.getAllAgentMetrics(from, to);
        assertNotNull(allMetrics);
        assertTrue(allMetrics.size() > 0);
    }

    @Test
    public void testAgentTransferMetrics() {
        LocalDateTime from = LocalDateTime.now().minusDays(1);
        LocalDateTime to = LocalDateTime.now().plusDays(1);

        // Create a new target agent
        User targetAgent = userRepo.save(User.builder()
                .name("Metric Test Target Agent")
                .email("metric_agent_target_" + UUID.randomUUID() + "@test.com")
                .password("password123")
                .role(Role.AGENT)
                .isActive(true)
                .category(testCategory)
                .build());

        // Create a new ticket that belongs to testAgent
        Ticket transferTicket = ticketRepo.save(Ticket.builder()
                .ticketNumber("HD-TRANSFER-" + UUID.randomUUID().toString().substring(0, 8))
                .title("Transfer Test Ticket")
                .description("Checking transferred out count calculations")
                .status(TicketStatus.IN_PROGRESS)
                .priority(Priority.LOW)
                .category(testCategory)
                .createdBy(testUser)
                .assignedTo(testAgent)
                .createdAt(LocalDateTime.now().minusHours(2))
                .updatedAt(LocalDateTime.now())
                .build());

        // Record assignment to testAgent
        timelineRepo.save(TicketTimeline.builder()
                .ticket(transferTicket)
                .eventType(TimelineEventType.ASSIGNED)
                .actor(testAgent)
                .actorRole("AGENT")
                .note("Assigned to original agent")
                .occurredAt(LocalDateTime.now().minusHours(2))
                .build());

        // Record transfer from testAgent to targetAgent
        timelineRepo.save(TicketTimeline.builder()
                .ticket(transferTicket)
                .eventType(TimelineEventType.TRANSFERRED)
                .actor(testAgent)
                .actorRole("AGENT")
                .note("Transferred to target agent")
                .occurredAt(LocalDateTime.now().minusHours(1))
                .build());

        // Record assignment to targetAgent
        timelineRepo.save(TicketTimeline.builder()
                .ticket(transferTicket)
                .eventType(TimelineEventType.ASSIGNED)
                .actor(targetAgent)
                .actorRole("AGENT")
                .note("Assigned to target agent")
                .occurredAt(LocalDateTime.now().minusHours(1))
                .build());

        // Get metrics for testAgent
        AgentMetricsResponse originalMetrics = performanceService.getAgentMetrics(testAgent.getId(), from, to);
        // Get metrics for targetAgent
        AgentMetricsResponse targetMetrics = performanceService.getAgentMetrics(targetAgent.getId(), from, to);

        // testAgent should have 1 transferred out ticket, and 2 total assigned tickets (testTicket + transferTicket)
        assertEquals(2, originalMetrics.getTotalAssigned());
        assertEquals(1, originalMetrics.getTotalTransferredOut());

        // targetAgent should have 1 assigned ticket, 0 transferred out
        assertEquals(1, targetMetrics.getTotalAssigned());
        assertEquals(0, targetMetrics.getTotalTransferredOut());
    }
}
