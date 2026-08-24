package com.helpdesk.helpdesk_backend.REPOSITORY;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.helpdesk.helpdesk_backend.ENTITY.Notification;
import com.helpdesk.helpdesk_backend.ENTITY.User;
import com.helpdesk.helpdesk_backend.ENUM.NotificationType;

import jakarta.transaction.Transactional;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, UUID> {
    // Check if notification exists for a ticket and type
    boolean existsByTicketIdAndType(UUID ticketId, NotificationType type);

    // Get all notifications for a user, newest first
    List<Notification> findByUserOrderByCreatedAtDesc(User user);

    // Get only unread notifications
    List<Notification> findByUserAndIsReadFalseOrderByCreatedAtDesc(User user);

    // Count unread — used for the bell badge number
    long countByUserAndIsReadFalse(User user);

    // Mark all as read for a user
    @Modifying
    @Transactional
    @Query("UPDATE Notification n SET n.isRead = true WHERE n.user = :user")
    int markAllRead(@Param("user") User user);

    // Mark one as read
    @Modifying
    @Transactional
    @Query("UPDATE Notification n SET n.isRead = true WHERE n.id = :id")
    int markOneRead(@Param("id") UUID id);
}
