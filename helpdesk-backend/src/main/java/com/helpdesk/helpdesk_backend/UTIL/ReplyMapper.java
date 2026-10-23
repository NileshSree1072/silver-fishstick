package com.helpdesk.helpdesk_backend.UTIL;

import java.util.List;
import java.util.Map;
import java.util.function.Function;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import org.springframework.stereotype.Component;

import com.helpdesk.helpdesk_backend.DTO.RESPONSE.AttachmentResponse;
import com.helpdesk.helpdesk_backend.DTO.RESPONSE.ReplyResponse;
import com.helpdesk.helpdesk_backend.ENTITY.Attachment;
import com.helpdesk.helpdesk_backend.ENTITY.Reply;

@Component
public class ReplyMapper {

    private final ObjectMapper objectMapper = new ObjectMapper();

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
                .aiSources(parseSources(reply.getAiSources()))
                .createdAt(reply.getCreatedAt())
                .build();
    }

    // Customers may only see knowledge-article sources — past tickets belong to other users
    public ReplyResponse toCustomerView(ReplyResponse response) {
        if (response.getAiSources() != null) {
            response.setAiSources(response.getAiSources().stream()
                    .filter(s -> "article".equals(s.get("type")))
                    .toList());
        }
        return response;
    }

    private List<Map<String, Object>> parseSources(String json) {
        if (json == null || json.isBlank()) {
            return List.of();
        }
        try {
            return objectMapper.readValue(json, new TypeReference<List<Map<String, Object>>>() {});
        } catch (Exception e) {
            return List.of();
        }
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
