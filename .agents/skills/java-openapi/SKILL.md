# OpenAPI Annotations for Spring Boot (skill.md)

## Overview

This guide defines the **standard annotation patterns** to produce high-quality OpenAPI specs in Spring Boot using `springdoc-openapi`.

The goal:

* Accurate schemas
* Strong typing for clients
* Clear API documentation
* Minimal ambiguity for consumers (humans + agents)

---

## Stack Assumptions

* Spring Boot 3+
* `springdoc-openapi`
* Jakarta validation (`jakarta.validation.*`)
* Jackson (`com.fasterxml.jackson.*`)

---

# 1. Controller-Level Annotations

## Always include `@Operation`

Every endpoint must define:

```java
@Operation(
  summary = "Short description",
  description = "Detailed explanation of what the endpoint does"
)
```

### Rules

* Summary: 1 sentence
* Description: include business meaning, not just technical behavior

---

## Always define responses explicitly

```java
@ApiResponses({
  @ApiResponse(responseCode = "200", description = "Success"),
  @ApiResponse(responseCode = "400", description = "Invalid input"),
  @ApiResponse(responseCode = "500", description = "Internal error")
})
```

### Rules

* Never rely on default responses
* Always include failure cases
* Use consistent error descriptions

---

## Group endpoints with `@Tag`

```java
@Tag(name = "Certificates", description = "COI operations")
```

---

# 2. Request & Parameter Annotations

## Path / Query Parameters

```java
@GetMapping("/{id}")
public Certificate get(
  @Parameter(description = "Certificate ID")
  @PathVariable String id
)
```

---

## Request Body (OpenAPI annotation)

```java
@io.swagger.v3.oas.annotations.parameters.RequestBody(
  description = "Certificate payload",
  required = true
)
```

---

# 3. DTO / Schema Annotations (CRITICAL)

## Every DTO must use `@Schema`

```java
@Schema(description = "Insurance certificate")
public class Certificate {

  @Schema(description = "Unique ID", example = "cert_123")
  private String id;

  @Schema(description = "Status", allowableValues = {"ACTIVE", "EXPIRED"})
  private String status;
}
```

---

## Required fields must use validation

```java
@NotNull
private String id;
```

This automatically:

* Marks field as required
* Improves generated clients

---

## Lists must define element types

```java
@ArraySchema(schema = @Schema(implementation = Coverage.class))
private List<Coverage> coverages;
```

---

# 4. Validation Annotations (MANDATORY)

Use Jakarta validation to enrich schema:

```java
@NotNull
@NotBlank
@Size(min = 1, max = 100)
@Min(0)
@Max(1000)
@Email
```

### Impact

* Defines constraints in OpenAPI
* Improves frontend validation
* Prevents invalid requests

---

# 5. Jackson Annotations (Shape Control)

## Rename fields

```java
@JsonProperty("certificate_id")
private String id;
```

---

## Format dates

```java
@JsonFormat(pattern = "yyyy-MM-dd")
private LocalDate effectiveDate;
```

---

## Hide fields

```java
@JsonIgnore
```

---

# 6. Response Schema Definition

Always define response content explicitly:

```java
@ApiResponse(
  responseCode = "200",
  content = @Content(
    mediaType = "application/json",
    schema = @Schema(implementation = Certificate.class)
  )
)
```

---

# 7. Examples (HIGH VALUE)

## Field-level example

```java
@Schema(example = "cert_123")
```

---

## Full request example

```java
@ExampleObject(
  name = "Sample request",
  value = "{ \"name\": \"Test\" }"
)
```

---

# 8. Error Handling Pattern

## Standard error response DTO

```java
@Schema(description = "Standard error response")
public class ErrorResponse {

  @Schema(example = "INVALID_INPUT")
  private String code;

  @Schema(example = "Missing required field")
  private String message;
}
```

---

## Document errors in controllers

```java
@ApiResponse(
  responseCode = "400",
  description = "Invalid input",
  content = @Content(schema = @Schema(implementation = ErrorResponse.class))
)
```

---

# 9. Polymorphism (Advanced)

```java
@Schema(oneOf = {AutoCoverage.class, GeneralLiability.class})
```

Use when:

* Multiple response types
* Agent/tool outputs vary by type

---

# 10. Recommended Structure

## Controllers

* `@Operation`
* `@ApiResponses`
* `@Tag`

## DTOs

* `@Schema` on class + fields
* Validation annotations

## Errors

* Standardized response model

---

# 11. Minimal "Production-Ready" Checklist

Every endpoint must have:

* [ ] `@Operation`
* [ ] `@ApiResponses`
* [ ] Response schema (`@Content`)
* [ ] Parameter descriptions
* [ ] Example request/response

Every DTO must have:

* [ ] `@Schema` on class
* [ ] `@Schema` on fields
* [ ] Validation annotations

---

# 12. Common Mistakes

Avoid:

* Missing `@Schema` → results in `object`
* No validation → weak client contracts
* No examples → unusable docs
* Default responses only → misleading API

---

# 13. Opinionated Best Practices

* Prefer explicit over implicit
* Treat OpenAPI as a **contract**, not documentation
* Optimize for **client generation + agents**, not just Swagger UI
* Keep DTOs clean and stable (avoid leaking internal models)

---

# 14. Example (Full Endpoint)

```java
@Tag(name = "Certificates")
@RestController
@RequestMapping("/certificates")
public class CertificateController {

  @Operation(
    summary = "Create certificate",
    description = "Generates a COI based on coverage data"
  )
  @ApiResponses({
    @ApiResponse(
      responseCode = "200",
      description = "Success",
      content = @Content(
        schema = @Schema(implementation = Certificate.class)
      )
    ),
    @ApiResponse(
      responseCode = "400",
      description = "Invalid input",
      content = @Content(
        schema = @Schema(implementation = ErrorResponse.class)
      )
    )
  })
  @PostMapping
  public Certificate create(
    @RequestBody CreateCertificateRequest request
  ) {
    return service.create(request);
  }
}
```

---

## Summary

High-quality OpenAPI in Spring Boot requires:

* Explicit annotations (`@Operation`, `@ApiResponses`)
* Strong schemas (`@Schema`)
* Validation (`@NotNull`, etc.)
* Examples everywhere

Without these, your API spec will degrade into vague, low-value documentation.
