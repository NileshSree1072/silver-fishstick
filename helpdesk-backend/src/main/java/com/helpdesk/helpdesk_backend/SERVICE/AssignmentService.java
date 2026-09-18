package com.helpdesk.helpdesk_backend.SERVICE;

import java.util.List;

import org.springframework.stereotype.Service;

import com.helpdesk.helpdesk_backend.ENTITY.Ticket;
import com.helpdesk.helpdesk_backend.ENTITY.User;
import com.helpdesk.helpdesk_backend.REPOSITORY.TicketRepository;
import com.helpdesk.helpdesk_backend.REPOSITORY.UserRepository;

import lombok.RequiredArgsConstructor;

import com.helpdesk.helpdesk_backend.SERVICE.ActivityService;
import com.helpdesk.helpdesk_backend.SERVICE.TicketTimelineService;

@Service
@RequiredArgsConstructor
public class AssignmentService {

    private final UserRepository userRepo;
    private final TicketRepository ticketRepo;
    private final ActivityService activityService;
    private final TicketTimelineService timelineService;

    public void autoAssign(Ticket ticket) {
        if (ticket.getCategory() == null) return;

        List<User> agents = userRepo
                .findLeastLoadedAgentByCategory(ticket.getCategory());

        if (!agents.isEmpty()) {
            User agent = agents.get(0);
            ticket.setAssignedTo(agent); // least loaded agent
            ticketRepo.save(ticket);
            activityService.ticketAssigned(ticket, agent);

            boolean late = timelineService.isLateAssigned(ticket);
            timelineService.recordAssigned(ticket, agent, late);
        }
        // If no agents in category, ticket stays unassigned
        // Admin will manually assign it
    }
}
