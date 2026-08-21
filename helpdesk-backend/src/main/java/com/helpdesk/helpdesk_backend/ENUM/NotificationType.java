package com.helpdesk.helpdesk_backend.ENUM;


public enum NotificationType {
    NEW_TICKET,       // agent: new ticket assigned to you
    AGENT_REPLIED,    // user: agent replied to your ticket
    USER_REPLIED,     // agent: user replied to your ticket
    TICKET_RESOLVED,  // user: your ticket was resolved
    TICKET_ASSIGNED,  // agent: a ticket was reassigned to you
    SLA_BREACH        // admin: a ticket breached SLA
}

