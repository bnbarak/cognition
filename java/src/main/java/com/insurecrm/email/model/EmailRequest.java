package com.insurecrm.email.model;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import java.util.List;

/**
 * Request payload for sending an email from the CRM.
 */
public class EmailRequest {

    @NotEmpty(message = "At least one recipient is required")
    private List<@Email String> to;

    private List<@Email String> cc;

    private List<@Email String> bcc;

    @NotBlank(message = "Subject is required")
    private String subject;

    @NotBlank(message = "Body is required")
    private String body;

    /** HTML or plain text */
    private String contentType = "text/plain";

    /** Optional template ID for pre-built CRM email templates */
    private String templateId;

    /** Client ID this email is associated with */
    private String clientId;

    /** Policy ID this email relates to, if any */
    private String policyId;

    /** Email priority: low, normal, high, urgent */
    private String priority = "normal";

    /** File attachment references (list of attachment IDs from the file service) */
    private List<String> attachmentIds;

    // --- Getters and Setters ---

    public List<String> getTo() { return to; }
    public void setTo(List<String> to) { this.to = to; }

    public List<String> getCc() { return cc; }
    public void setCc(List<String> cc) { this.cc = cc; }

    public List<String> getBcc() { return bcc; }
    public void setBcc(List<String> bcc) { this.bcc = bcc; }

    public String getSubject() { return subject; }
    public void setSubject(String subject) { this.subject = subject; }

    public String getBody() { return body; }
    public void setBody(String body) { this.body = body; }

    public String getContentType() { return contentType; }
    public void setContentType(String contentType) { this.contentType = contentType; }

    public String getTemplateId() { return templateId; }
    public void setTemplateId(String templateId) { this.templateId = templateId; }

    public String getClientId() { return clientId; }
    public void setClientId(String clientId) { this.clientId = clientId; }

    public String getPolicyId() { return policyId; }
    public void setPolicyId(String policyId) { this.policyId = policyId; }

    public String getPriority() { return priority; }
    public void setPriority(String priority) { this.priority = priority; }

    public List<String> getAttachmentIds() { return attachmentIds; }
    public void setAttachmentIds(List<String> attachmentIds) { this.attachmentIds = attachmentIds; }
}
