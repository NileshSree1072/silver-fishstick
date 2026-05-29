package com.helpdesk.helpdesk_backend.REPOSITORY;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.helpdesk.helpdesk_backend.ENTITY.AgentPerformanceSnapshot;
import com.helpdesk.helpdesk_backend.ENTITY.User;

@Repository
public interface AgentPerformanceSnapshotRepository
        extends JpaRepository<AgentPerformanceSnapshot, UUID> {

    List<AgentPerformanceSnapshot> findByAgentOrderByPeriodStartDesc(User agent);

    Optional<AgentPerformanceSnapshot> findByAgentAndPeriodStartAndPeriodEnd(
            User agent, LocalDateTime start, LocalDateTime end);
}
