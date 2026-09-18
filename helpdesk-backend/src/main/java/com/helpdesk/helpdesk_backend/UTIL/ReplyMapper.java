package com.helpdesk.helpdesk_backend.UTIL;

import java.util.List;
import java.util.function.Function;

import org.springframework.stereotype.Component;

import com.helpdesk.helpdesk_backend.DTO.RESPONSE.AttachmentResponse;
import com.helpdesk.helpdesk_backend.DTO.RESPONSE.ReplyResponse;
import com.helpdesk.helpdesk_backend.ENTITY.Attachment;
import com.helpdesk.helpdesk_backend.ENTITY.Reply;

@Component
public class ReplyMapper {

    public ReplyResponse toResponse(Reply reply) {
        return toResponse(reply, List.of());
    }

    public ReplyResponse toResponse(Reply reply, List<Attachment> attachments) {
        return ReplyResponse.builder()
                .id(reply.getId())
                .ticketId(reply.getTicket().getId())
                .senderId(reply.getSender().getId())
                .senderName(reply.getSender().getName())
                .senderRole(reply.getSender().getRole().name())
                .message(reply.getMessage())
                .isInternal(reply.isInternal())
                .isAiGenerated(reply.isAiGenerated())
                .attachments(attachments.stream().map(this::toAttachmentResponse).toList())
                .createdAt(reply.getCreatedAt())
                .build();
    }

    public List<ReplyResponse> toResponseList(List<Reply> replies) {
        return replies.stream().map(this::toResponse).toList();
    }

    public List<ReplyResponse> toResponseList(List<Reply> replies, Function<Reply, List<Attachment>> attachmentSupplier) {
        return replies.stream().map(reply -> toResponse(reply, attachmentSupplier.apply(reply))).toList();
    }

    private AttachmentResponse toAttachmentResponse(Attachment attachment) {
        return AttachmentResponse.builder()
                .id(attachment.getId())
                .fileName(attachment.getFileName())
                .fileUrl(attachment.getFileUrl())
                .fileSize(attachment.getFileSize())
                .createdAt(attachment.getCreatedAt())
                .uploadedByName(attachment.getUploadedBy() != null ? attachment.getUploadedBy().getName() : null)
                .build();
    }
}
