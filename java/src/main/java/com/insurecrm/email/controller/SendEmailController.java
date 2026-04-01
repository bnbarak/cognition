package com.insurecrm.email.controller;

import com.insurecrm.email.model.EmailRequest;
import com.insurecrm.email.model.EmailResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Controller for all outbound email operations in the InsureCRM system.
 * Handles sending individual emails, bulk emails, template-based emails,
 * and retrieving the status of sent messages.
 */
@RestController
@RequestMapping("/api/emails/send")
@Tag(name = "Send Emails", description = "Outbound email operations for client and policy communications")
public class SendEmailController {

    @PostMapping
    @Operation(summary = "Send a single email",
               description = "Compose and send an email to one or more recipients. Optionally link to a client or policy record.")
    public ResponseEntity<EmailResponse> sendEmail(@Valid @RequestBody EmailRequest request) {
        String messageId = "msg_" + UUID.randomUUID().toString().substring(0, 8);
        return ResponseEntity.status(HttpStatus.ACCEPTED)
                .body(new EmailResponse(true, "Email queued for delivery", messageId));
    }

    @PostMapping("/bulk")
    @Operation(summary = "Send bulk emails",
               description = "Send the same email to multiple clients. Useful for policy renewal reminders or agency announcements.")
    public ResponseEntity<EmailResponse> sendBulkEmails(@Valid @RequestBody List<EmailRequest> requests) {
        String batchId = "batch_" + UUID.randomUUID().toString().substring(0, 8);
        return ResponseEntity.status(HttpStatus.ACCEPTED)
                .body(new EmailResponse(true,
                        requests.size() + " emails queued for delivery",
                        batchId));
    }

    @PostMapping("/template/{templateId}")
    @Operation(summary = "Send an email using a CRM template",
               description = "Send an email using a pre-defined template (e.g. welcome, renewal reminder, claim update). Template variables are resolved from the linked client/policy.")
    public ResponseEntity<EmailResponse> sendTemplateEmail(
            @PathVariable String templateId,
            @RequestParam String clientId,
            @RequestParam(required = false) String policyId) {
        String messageId = "msg_" + UUID.randomUUID().toString().substring(0, 8);
        return ResponseEntity.status(HttpStatus.ACCEPTED)
                .body(new EmailResponse(true,
                        "Template '" + templateId + "' email queued for client " + clientId,
                        messageId));
    }

    @GetMapping("/status/{messageId}")
    @Operation(summary = "Get delivery status of a sent email",
               description = "Check whether a previously sent email was delivered, bounced, or is still pending.")
    public ResponseEntity<Map<String, Object>> getEmailStatus(@PathVariable String messageId) {
        return ResponseEntity.ok(Map.of(
                "messageId", messageId,
                "status", "delivered",
                "deliveredAt", "2024-06-15T14:35:00Z",
                "opens", 2,
                "clicks", 1
        ));
    }

    @GetMapping("/history")
    @Operation(summary = "Get sent email history",
               description = "Retrieve a paginated list of previously sent emails, optionally filtered by client or date range.")
    public ResponseEntity<Map<String, Object>> getSentHistory(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int limit,
            @RequestParam(required = false) String clientId,
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to) {
        return ResponseEntity.ok(Map.of(
                "emails", List.of(Map.of(
                        "messageId", "msg_abc123",
                        "to", List.of("jane.smith@example.com"),
                        "subject", "Policy Renewal Reminder",
                        "sentAt", "2024-06-15T14:30:00Z",
                        "status", "delivered"
                )),
                "total", 1,
                "page", page,
                "limit", limit,
                "totalPages", 1
        ));
    }
}
