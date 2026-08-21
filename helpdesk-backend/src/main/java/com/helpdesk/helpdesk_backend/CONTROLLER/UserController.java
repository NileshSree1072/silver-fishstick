package com.helpdesk.helpdesk_backend.CONTROLLER;

import com.helpdesk.helpdesk_backend.DTO.REQUEST.UpdateProfileRequest;
import com.helpdesk.helpdesk_backend.DTO.REQUEST.UpdateAgentAvailabilityRequest;
import com.helpdesk.helpdesk_backend.DTO.RESPONSE.UserResponse;
import com.helpdesk.helpdesk_backend.ENTITY.User;
import com.helpdesk.helpdesk_backend.SERVICE.AdminUserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final AdminUserService userService;

    private User currentUser(Authentication auth) {
        return (User) auth.getPrincipal();
    }

    // Get own profile
    @GetMapping("/me")
    public ResponseEntity<UserResponse> getMyProfile(Authentication auth) {
        return ResponseEntity.ok(
                userService.getUserById(currentUser(auth).getId()));
    }

    // Update own profile (name, email, password)
    @PatchMapping("/me")
    public ResponseEntity<UserResponse> updateMyProfile(
            @RequestBody UpdateProfileRequest req,
            Authentication auth) {
        return ResponseEntity.ok(
                userService.updateProfile(currentUser(auth).getId(), req));
    }

    @PatchMapping("/me/availability")
    @PreAuthorize("hasRole('AGENT')")
    public ResponseEntity<UserResponse> updateMyAvailability(
            @RequestBody UpdateAgentAvailabilityRequest req,
            Authentication auth) {
        return ResponseEntity.ok(
                userService.updateAgentAvailability(currentUser(auth).getId(), req));
    }
}
