# ADR-0002: Handwritten Action Types in Phase 1, Codegen from `action.yml` in Phase 2

## Status

Accepted

## Context

A core differentiator of `typed-gha` against existing TypeScript-to-workflow libraries is **typed inputs and outputs for third-party actions** (e.g., `actions/checkout@v4`, `actions/setup-node@v4`). The question is how to source those types.

Options considered:

1. **Handwritten wrappers, small curated set** — maintain typed wrappers for the ~10 most-used actions (`checkout`, `setup-node`, `setup-pnpm`, `setup-go`, `setup-python`, `setup-bun`, `cache`, `upload-artifact`, `download-artifact`, `wrangler`, `configure-aws-credentials`).
2. **Codegen from `action.yml`** — fetch `action.yml` from GitHub for a pinned `owner/repo@ref`, parse its `inputs:` / `outputs:` schema, and emit a typed wrapper. Ship the generator as a CLI command (`gha add actions/checkout@v4`) that writes into a local `typed-gha/actions/` directory the user commits.
3. **Runtime reflection** — no types, just pass-through. Rejected: loses the entire value proposition.

Forces:

- **Time to first usable release**: Option 1 ships in a day. Option 2 requires a robust `action.yml` parser (the schema is under-specified — inputs may lack types, use `default` to infer, have deprecation markers, or be composite/docker/node actions with different conventions), semver-ref resolution, and a reviewable output format.
- **Coverage vs correctness**: Option 1 covers ~80% of real-world workflows (the listed 10 actions dominate usage by Octoverse data) but can never cover the long tail. Option 2 covers everything but only if the generator handles edge cases correctly — a bad generator produces confidently-wrong types, worse than no types.
- **Maintenance drift**: Handwritten types drift when upstream actions add inputs. Codegen drifts only when the user chooses to re-pin a ref — drift is explicit and scoped.
- **Differentiation**: The handwritten approach is table stakes (competitors do this). The codegen approach is the actual moat. Shipping only Phase 1 would be undifferentiated; committing to Phase 2 is what makes the project worth publishing.

## Decision

**Two-phase rollout:**

**Phase 1 (MVP, ship now):** Handwritten typed wrappers for 10 actions, bundled in `@typed-gha/core/actions`. Each wrapper is a thin `makeAction<Ref, Inputs, Outputs>()` invocation with hand-authored `Inputs` / `Outputs` interfaces.

**Phase 2 (post-MVP, differentiation release):**

- Introduce `@typed-gha/codegen` package with `gha add <owner/repo@ref>` command.
- Parser reads `action.yml` (raw.githubusercontent.com), validates against a known subset of the GitHub Actions metadata schema, and emits a wrapper file into a user-owned directory (`.github/typed-gha-actions/` by default, configurable).
- Emitted wrappers use the **same `makeAction` factory shape** as Phase 1 handwritten ones — they are drop-in interchangeable.
- Handwritten wrappers in `@typed-gha/core/actions` remain as a "blessed" set for zero-config usage.
- `typed-gha/actions` namespace on npm is reserved now to allow future split of blessed wrappers from core if size becomes a concern.

Phase 3 (stretch) — outputs type inference across `needs()` / `steps.<id>.outputs` — is deferred; it depends on Phase 2's typed outputs reaching critical mass.

## Consequences

Positive:

- **Ships fast**: Phase 1 unblocks dogfooding and early feedback on the core API (the ADR-0001 decision) without waiting on the hard parser work.
- **Phase 2 has no API breakage risk**: because both phases emit the same `makeAction`-produced shape, users' workflow code written against Phase 1 keeps working unchanged when they adopt codegen.
- **Clear scope boundary**: Phase 1 can be reviewed and released on its own merits; Phase 2 is evaluated independently against "does the parser produce correct types for N sampled actions".
- **User-owned codegen output**: Emitting into the user's repo (rather than node_modules) means the user reviews the types, commits them, and controls re-generation — avoiding the "mystery types" problem.

Negative:

- **README must set expectations**: without Phase 2 shipped, `typed-gha` looks similar to competitors. Mitigate by explicitly calling out the roadmap and the `gha add` preview.
- **Handwritten wrappers need manual updates** when upstream actions rev (e.g., `setup-node@v4` → `@v5`). Acceptable for a small curated set; documented as a known Phase 1 limitation.
- **Two sources of truth during Phase 2 transition**: the blessed wrappers in core and user-generated wrappers. Mitigation: if the user generates a wrapper for an action already in core, the local one shadows by import path — no conflict, explicit user choice.
- **Parser edge cases are real work**: composite actions, docker actions, actions without `action.yml` at the ref root, private actions (auth). Scoped out of Phase 1; Phase 2 will need its own ADR covering scope limits.
