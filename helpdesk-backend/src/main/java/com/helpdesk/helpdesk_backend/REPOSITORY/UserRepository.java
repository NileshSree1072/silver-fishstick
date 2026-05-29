package com.helpdesk.helpdesk_backend.REPOSITORY;


import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import com.helpdesk.helpdesk_backend.ENTITY.Category;
import com.helpdesk.helpdesk_backend.ENTITY.User;
import com.helpdesk.helpdesk_backend.ENUM.AgentAvailabilityStatus;
import com.helpdesk.helpdesk_backend.ENUM.Role;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {


    // ─────────────────────────────────────────
    // AUTH
    // ─────────────────────────────────────────

    // Find user by email — used in login and JWT filter
    Optional<User> findByEmail(String email);

    // Check if email already exists — used in register
    boolean existsByEmail(String email);

    // Find only active users by email — extra safety on login
    Optional<User> findByEmailAndIsActiveTrue(String email);


    // ─────────────────────────────────────────
    // ROLE-BASED QUERIES
    // ─────────────────────────────────────────

    // Get all users with a specific role (USER / AGENT / ADMIN)
    List<User> findByRole(Role role);

    // Get all agents — used by admin to list and assign
    List<User> findByRoleAndIsActiveTrue(Role role);

    Page<User> findByRoleAndIsActiveTrue(Role role, Pageable pageable);

    // Count total users by role — used in admin analytics
    long countByRole(Role role);

    // Count only active users by role
    long countByRoleAndIsActiveTrue(Role role);

    boolean existsByCategory(Category category);


    // ─────────────────────────────────────────
    // ADMIN — USER MANAGEMENT
    // ─────────────────────────────────────────

    // Get all users paginated — admin user list page
    // (inherited from JpaRepository; do not redeclare to avoid nullability mismatch)

    // Search users by name or email (case-insensitive)
    // Used in admin search bar
    @Query("""
        SELECT u FROM User u
        WHERE LOWER(u.name)  LIKE LOWER(CONCAT('%', :query, '%'))
           OR LOWER(u.email) LIKE LOWER(CONCAT('%', :query, '%'))
    """)
    Page<User> searchByNameOrEmail(@Param("query") String query, Pageable pageable);

    // Get all users filtered by role with pagination
    Page<User> findByRole(Role role, Pageable pageable);


    // ─────────────────────────────────────────
    // AGENT SCOPE
    // ─────────────────────────────────────────

    // Get all active agents assigned to a specific category
    // Used by AssignmentService to auto-assign tickets
    @Query("""
        SELECT u FROM User u
        WHERE u.role = com.helpdesk.helpdesk_backend.ENUM.Role.AGENT
          AND u.isActive = true
          AND u.availabilityStatus = com.helpdesk.helpdesk_backend.ENUM.AgentAvailabilityStatus.ONLINE
          AND u.category.id = :categoryId
    """)
    List<User> findActiveAgentsByCategory(@Param("categoryId") UUID categoryId);

    // Find the agent with the least assigned open tickets
    // Used for load-balanced auto-assignment
    @Query("""
        SELECT u FROM User u
        LEFT JOIN Ticket t ON t.assignedTo = u
            AND t.status IN (
                com.helpdesk.helpdesk_backend.ENUM.TicketStatus.OPEN,
                com.helpdesk.helpdesk_backend.ENUM.TicketStatus.IN_PROGRESS
            )
        WHERE u.role = com.helpdesk.helpdesk_backend.ENUM.Role.AGENT
          AND u.isActive = true
          AND u.availabilityStatus = com.helpdesk.helpdesk_backend.ENUM.AgentAvailabilityStatus.ONLINE
          AND u.category = :category
        GROUP BY u
        HAVING COUNT(t) < COALESCE(u.maxActiveTickets, 10)
        ORDER BY COUNT(t) ASC, u.availabilityUpdatedAt ASC
    """)
    List<User> findLeastLoadedAgentByCategory(@Param("category") Category category);


    // ─────────────────────────────────────────
    // PROFILE & ACCOUNT
    // ─────────────────────────────────────────

    // Find by id only if active — prevents returning deactivated accounts
    Optional<User> findByIdAndIsActiveTrue(UUID id);

    // Check if email is taken by a DIFFERENT user
    // Used when user updates their own email
    boolean existsByEmailAndIdNot(String email, UUID excludeId);


    // ─────────────────────────────────────────
    // ADMIN — ROLE CHANGE & DEACTIVATION
    // ─────────────────────────────────────────

    // Update a user's role directly — promote to AGENT or demote back
    @Modifying
    @Transactional
    @Query("UPDATE User u SET u.role = :role WHERE u.id = :id")
    int updateRole(@Param("id") UUID id, @Param("role") Role role);

    // Soft-delete a user (never delete rows — just deactivate)
    @Modifying
    @Transactional
    @Query("UPDATE User u SET u.isActive = :status WHERE u.id = :id")
    int updateActiveStatus(@Param("id") UUID id, @Param("status") boolean status);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Transactional
    @Query("""
        UPDATE User u
        SET u.availabilityStatus = :status,
            u.availabilityReason = :reason,
            u.availabilityUpdatedAt = CURRENT_TIMESTAMP
        WHERE u.id = :id
    """)
    int updateAvailability(
            @Param("id") UUID id,
            @Param("status") AgentAvailabilityStatus status,
            @Param("reason") String reason);

    // Assign an agent to a category
    @Modifying
    @Transactional
    @Query(value = "UPDATE users SET category_id = :categoryId WHERE id = :id", nativeQuery = true)
    int updateAgentCategory(@Param("id") UUID id, @Param("categoryId") UUID categoryId);


    // ─────────────────────────────────────────
    // ANALYTICS
    // ─────────────────────────────────────────

    // Total registered users (all time) — admin dashboard
    @Query("SELECT COUNT(u) FROM User u WHERE u.role = com.helpdesk.helpdesk_backend.ENUM.Role.USER")
    long countTotalUsers();

    // Total active agents — admin dashboard
    @Query("SELECT COUNT(u) FROM User u WHERE u.role = com.helpdesk.helpdesk_backend.ENUM.Role.AGENT AND u.isActive = true")
    long countActiveAgents();

    // Agent performance: tickets resolved per agent
    // Returns [agentId, agentName, resolvedCount] — used in analytics report
    @Query("""
        SELECT u.id, u.name,
               COUNT(t.id) AS resolvedCount
        FROM User u
        LEFT JOIN Ticket t ON t.assignedTo = u
            AND t.status = com.helpdesk.helpdesk_backend.ENUM.TicketStatus.RESOLVED
        WHERE u.role = com.helpdesk.helpdesk_backend.ENUM.Role.AGENT
        GROUP BY u.id, u.name
        ORDER BY resolvedCount DESC
    """)
    List<Object[]> getAgentResolutionCounts();

}
