# InsureCRM — Internal Testing Philosophy

> **Audience:** every engineer who writes or reviews a test in this monorepo.
> **Status:** standard. Deviations require Chief Architect sign-off.
> **Last reviewed:** 2026-Q1.

This document describes *how* we write tests at InsureCRM. It exists because
our compliance-critical paths — authentication, transactions, PII handling,
audit logging — are regulated, and because tests are one of our primary
control mechanisms. Tests that are hard to read, hard to trust, or hard to
run are worse than no tests.

The rules below are small, strict, and deliberately opinionated. If you find
yourself wanting to break one, talk to the reviewer — do not silently skip.

---

## 1. AAA, always

Every unit test is structured **Arrange → Act → Assert**, in that order,
with exactly:

- **one blank line** between Arrange and Act
- **two blank lines** between Act and Assert

The structure speaks for itself. It is the single most reliable readability
signal in a large codebase.

```ts
test("advanceClaim_submittedToUnderReview_setsStatusAndUpdatedAt", () => {
  const claim = makeClaim({ status: "submitted" });


  const result = advanceClaim(claim, "under_review", { isoTimestamp: FIXED_TS });


  expect(result.ok).toBe(true);
  if (result.ok) {
    expect(result.claim.status).toBe("under_review");
    expect(result.claim.updatedAt).toBe(FIXED_TS);
  }
});
```

If a test needs multiple acts (e.g. "fail four times, then succeed, then fail
four more times"), the last act is the one that matters; the rest belong in
the Arrange block. If that's awkward, the test is doing two things — split it.

## 2. No comments in test bodies

The test body contains **zero** `//` or `/* */` comments.

- No `// Arrange` / `// Act` / `// Assert` headers — the blank lines are the
  headers.
- No `// this tests that X` — the test name already says that.
- No `// TODO` — open a ticket and link it from the PR description instead.

If you feel the urge to write a comment, the fix is almost always a better
test name or a better-named helper.

## 3. Test names describe *what* is tested

Format: `functionName_specificCase` (or `behaviour_specificCase` for
integration-level tests).

**Good**

- `validateCoverageLimits_generalLiability_aggregateBelowEachOccurrence`
- `advanceClaim_closedToAnything_rejected`
- `login_fiveFailures_locksAccountFor15Minutes`

**Bad**

- `happyPath`, `test1`, `shouldWork`
- `itReturnsTrue` (returns true under what conditions? for what input?)
- `testValidateCoverageLimits` (which case?)

The name must be specific enough that, on CI failure, a reader can
reasonably guess what broke **without opening the test file**.

## 4. Test-double hierarchy: real > fake > mock

When a unit under test has a collaborator, pick the weakest double that
still yields a trustworthy test. In descending order of preference:

1. **Real object.** If the collaborator is pure, in-process, and cheap, just
   use it. Pure functions, in-memory data structures, small deterministic
   state machines — no double needed.
2. **Fake.** A working in-process implementation that obeys the real
   contract but is cheaper / faster / more controllable — for example
   `oauth2-mock-server` as a stand-in for the enterprise SSO, an in-memory
   `Map` as a stand-in for a database, a `FakeClock` as a stand-in for
   `Date.now`. Fakes are *tested through*; they behave like the real thing.
3. **Mock / stub.** Interaction-asserting doubles that hard-code return
   values or record calls. Allowed — but only when (1) and (2) are
   genuinely impractical (e.g. asserting that a billing event was emitted
   exactly once, where behaviour doesn't matter but the call does).

Mocks tend to couple tests to implementation detail and rot the moment the
code is refactored. Reach for them last.

## 5. Always look for third-party testing utilities first

Before writing a fake or a mock, **check whether the dependency itself ships
one.** Most mature ecosystem libraries do:

| Dependency kind         | First thing to check                                          |
| ----------------------- | ------------------------------------------------------------- |
| OAuth2 / OIDC           | `oauth2-mock-server` (real issuer, real JWKS, real RS256 JWTs) |
| HTTP clients            | `msw`, `nock`, `undici`'s `MockAgent`                         |
| SQL / Postgres          | `pg-mem`, `testcontainers-node` with `postgres:alpine`        |
| Redis                   | `ioredis-mock`, `testcontainers-node` with `redis:alpine`     |
| AWS SDK                 | `aws-sdk-client-mock` (v3), `@aws-sdk` `MockAgent`            |
| Kafka                   | `testcontainers-node` with `confluentinc/cp-kafka`            |
| LDAP                    | `ldapjs` in-process server                                    |
| Spring Boot email       | `GreenMail` (SMTP)                                             |
| Java generally          | Testcontainers, WireMock                                       |

If the vendor publishes a testkit, use it. Writing your own bespoke stub of
somebody else's protocol almost always drifts from reality in ways that
only surface in production.

## 6. Determinism

Tests must be deterministic.

- No `Math.random()` — inject a seeded RNG or fix the output.
- No `new Date()` / `Date.now()` in test bodies — pass an `isoTimestamp` or a
  `now: () => number` into the unit under test.
- No real network, no real filesystem outside the project tree.
- No sleeps. If you're waiting on work to complete, await it.

If something is non-deterministic by nature (e.g. retry jitter), capture the
seam (the RNG, the clock) and inject it.

## 7. Validate your expected values

When a test uses fixture data, **derive the expected values from the fixture
by hand** before asserting them. Do not copy what the code produced on the
first run.

- Count diff additions / deletions manually and assert those numbers.
- Compute the expected JWT `iss` claim from the issuer URL the test stood up.
- Write the expected error message before you run the test, then make it
  pass.

Tests whose assertions were "whatever the code returned last time" do not
fail when the code breaks — they fail only when the code changes. That is
not coverage, it is sunk cost.

## 8. Shape of a good test file

- One file per module under test. `foo.ts` → `foo.test.ts`, right next to it.
- Group related cases into `describe` blocks named after the behaviour — not
  the function name, which is already encoded in the test names.
- Put fixture builders (`makeClaim()`, `glLine()`) at the top of the file,
  not inside a shared helper unless genuinely reused across files.
- Keep each test under ~25 lines. Long tests almost always collapse to two
  short ones.

---

## Appendix — why we are strict about this

We are a regulated business. The OCC cares about whether a control is
*demonstrable*, not whether it *exists*. A test that a reviewer can't read
in fifteen seconds is a test that won't survive the next refactor, and a
test that won't survive the next refactor is not a control — it's
decoration.

The rules above optimise for:

- **Readability under failure** (test names tell the story)
- **Robustness under refactor** (real objects and fakes survive; mocks don't)
- **Reproducibility for auditors** (determinism + third-party testkits means
  anyone can re-run the evidence)
