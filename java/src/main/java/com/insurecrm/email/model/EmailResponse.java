package com.insurecrm.email.model;

import java.time.Instant;

/**
 * Standard response wrapper for email operations.
 */
public class EmailResponse {

    private boolean success;
    private String message;
    private String messageId;
    private Instant timestamp;

    public EmailResponse() {
        this.timestamp = Instant.now();
    }

    public EmailResponse(boolean success, String message, String messageId) {
        this.success = success;
        this.message = message;
        this.messageId = messageId;
        this.timestamp = Instant.now();
    }

    // --- Getters and Setters ---

    public boolean isSuccess() { return success; }
    public void setSuccess(boolean success) { this.success = success; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public String getMessageId() { return messageId; }
    public void setMessageId(String messageId) { this.messageId = messageId; }

    public Instant getTimestamp() { return timestamp; }
    public void setTimestamp(Instant timestamp) { this.timestamp = timestamp; }
}
