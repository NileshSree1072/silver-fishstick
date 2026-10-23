package com.helpdesk.helpdesk_backend.REPOSITORY;

import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.helpdesk.helpdesk_backend.ENTITY.AiOutputFeedback;

@Repository
public interface AiOutputFeedbackRepository extends JpaRepository<AiOutputFeedback, UUID> {
}
