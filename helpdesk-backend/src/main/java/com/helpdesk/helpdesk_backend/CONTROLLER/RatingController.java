package com.helpdesk.helpdesk_backend.CONTROLLER;

import com.helpdesk.helpdesk_backend.DTO.REQUEST.CreateRatingRequest;
import com.helpdesk.helpdesk_backend.DTO.RESPONSE.RatingResponse;
import com.helpdesk.helpdesk_backend.DTO.RESPONSE.RatingSummaryResponse;
import com.helpdesk.helpdesk_backend.ENTITY.User;
import com.helpdesk.helpdesk_backend.SERVICE.RatingService;
import jakarta.validation.Valid;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

// controller/RatingController.java

@RestController
@RequiredArgsConstructor
public class RatingController {

    private final RatingService ratingService;

    private User currentUser(Authentication auth) {
        return (User) auth.getPrincipal();
    }

    // USER: submit rating for their resolved ticket
    @PostMapping("/api/tickets/{ticketId}/rating")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<RatingResponse> submitRating(
            @PathVariable UUID ticketId,
            @Valid @RequestBody CreateRatingRequest req,
            Authentication auth) {
        return ResponseEntity.status(201)
                .body(ratingService.submitRating(ticketId, req, currentUser(auth)));
    }

    // ALL: get rating for a specific ticket
    @GetMapping("/api/tickets/{ticketId}/rating")
    public ResponseEntity<RatingResponse> getRating(
            @PathVariable UUID ticketId) {
        return ResponseEntity.ok(ratingService.getRatingForTicket(ticketId));
    }

    // ADMIN: full rating summary for analytics dashboard
    @GetMapping("/api/admin/ratings/summary")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<RatingSummaryResponse> getSummary() {
        return ResponseEntity.ok(ratingService.getSummary());
    }
}
