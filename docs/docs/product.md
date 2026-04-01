# InsureCRM — Product Overview

## What is InsureCRM?

InsureCRM is a **Customer Relationship Management** platform built specifically for **insurance agencies**. It streamlines day-to-day operations by combining client management, policy tracking, and communication tools into a single platform.

## Key Features

### Client Management
- Maintain a centralized database of all clients and prospects
- Track contact information, policy history, and communication preferences
- Tag and segment clients for targeted outreach
- Assign clients to specific agents within the agency

### Policy Tracking
- Link multiple insurance policies to each client (auto, home, life, health, commercial)
- Track policy status, renewal dates, and premium amounts
- Receive alerts for upcoming renewals and expirations

### Email Communication
- Send individual and bulk emails directly from the CRM
- Use pre-built templates for common communications (welcome emails, renewal reminders, claim updates)
- Track email delivery status, opens, and clicks
- Automatically match inbound emails to client records
- Tag and classify received emails for efficient triage

### Authentication & Access Control
- Role-based access: Admin, Agent, and Viewer roles
- Secure JWT-based authentication
- Password reset and recovery flows

## Architecture

InsureCRM follows a microservices architecture:

- **Core API** — Handles authentication, client records, and policy data. Built with TypeScript and Express.
- **Email Service** — Manages all outbound and inbound email operations. Built with Java and Spring Boot.

Both services expose OpenAPI (Swagger) documentation for easy integration and development.

## Target Users

- Independent insurance agents
- Insurance agency office managers
- Insurance agency administrators
- Carrier relationship managers
