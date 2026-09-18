package com.helpdesk.helpdesk_backend.REPOSITORY;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.helpdesk.helpdesk_backend.ENTITY.ReassignmentRequest;
import com.helpdesk.helpdesk_backend.ENTITY.ReassignmentRequest.RequestStatus;

@Repository
public interface ReassignmentRequestRepository extends JpaRepository<ReassignmentRequest, UUID> {
    List<ReassignmentRequest> findByStatus(RequestStatus status);
    List<ReassignmentRequest> findByTicketId(UUID ticketId);
}
