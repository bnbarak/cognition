package com.insurecrm.email.model;

import java.time.Instant;
import java.util.List;

/**
 * Represents an email received by the CRM system (e.g. from a client or carrier).
 */
public class ReceivedEmail {

    private String id;
    private String from;
    private List<String> to;
    private String subject;
    private String body;
    private String contentType;
    private Instant receivedAt;
    private boolean read;

    /** Auto-matched client ID based on sender address */
    private String matchedClientId;

    /** Tags applied by classification rules */
    private List<String> tags;

    // --- Getters and Setters ---

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getFrom() { return from; }
    public void setFrom(String from) { this.from = from; }

    public List<String> getTo() { return to; }
    public void setTo(List<String> to) { this.to = to; }

    public String getSubject() { return subject; }
    public void setSubject(String subject) { this.subject = subject; }

    public String getBody() { return body; }
    public void setBody(String body) { this.body = body; }

    public String getContentType() { return contentType; }
    public void setContentType(String contentType) { this.contentType = contentType; }

    public Instant getReceivedAt() { return receivedAt; }
    public void setReceivedAt(Instant receivedAt) { this.receivedAt = receivedAt; }

    public boolean isRead() { return read; }
    public void setRead(boolean read) { this.read = read; }

    public String getMatchedClientId() { return matchedClientId; }
    public void setMatchedClientId(String matchedClientId) { this.matchedClientId = matchedClientId; }

    public List<String> getTags() { return tags; }
    public void setTags(List<String> tags) { this.tags = tags; }
}
