# Doc-Update Agent — Overview

## 1. System Flow (High Level)

```mermaid
flowchart TD
    Engineer["👤 Engineer\nMerges a code PR"]
    Engineer -->|"Triggers"| Agent["🤖 Devin Agent\n(Reactive — see below)"]

    Agent -->|"Runs"| CLI["⚙️ Diff Analyzer CLI"]
    CLI -->|"Reads"| DomainMap["📋 Domain Map"]
    CLI -->|"Outputs"| ActionPlan["📊 Action Plan"]
    ActionPlan -->|"Informs"| Agent

    Agent -->|"Reads"| Skills["📖 Skills & Knowledge\n(see below)"]
    Agent -->|"Updates"| Code["✏️ Source Code\nAnnotations"]
    Agent -->|"Edits"| Docs["📄 Narrative Docs"]

    Code -->|"Feeds"| SpecGen["⚙️ Spec Generator"]
    SpecGen -->|"Produces"| Specs["📦 OpenAPI Specs"]
    Specs -->|"Rendered by"| OAD["🔌 MkDocs OAD"]

    Agent -->|"Creates"| DocsPR["📬 Docs PR"]
    DocsPR -->|"Reviewed by"| Reviewer["👤 Reviewer"]

    style Engineer fill:#e3f2fd
    style Reviewer fill:#e3f2fd
    style Agent fill:#fff3e0
    style CLI fill:#e8f5e9
    style SpecGen fill:#e8f5e9
    style OAD fill:#e8f5e9
    style DomainMap fill:#f3e5f5
    style Skills fill:#f3e5f5
    style ActionPlan fill:#f3e5f5
    style Code fill:#fce4ec
    style Docs fill:#fce4ec
    style Specs fill:#fce4ec
    style DocsPR fill:#e0f7fa
```

---

## 2. Agent Figures Out What to Update

The agent reads the action plan from the CLI and builds a work list. This is the **analysis phase** — no files are modified yet.

```mermaid
flowchart TD
    Start["Receive action plan\nfrom CLI"] --> ReadMap["Read domain-map.yaml"]
    ReadMap --> HasSpecs{"affectedSpecs\nnon-empty?"}

    HasSpecs -->|"Yes"| MarkSpecs["Mark specs for regeneration\n(only the affected ones)"]
    HasSpecs -->|"No"| SkipSpecs["No spec work needed"]

    MarkSpecs --> CheckUnmapped
    SkipSpecs --> CheckUnmapped

    CheckUnmapped{"unmappedFiles\nnon-empty?"} -->|"Yes"| NewCtrl{"hasNewController?"}
    CheckUnmapped -->|"No"| GroupConcerns

    NewCtrl -->|"Yes"| PlanOnboard["Plan: onboard new controller\n(new doc page, domain-map entry,\nmkdocs.yml nav update)"]
    NewCtrl -->|"No"| ReviewUnmapped["Flag unmapped files\nfor narrative review"]

    PlanOnboard --> GroupConcerns
    ReviewUnmapped --> GroupConcerns

    GroupConcerns["Group all files into\nconcern groups\n(using domain-map.yaml)"] --> TooMany{"> 7 groups?"}

    TooMany -->|"Yes"| Bail["STOP: PR too complex\nReport to user"]
    TooMany -->|"No"| Classify

    Classify["For each group, classify:\nAPI-affecting? Narrative? Both?"] --> WorkList["Work list ready\n→ proceed to execution"]

    style Start fill:#e8f5e9
    style HasSpecs fill:#fff3e0
    style CheckUnmapped fill:#fff3e0
    style NewCtrl fill:#fff3e0
    style TooMany fill:#fff3e0
    style Bail fill:#ffcdd2
    style WorkList fill:#e0f7fa
```

---

## 3. Agent Executes Updates

With the work list ready, the agent processes each concern group. This is the **execution phase** — files are read and modified.

```mermaid
flowchart TD
    WorkList["Work list from\nanalysis phase"] --> ForEach{"Next concern\ngroup"}

    ForEach --> ChoosePath{"Classified as?"}
    ChoosePath -->|"API (Path A)"| ReadSkills["Read annotation-language\n+ framework skill"]
    ChoosePath -->|"Narrative (Path B)"| ReadDocs["Read current doc pages"]
    ChoosePath -->|"Both"| ReadBoth["Read skills + doc pages"]

    ReadSkills --> WriteAnnotations["Update source code\nannotations"]
    WriteAnnotations --> RegenSpecs["Regenerate only\naffected specs"]
    RegenSpecs --> Confidence

    ReadDocs --> EditMarkdown["Edit markdown docs\ndirectly"]
    EditMarkdown --> Confidence

    ReadBoth --> WriteAnnotations2["Update annotations"]
    WriteAnnotations2 --> RegenSpecs2["Regenerate specs"]
    RegenSpecs2 --> EditMarkdown2["Edit markdown docs"]
    EditMarkdown2 --> Confidence

    Confidence["Assess confidence\n(HIGH / MEDIUM / LOW)"] --> MoreGroups{"More concern\ngroups?"}
    MoreGroups -->|"Yes"| ForEach
    MoreGroups -->|"No"| Stamps["Update freshness stamps\non all touched pages"]

    Stamps --> CreatePR["Create docs PR\nwith confidence label"]

    style WorkList fill:#e8f5e9
    style ChoosePath fill:#fff3e0
    style MoreGroups fill:#fff3e0
    style CreatePR fill:#e0f7fa
```

---

## 4. Skills & Knowledge Base

The agent's context comes from two sources: **skill files** (in-repo, versioned) and **knowledge notes** (Devin cloud, org-scoped).

```mermaid
flowchart LR
    subgraph Skills["📖 Skill Files (in repo)"]
        direction TB
        S1["annotation-language\nWriting style & quality\nstandards for all annotations"]
        S2["express-openapi\nJSDoc @openapi structural\npatterns (TypeScript)"]
        S3["java-openapi\n@Operation / @Schema\npatterns (Spring Boot)"]
        S4["update-domain-mapping\nRules for maintaining\ndomain-map.yaml"]
        S5["diff-analyzer\nCLI usage, output shape,\nall flags & options"]
    end

    subgraph Knowledge["🧠 Knowledge Notes (Devin cloud)"]
        direction TB
        K1["Domain Mapping\nWhere domain-map.yaml lives,\nhow to read it"]
    end

    subgraph Config["📋 Config Files (in repo)"]
        direction TB
        C1["domain-map.yaml\nCode → docs → specs\nmapping (source of truth)"]
        C2["doc-update playbook\nMain orchestration prompt\n(9 steps)"]
    end

    Agent["🤖 Devin Agent"] -->|"Reads before\nwriting annotations"| S1
    Agent -->|"Reads for\nExpress patterns"| S2
    Agent -->|"Reads for\nJava patterns"| S3
    Agent -->|"Reads when updating\ndomain map"| S4
    Agent -->|"Reads for\nCLI reference"| S5
    Agent -->|"Reads for\nrepo context"| K1
    Agent -->|"Uses as compass\nfor all decisions"| C1
    Agent -->|"Follows step\nby step"| C2

    style Agent fill:#fff3e0
    style Skills fill:#e8f5e9
    style Knowledge fill:#e3f2fd
    style Config fill:#f3e5f5
```

**Skill files** are read by the agent at specific moments during execution — they define _how_ to write, not _what_ to write. The agent reads annotation-language first (quality bar), then the relevant framework skill (Express or Java) for structural patterns.

**Knowledge notes** provide org-level context that persists across sessions. Currently minimal (just domain-map location), but designed to grow as the system handles more repos.

---

## 5. What's Deterministic vs. Agent Decision

| Deterministic (CLI / Scripts) | Agent Decides (LLM) |
|-------------------------------|---------------------|
| Which files changed | How to group files into concerns |
| Which specs need regeneration | Which update path per group (A/B/both) |
| Which files are unmapped | What to write in annotations & docs |
| Whether there's a new controller | Confidence assessment per group |
| Noise filtering | Whether to auto-submit or flag for review |
