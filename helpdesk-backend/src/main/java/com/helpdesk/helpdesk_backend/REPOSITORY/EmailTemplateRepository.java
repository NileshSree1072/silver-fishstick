package com.helpdesk.helpdesk_backend.REPOSITORY;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.helpdesk.helpdesk_backend.ENTITY.EmailTemplate;
import com.helpdesk.helpdesk_backend.ENUM.EmailTemplateType;

@Repository
public interface EmailTemplateRepository extends JpaRepository<EmailTemplate, UUID> {
    Optional<EmailTemplate> findByTemplateType(EmailTemplateType templateType);
}