# Claims Controller (TypeScript / Express)

**Base URL:** `http://localhost:3000`
**Source:** `javascript/src/routes/claims.ts`

The Claims controller handles insurance claim filing, tracking, status management, and adjuster assignment. Claims follow a defined lifecycle: submitted → under_review → approved/denied → settled → closed.

## Controllers

| Controller | Base Path | Concern |
|-----------|-----------|---------|
| Claims | `/api/claims` | Claim filing, status transitions, notes, adjuster assignment |

**Claim Categories:** auto_collision, property_damage, bodily_injury, theft, natural_disaster, liability, workers_comp

**Status Lifecycle:**

- `submitted` → `under_review`, `denied`
- `under_review` → `approved`, `denied`
- `approved` → `settled`
- `denied` → `closed`
- `settled` → `closed`

---

## API Reference

::OAD(../specs/express-openapi.json, tag=Claims)
