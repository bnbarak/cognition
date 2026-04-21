# test-coverage — AAA tests + real fakes for third-party deps

## When to use

Any task that involves adding tests to an existing file in this monorepo,
whether driven by the `!test-coverage` playbook or triggered ad-hoc. This
skill encodes the house rules for *how* a test is written — the playbook
decides *what* to test.

## Before you write a single line of test

Read `docs/docs/internal/testing-philosophy.md` first. It is the
authoritative standard. This skill exists to compress it into a checklist
you can act on; it does not replace it.

## Checklist

### Shape

- [ ] Sibling test file: `foo.ts` → `foo.test.ts` in the same folder.
- [ ] Use `vitest` (`import { describe, test, expect } from "vitest"`).
- [ ] Fixture builders at the top of the file (`makeClaim()`, `glLine()`).
- [ ] One `describe` block per behaviour family.
- [ ] Each `test` under ~25 lines.

### AAA

- [ ] No `//` or `/* */` comments inside test bodies. None.
- [ ] Exactly **one** blank line between Arrange and Act.
- [ ] Exactly **two** blank lines between Act and Assert.
- [ ] Method name: `functionName_specificCase` (or `behaviour_specificCase`).

Example shape (copy this, delete the text):

```ts
test("NAME_HERE", () => {
  // Arrange goes here, no header comment


  // Act goes here, one blank line above, two blank below


  // Assert goes here
});
```
(Remove the `//` comments once you've internalised the positions.)

### Test doubles — prefer the weakest

Preference order when the unit under test has a collaborator:

1. **Real object** (pure function, in-memory state machine, etc.).
2. **Fake** — a working in-process impl that obeys the real contract.
3. **Mock** — interaction-asserting stub. Last resort.

Before writing a fake from scratch, **check for a vendor-supplied
testkit**:

| Dep                 | Testkit                                       |
| ------------------- | --------------------------------------------- |
| OAuth2 / OIDC       | `oauth2-mock-server`                          |
| HTTP fetch          | `msw`, `nock`, `undici` `MockAgent`           |
| Postgres            | `pg-mem`, `testcontainers-node`               |
| Redis               | `ioredis-mock`, `testcontainers-node`         |
| AWS SDK v3          | `aws-sdk-client-mock`                         |
| Kafka               | `testcontainers-node` + `confluentinc/cp-kafka` |
| LDAP                | `ldapjs`                                      |
| SMTP                | GreenMail (Java), `smtp-tester` (Node)        |

If one exists, **use it**. Do not hand-roll.

### Determinism

- [ ] No `new Date()` / `Date.now()` in test bodies — inject an
      `isoTimestamp: string` or `now: () => number`.
- [ ] No `Math.random()` / `crypto.randomUUID()` in production code that
      tests touch — inject a generator.
- [ ] No sleeps. Await.
- [ ] No real network except to in-process testkits.

### Assertion discipline

- [ ] Derive expected values **from the fixture**, by hand, before running.
- [ ] Do not paste "whatever the code returned."
- [ ] Assertions must fail if the code is broken (sanity check: mutate the
      source, rerun, watch it fail).

## Running the suite

```bash
cd javascript
npm run typecheck     # tsc --noEmit — must pass
npm run test          # vitest run — must pass
npm run coverage      # vitest run --coverage — capture baseline for PR
```

Coverage reporter is v8. Output lands in `coverage/` (HTML at
`coverage/index.html`).

## Using `oauth2-mock-server` for HARD 2

`oauth2-mock-server` is an ESM package. Import it **dynamically** inside
`beforeAll`, then start on port `0` (ephemeral):

```ts
import { afterAll, beforeAll } from "vitest";
import type { OAuth2Server } from "oauth2-mock-server";

let server: OAuth2Server;
let tokenEndpoint: string;

beforeAll(async () => {
  const { OAuth2Server } = await import("oauth2-mock-server");
  server = new OAuth2Server();
  await server.issuer.keys.generate("RS256");
  await server.start(0, "127.0.0.1");
  tokenEndpoint = `${server.issuer.url}/token`;
});

afterAll(async () => {
  if (server) await server.stop();
});
```

To simulate a rejected credential, hook `beforeResponse`:

```ts
server.service.on("beforeResponse", (response, req) => {
  if (req.body?.grant_type === "password" && req.body?.username === "denied@example.com") {
    response.statusCode = 400;
    response.body = { error: "invalid_grant", error_description: "Bad credentials" };
  }
});
```

The server issues real RS256-signed JWTs against a real JWKS. If your code
verifies tokens, it will exercise the real verification path — you do not
need to mock signing.

## Files to crib from

- EASY reference: <ref_file file="/home/ubuntu/repos/cognition/javascript/src/lib/coverage-validation.test.ts" />
- HARD 1 reference: <ref_file file="/home/ubuntu/repos/cognition/javascript/src/lib/claim-transitions.test.ts" />
- HARD 2 reference (pure IdP): <ref_file file="/home/ubuntu/repos/cognition/javascript/src/lib/oidc-identity-provider.test.ts" />
- HARD 2 reference (Express integration): <ref_file file="/home/ubuntu/repos/cognition/javascript/src/routes/auth.test.ts" />
