# Doc-Update Agent — Flow Map

## System Flow

```mermaid
flowchart TD
    Engineer["👤 Engineer\nMerges a code PR"]
    Engineer -->|"Triggers"| Devin["🤖 Devin Agent\n(doc-update playbook)"]

    Devin -->|"Runs"| CLI["⚙️ Diff Analyzer CLI\nDeterministic analysis"]
    CLI -->|"Reads"| DomainMap["📋 Domain Map\n(domain-map.yaml)"]
    CLI -->|"Outputs"| ActionPlan["📊 Action Plan\naffectedSpecs, unmappedFiles,\nhasNewController"]

    ActionPlan -->|"Informs"| Devin

    Devin -->|"Reads"| Skills["📖 Skill Files\nAnnotation language,\nExpress/Java patterns"]
    Devin -->|"Updates"| Annotations["✏️ Source Code Annotations\n@openapi JSDoc, @Operation"]
    Devin -->|"Edits"| Docs["📄 Narrative Docs\nindex, product, auth pages"]

    Annotations -->|"Feeds"| SpecGen["⚙️ Spec Generator Script\n(generate-openapi-specs.sh)"]
    SpecGen -->|"Produces"| Specs["📦 OpenAPI Specs\nexpress-openapi.json,\nspringboot-openapi.json"]
    Specs -->|"Rendered by"| OAD["🔌 MkDocs OAD Plugin\nAuto-generates API reference pages"]

    Devin -->|"Creates"| DocsPR["📬 Docs PR\nWith confidence label"]
    DocsPR -->|"Reviewed by"| Reviewer["👤 Reviewer\n(if not HIGH confidence)"]

    style Engineer fill:#e3f2fd
    style Reviewer fill:#e3f2fd
    style Devin fill:#fff3e0
    style CLI fill:#e8f5e9
    style SpecGen fill:#e8f5e9
    style OAD fill:#e8f5e9
    style DomainMap fill:#f3e5f5
    style Skills fill:#f3e5f5
    style ActionPlan fill:#f3e5f5
    style Annotations fill:#fce4ec
    style Docs fill:#fce4ec
    style Specs fill:#fce4ec
    style DocsPR fill:#e0f7fa
```

---

## Stakeholder Roles

| Stakeholder | Role | When Involved |
|-------------|------|---------------|
| **Engineer** | Merges code PRs that change API endpoints or business logic | Triggers the agent; reviews docs PR if confidence is MEDIUM/LOW |
| **Devin Agent** | Orchestrates the full flow — reads analysis, writes annotations & docs, creates PR | Runs the playbook end-to-end |
| **Diff Analyzer CLI** | Pre-computes what changed and what needs updating (deterministic) | Called by agent early on; outputs structured JSON with action plan |
| **Domain Map** | Source of truth mapping code files → doc pages → specs | Read by CLI and agent; updated by agent when new controllers appear |
| **Skill Files** | Define writing style, annotation patterns, and domain-map rules | Read by agent before writing any content |
| **Spec Generator Script** | Starts servers, fetches live OpenAPI specs, saves to disk | Run by agent only for specs listed in affectedSpecs |
| **MkDocs OAD Plugin** | Auto-renders API reference pages from OpenAPI spec files | Runs at build time — no manual work needed |
| **Reviewer** | Human who reviews the docs PR when confidence is not HIGH | Only involved when agent flags uncertainty |

---

## What's Deterministic vs. Agent Decision

| Deterministic (CLI / Scripts) | Agent Decides (LLM) |
|-------------------------------|---------------------|
| Which files changed | How to group files into concerns |
| Which specs need regeneration | Which update path per group (A/B/both) |
| Which files are unmapped | What to write in annotations & docs |
| Whether there's a new controller | Confidence assessment per group |
| Noise filtering | Whether to auto-submit or flag for review |
