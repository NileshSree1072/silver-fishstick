package com.helpdesk.helpdesk_backend.UTIL;

import com.helpdesk.helpdesk_backend.DTO.RESPONSE.UserResponse;
import com.helpdesk.helpdesk_backend.ENTITY.User;
import com.helpdesk.helpdesk_backend.ENUM.TicketStatus;
import com.helpdesk.helpdesk_backend.REPOSITORY.RatingRepository;
import com.helpdesk.helpdesk_backend.REPOSITORY.TicketRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class UserMapper {

    private final TicketRepository ticketRepo;
    private final RatingRepository ratingRepo;

    public UserResponse toResponse(User user) {
        return UserResponse.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .role(user.getRole().name())
                .categoryId(user.getCategory() != null ? user.getCategory().getId() : null)
                .categoryName(user.getCategory() != null ? user.getCategory().getName() : null)
                .isActive(user.isActive())
                .availabilityStatus(user.getAvailabilityStatus() != null ? user.getAvailabilityStatus().name() : null)
                .availabilityUpdatedAt(user.getAvailabilityUpdatedAt())
                .availabilityReason(user.getAvailabilityReason())
                .maxActiveTickets(user.getMaxActiveTickets())
                .assignable(isAssignable(user))
                .build();
    }

    // Richer response for agent — includes performance stats
    public UserResponse toAgentResponse(User agent) {
        long open     = ticketRepo.countByAssignedToAndStatus(
                            agent, TicketStatus.OPEN)
                      + ticketRepo.countByAssignedToAndStatus(
                            agent, TicketStatus.IN_PROGRESS);
        long resolved = ticketRepo.countByAssignedToAndStatus(
                            agent, TicketStatus.RESOLVED);
        Double avgRating = ratingRepo.findAverageScoreByAgent(agent);

        return UserResponse.builder()
                .id(agent.getId())
                .name(agent.getName())
                .email(agent.getEmail())
                .role(agent.getRole().name())
                .categoryId(agent.getCategory() != null ? agent.getCategory().getId() : null)
                .categoryName(agent.getCategory() != null ? agent.getCategory().getName() : null)
                .isActive(agent.isActive())
                .availabilityStatus(agent.getAvailabilityStatus() != null ? agent.getAvailabilityStatus().name() : null)
                .availabilityUpdatedAt(agent.getAvailabilityUpdatedAt())
                .availabilityReason(agent.getAvailabilityReason())
                .maxActiveTickets(agent.getMaxActiveTickets())
                .assignable(isAssignable(agent))
                .totalAssignedTickets(open)
                .resolvedTickets(resolved)
                .averageRating(avgRating != null
                        ? Math.round(avgRating * 10.0) / 10.0 : null)
                .build();
    }

    public List<UserResponse> toResponseList(List<User> users) {
        return users.stream().map(this::toResponse).toList();
    }

    private boolean isAssignable(User user) {
        return user.isActive()
                && user.getAvailabilityStatus() != null
                && user.getAvailabilityStatus().isAssignable();
    }
}
