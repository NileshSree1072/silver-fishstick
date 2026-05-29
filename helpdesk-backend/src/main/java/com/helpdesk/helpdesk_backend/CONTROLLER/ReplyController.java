package com.helpdesk.helpdesk_backend.CONTROLLER;

import java.util.List;
import java.util.UUID;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

import com.helpdesk.helpdesk_backend.DTO.REQUEST.CreateReplyRequest;
import com.helpdesk.helpdesk_backend.DTO.RESPONSE.ReplyResponse;
import com.helpdesk.helpdesk_backend.ENTITY.User;
import com.helpdesk.helpdesk_backend.SERVICE.ReplyService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.multipart.MultipartFile;



@RestController
@RequestMapping("/api/tickets/{ticketId}/replies")
@RequiredArgsConstructor
public class ReplyController {
    
    private final ReplyService replyService;

    private User currentUser(Authentication auth){
        return (User) auth.getPrincipal();
    }

    //send reply to a ticket
    @PostMapping
    public ResponseEntity<ReplyResponse> sendReply(
                        @PathVariable UUID ticketId, 
                        @Valid @RequestBody CreateReplyRequest req, 
                        Authentication auth) {
            return ResponseEntity.status(201).body(
                replyService.sendReply(ticketId, req,currentUser(auth))
            );
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ReplyResponse> sendReplyWithAttachments(
                        @PathVariable UUID ticketId,
                        @RequestParam("message") String message,
                        @RequestParam(value = "isInternal", defaultValue = "false") boolean isInternal,
                        @RequestPart(value = "files", required = false) List<MultipartFile> files,
                        Authentication auth) {
        CreateReplyRequest req = new CreateReplyRequest();
        req.setMessage(message);
        req.setInternal(isInternal);
        return ResponseEntity.status(201).body(
                replyService.sendReply(ticketId, req, currentUser(auth), files)
        );
    }

    //get all replies of a ticket

    @GetMapping
    public ResponseEntity<List<ReplyResponse>> getReplies(@PathVariable UUID ticketId, Authentication auth) {

        return ResponseEntity.ok(replyService.getReplies(ticketId,currentUser(auth)));
    }
    

    

}
