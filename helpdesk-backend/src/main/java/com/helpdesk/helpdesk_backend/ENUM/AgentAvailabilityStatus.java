package com.helpdesk.helpdesk_backend.ENUM;

public enum AgentAvailabilityStatus {
    ONLINE(true),
    AWAY(false),
    BUSY(false),
    ON_BREAK(false),
    IN_MEETING(false),
    TRAINING(false),
    IDLE(false),
    OFFLINE(false);

    private final boolean assignable;

    AgentAvailabilityStatus(boolean assignable) {
        this.assignable = assignable;
    }

    public boolean isAssignable() {
        return assignable;
    }
}
