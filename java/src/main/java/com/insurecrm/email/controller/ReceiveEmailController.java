package com.insurecrm.email.controller;

import com.insurecrm.email.model.ReceivedEmail;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.Map;

/**
 * Controller for inbound email operations in the InsureCRM system.
 * Handles listing, reading, and managing emails received from clients,
 * carriers, and other external parties.
 */
@RestController
@RequestMapping("/api/emails/inbox")
@Tag(name = "Receive Emails", description = "Inbound email management — view and process emails from clients and carriers")
public class ReceiveEmailController {

    /** Mock received email for demo purposes */
    private ReceivedEmail createMockEmail() {
        ReceivedEmail email = new ReceivedEmail();
        email.setId("recv_001");
        email.setFrom("jane.smith@example.com");
        email.setTo(List.of("agent@insurecrm.com"));
        email.setSubject("Question about my auto policy");
        email.setBody("Hi, I'd like to know when my auto policy renews. Thanks!");
        email.setContentType("text/plain");
        email.setReceivedAt(Instant.parse("2024-06-14T09:15:00Z"));
        email.setRead(false);
        email.setMatchedClientId("cli_001");
        email.setTags(List.of("auto-policy", "inquiry"));
        return email;
    }

    @GetMapping
    @Operation(summary = "List received emails",
               description = "Retrieve a paginated list of inbound emails. Supports filtering by read status, matched client, and date range.")
    public ResponseEntity<Map<String, Object>> listInboxEmails(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int limit,
            @RequestParam(required = false) Boolean unreadOnly,
            @RequestParam(required = false) String clientId,
            @RequestParam(required = false) String tag) {
        return ResponseEntity.ok(Map.of(
                "emails", List.of(createMockEmail()),
                "total", 1,
                "page", page,
                "limit", limit,
                "totalPages", 1,
                "unreadCount", 1
        ));
    }

    @GetMapping("/{emailId}")
    @Operation(summary = "Get a single received email",
               description = "Retrieve the full content of a received email by its ID. Automatically marks the email as read.")
    public ResponseEntity<ReceivedEmail> getEmail(@PathVariable String emailId) {
        ReceivedEmail email = createMockEmail();
        email.setId(emailId);
        email.setRead(true);
        return ResponseEntity.ok(email);
    }

    @PatchMapping("/{emailId}/read")
    @Operation(summary = "Mark an email as read or unread",
               description = "Toggle the read status of a received email.")
    public ResponseEntity<Map<String, Object>> markReadStatus(
            @PathVariable String emailId,
            @RequestParam boolean read) {
        return ResponseEntity.ok(Map.of(
                "emailId", emailId,
                "read", read,
                "message", "Email marked as " + (read ? "read" : "unread")
        ));
    }

    @PostMapping("/{emailId}/link")
    @Operation(summary = "Link a received email to a client",
               description = "Manually associate a received email with a CRM client record. Useful when auto-matching fails.")
    public ResponseEntity<Map<String, Object>> linkToClient(
            @PathVariable String emailId,
            @RequestParam String clientId) {
        return ResponseEntity.ok(Map.of(
                "emailId", emailId,
                "clientId", clientId,
                "message", "Email linked to client " + clientId
        ));
    }

    @DeleteMapping("/{emailId}")
    @Operation(summary = "Delete a received email",
               description = "Permanently delete a received email from the CRM inbox.")
    public ResponseEntity<Map<String, Object>> deleteEmail(@PathVariable String emailId) {
        return ResponseEntity.ok(Map.of(
                "emailId", emailId,
                "message", "Email deleted successfully"
        ));
    }
}
