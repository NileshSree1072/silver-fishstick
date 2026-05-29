package com.helpdesk.helpdesk_backend.REPOSITORY;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.helpdesk.helpdesk_backend.ENTITY.SlaRule;
import com.helpdesk.helpdesk_backend.ENUM.Priority;

@Repository
public interface SlaRuleRepository extends JpaRepository<SlaRule, UUID> {
    Optional<SlaRule> findByPriority(Priority priority);
    List<SlaRule> findAllByOrderByPriorityAsc();
}
