package com.helpdesk.helpdesk_backend.EXCEPTION;

import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;



@ResponseStatus(HttpStatus.NOT_FOUND)
public class NotFoundException extends RuntimeException {
    public NotFoundException(String resource, UUID id) {
        super(resource + " not found: " + id);
    }
    public NotFoundException(String message) {
        super(message);
    }
}
