package com.helpdesk.helpdesk_backend.CONTROLLER;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.helpdesk.helpdesk_backend.DTO.REQUEST.CreateTicketRequest;
import com.helpdesk.helpdesk_backend.DTO.REQUEST.UpdateTicketRequest;
import com.helpdesk.helpdesk_backend.DTO.RESPONSE.AttachmentResponse;
import com.helpdesk.helpdesk_backend.DTO.RESPONSE.TicketResponse;
import java.util.stream.Collectors;
import com.helpdesk.helpdesk_backend.ENTITY.Attachment;
import com.helpdesk.helpdesk_backend.ENTITY.Ticket;
import com.helpdesk.helpdesk_backend.ENTITY.User;
import com.helpdesk.helpdesk_backend.ENUM.Priority;
import com.helpdesk.helpdesk_backend.ENUM.TicketStatus;
import com.helpdesk.helpdesk_backend.EXCEPTION.NotFoundException;
import com.helpdesk.helpdesk_backend.REPOSITORY.AttachmentRepository;
import com.helpdesk.helpdesk_backend.REPOSITORY.TicketRepository;
import com.helpdesk.helpdesk_backend.SERVICE.StorageService;
import com.helpdesk.helpdesk_backend.SERVICE.TicketLinkService;
import com.helpdesk.helpdesk_backend.SERVICE.TicketService;
import com.helpdesk.helpdesk_backend.SERVICE.SLAService;
import com.helpdesk.helpdesk_backend.SERVICE.ReassignmentRequestService;
import com.helpdesk.helpdesk_backend.DTO.REQUEST.CreateReassignRequest;
import com.helpdesk.helpdesk_backend.DTO.RESPONSE.ReassignRequestResponse;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

// controller/TicketController.java

@RestController
@RequestMapping("/api/tickets")
@RequiredArgsConstructor
public class TicketController {

        private final TicketService ticketService;
        private final TicketLinkService ticketLinkService;
        private final StorageService storageService;
        private final AttachmentRepository attachmentRepo;
        private final TicketRepository ticketRepo;
        private final SLAService slaService;
        private final ReassignmentRequestService reassignmentRequestService;

        // Helper to get the logged-in user from the JWT
        private User currentUser(Authentication auth) {
                return (User) auth.getPrincipal();
        }

        // USER/AGENT/ADMIN: submit a new ticket
        @PostMapping
        @PreAuthorize("hasAnyRole('USER','AGENT','ADMIN')")
        public ResponseEntity<TicketResponse> create(
                        @Valid @RequestBody CreateTicketRequest req,
                        Authentication auth) {
                return ResponseEntity.status(201)
                                .body(ticketService.createTicket(req, currentUser(auth)));
        }

        // USER/AGENT/ADMIN: get my own tickets
        @GetMapping("/my")
        @PreAuthorize("hasAnyRole('USER','AGENT','ADMIN')")
        public ResponseEntity<Page<TicketResponse>> myTickets(
                        @RequestParam(required = false) TicketStatus status,
                        @RequestParam(required = false) Priority priority,
                        @RequestParam(required = false) UUID categoryId,
                        @RequestParam(required = false) String q,
                        @RequestParam(defaultValue = "0") int page,
                        @RequestParam(defaultValue = "10") int size,
                        Authentication auth) {
                Pageable pageable = PageRequest.of(page, size,
                                Sort.by("createdAt").descending());
                return ResponseEntity.ok(
                                ticketService.getMyTickets(currentUser(auth), status, priority, categoryId, q, pageable));
        }

        // AGENT: get assigned tickets
        @GetMapping("/assigned")
        @PreAuthorize("hasAnyRole('AGENT','ADMIN')")
        public ResponseEntity<Page<TicketResponse>> assignedTickets(
                        @RequestParam(required = false) TicketStatus status,
                        @RequestParam(required = false) Priority priority,
                        @RequestParam(required = false) UUID categoryId,
                        @RequestParam(required = false) String q,
                        @RequestParam(defaultValue = "0") int page,
                        @RequestParam(defaultValue = "10") int size,
                        Authentication auth) {
                Pageable pageable = PageRequest.of(page, size,
                                Sort.by("createdAt").ascending()); // oldest first
                return ResponseEntity.ok(
                                ticketService.getAssignedTickets(currentUser(auth), status, priority, categoryId, q, pageable));
        }

        // AGENT/ADMIN: get all tickets
        @GetMapping
        @PreAuthorize("hasAnyRole('AGENT','ADMIN')")
        public ResponseEntity<Page<TicketResponse>> allTickets(
                        @RequestParam(required = false) TicketStatus status,
                        @RequestParam(required = false) Priority priority,
                        @RequestParam(required = false) UUID categoryId,
                        @RequestParam(required = false) String q,
                        @RequestParam(defaultValue = "0") int page,
                        @RequestParam(defaultValue = "10") int size,
                        Authentication auth) {
                Pageable pageable = PageRequest.of(page, size,
                                Sort.by("createdAt").descending());
                return ResponseEntity.ok(
                                ticketService.getAllTickets(status, priority, categoryId, q, pageable, currentUser(auth)));
        }

        // AGENT/ADMIN: search tickets by title or description (for link-ticket picker)
        @GetMapping("/search")
        @PreAuthorize("hasAnyRole('AGENT','ADMIN')")
        public ResponseEntity<Page<TicketResponse>> searchTickets(
                        @RequestParam String q,
                        @RequestParam(defaultValue = "0") int page,
                        @RequestParam(defaultValue = "15") int size,
                        Authentication auth) {
                Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
                return ResponseEntity.ok(ticketService.searchTickets(q, pageable, currentUser(auth)));
        }

        // ALL ROLES: get one ticket by id
        @GetMapping("/{id}")
        public ResponseEntity<TicketResponse> getById(
                        @PathVariable UUID id,
                        Authentication auth) {
                return ResponseEntity.ok(
                                ticketService.getTicketById(id, currentUser(auth)));
        }

        // AGENT/ADMIN: update status, priority, reassign
        @PatchMapping("/{id}")
        @PreAuthorize("hasAnyRole('AGENT','ADMIN')")
        public ResponseEntity<TicketResponse> update(
                        @PathVariable UUID id,
                        @RequestBody UpdateTicketRequest req,
                        Authentication auth) {
                return ResponseEntity.ok(
                                ticketService.updateTicket(id, req, currentUser(auth)));
        }

        // USER: reopen a resolved ticket
        @PatchMapping("/{id}/reopen")
        @PreAuthorize("hasRole('USER')")
        public ResponseEntity<TicketResponse> reopen(
                        @PathVariable UUID id,
                        Authentication auth) {
                return ResponseEntity.ok(
                                ticketService.reopenTicket(id, currentUser(auth)));
        }

        // USER: close a ticket
        @PatchMapping("/{id}/close")
        @PreAuthorize("hasRole('USER')")
        public ResponseEntity<TicketResponse> close(
                        @PathVariable UUID id,
                        Authentication auth) {
                return ResponseEntity.ok(
                                ticketService.closeTicket(id, currentUser(auth)));
        }

        // Link two tickets
        @PostMapping("/{id}/link/{otherId}")
        @PreAuthorize("hasAnyRole('AGENT','ADMIN')")
        public ResponseEntity<Void> linkTickets(
                        @PathVariable UUID id,
                        @PathVariable UUID otherId,
                        Authentication auth) {
                ticketLinkService.linkTickets(id, otherId, currentUser(auth));
                return ResponseEntity.ok().build();
        }

        // Get all linked tickets
        @GetMapping("/{id}/linked")
        @PreAuthorize("hasAnyRole('AGENT','ADMIN')")
        public ResponseEntity<List<TicketResponse>> getLinked(
                        @PathVariable UUID id,
                        Authentication auth) {
                return ResponseEntity.ok(ticketLinkService.getLinkedTickets(id, currentUser(auth)));
        }

        // Unlink two tickets
        @DeleteMapping("/{id}/link/{otherId}")
        @PreAuthorize("hasAnyRole('AGENT','ADMIN')")
        public ResponseEntity<Void> unlinkTickets(
                        @PathVariable UUID id,
                        @PathVariable UUID otherId,
                        Authentication auth) {
                ticketLinkService.unlinkTickets(id, otherId, currentUser(auth));
                return ResponseEntity.noContent().build();
        }

        // Resolve ticket + all linked tickets at once
        @PostMapping("/{id}/resolve-all-linked")
        @PreAuthorize("hasAnyRole('AGENT','ADMIN')")
        public ResponseEntity<Void> resolveAllLinked(
                        @PathVariable UUID id,
                        Authentication auth) {
                ticketLinkService.bulkResolveLinked(id, currentUser(auth));
                return ResponseEntity.ok().build();
        }

        // Upload attachment when creating or viewing a ticket
        @PostMapping("/{id}/attachments")
        public ResponseEntity<Map<String, String>> uploadAttachment(
                        @PathVariable UUID id,
                        @RequestParam("file") MultipartFile file,
                        Authentication auth) {

                Ticket ticket = ticketRepo.findById(id)
                                .orElseThrow(() -> new NotFoundException("Ticket", id));

                String url = storageService.uploadFile(file, "tickets/" + id);

                Attachment attachment = Attachment.builder()
                                .ticket(ticket)
                                .uploadedBy(currentUser(auth))
                                .fileName(file.getOriginalFilename())
                                .fileUrl(url)
                                .fileSize(file.getSize())
                                .build();

                attachmentRepo.save(attachment);
                return ResponseEntity.ok(Map.of("url", url, "fileName",
                                file.getOriginalFilename()));
        }

        @GetMapping("/{id}/attachments")
        public ResponseEntity<List<AttachmentResponse>> getAttachments(
                        @PathVariable UUID id) {
                Ticket ticket = ticketRepo.findById(id)
                                .orElseThrow(() -> new NotFoundException("Ticket", id));
                List<AttachmentResponse> dtos = attachmentRepo.findByTicket(ticket).stream()
                        .map(a -> AttachmentResponse.builder()
                                .id(a.getId())
                                .fileName(a.getFileName())
                                .fileUrl(a.getFileUrl())
                                .fileSize(a.getFileSize())
                                .createdAt(a.getCreatedAt())
                                .uploadedByName(a.getUploadedBy() != null ? a.getUploadedBy().getName() : null)
                                .build())
                        .collect(Collectors.toList());
                return ResponseEntity.ok(dtos);
        }

        @GetMapping("/attachments/{attachmentId}/content")
        public ResponseEntity<byte[]> getAttachmentContent(@PathVariable UUID attachmentId) {
                Attachment attachment = attachmentRepo.findById(attachmentId)
                                .orElseThrow(() -> new NotFoundException("Attachment", attachmentId));
                StorageService.StoredFile file = storageService.readFile(attachment.getFileUrl());
                return ResponseEntity.ok()
                                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + file.fileName() + "\"")
                                .contentType(MediaType.parseMediaType(file.contentType()))
                                .body(file.content());
        }

        @GetMapping("/{id}/sla")
        @PreAuthorize("hasAnyRole('AGENT','ADMIN')")
        public ResponseEntity<Map<String, Object>> getTicketSla(@PathVariable UUID id) {
                Ticket ticket = ticketRepo.findById(id)
                                .orElseThrow(() -> new NotFoundException("Ticket", id));
                return ResponseEntity.ok(slaService.getTicketSLAStatus(ticket));
        }

        @PostMapping("/{id}/reassign-request")
        @PreAuthorize("hasAnyRole('AGENT','ADMIN')")
        public ResponseEntity<ReassignRequestResponse> createReassignRequest(
                        @PathVariable UUID id,
                        @RequestBody CreateReassignRequest req,
                        Authentication auth) {
                User user = currentUser(auth);
                return ResponseEntity.ok(reassignmentRequestService.createRequest(id, req, user));
        }
}
