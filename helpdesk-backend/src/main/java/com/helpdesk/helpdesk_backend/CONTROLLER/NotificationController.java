package com.helpdesk.helpdesk_backend.CONTROLLER;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.helpdesk.helpdesk_backend.DTO.RESPONSE.NotificationResponse;
import com.helpdesk.helpdesk_backend.ENTITY.User;
import com.helpdesk.helpdesk_backend.SERVICE.NotificationService;

import lombok.RequiredArgsConstructor;

// controller/NotificationController.java

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    private User currentUser(Authentication auth) {
        return (User) auth.getPrincipal();
    }

    // Get all notifications for logged-in user
    @GetMapping
    public ResponseEntity<List<NotificationResponse>> getAll(
            Authentication auth) {
        return ResponseEntity.ok(
                notificationService.getMyNotifications(currentUser(auth)));
    }

    // Get unread count — used for bell badge
    @GetMapping("/unread-count")
    public ResponseEntity<Map<String, Long>> unreadCount(
            Authentication auth) {
        long count = notificationService.getUnreadCount(currentUser(auth));
        return ResponseEntity.ok(Map.of("count", count));
    }

    // Mark one notification as read
    @PatchMapping("/{id}/read")
    public ResponseEntity<Void> markOneRead(@PathVariable UUID id) {
        notificationService.markOneRead(id);
        return ResponseEntity.ok().build();
    }

    // Mark all as read
    @PatchMapping("/read-all")
    public ResponseEntity<Void> markAllRead(Authentication auth) {
        notificationService.markAllRead(currentUser(auth));
        return ResponseEntity.ok().build();
    }
}
