# ADR-0001: Functional API over Builder/Class Pattern

## Status

Accepted

## Context

`typed-gha` generates GitHub Actions workflow YAML from TypeScript source. Several competing libraries in this space take different API shapes:

- `github-actions-wac` — object-literal-first, minimal wrapping
- `github-actions-workflow-ts` — class-based builder (`new Workflow(...).addJob(...)`)
- `gha-ts` and similar — fluent builder chains

The core question: should `typed-gha` expose a **builder/class API**, a **pure functional API** (object literals + helper functions), or a hybrid?

Forces at play:

- **Type inference**: GitHub Actions schema is deeply nested and heterogeneous (triggers as string/array/object, `runs-on` as literal-or-string, etc.). Builder chains often degrade inference because each method re-wraps generics.
- **Composition**: Users frequently want to share pieces (a reusable "setup" step list, a matrix fragment). Plain values compose trivially; builder instances require `.build()` / escape hatches.
- **Readability vs YAML parity**: The output is YAML. A literal-shaped input reads 1:1 against the generated file, easing code review. Builders introduce a translation layer reviewers must mentally undo.
- **User preference** (see `~/.claude/rules/react.md`): arrow functions and function declarations are preferred over class components; classes only when a library demands them.
- **Testability**: Pure functions over plain data are trivially unit-testable (deep-equal on output). Builders require instantiation and lifecycle handling.
- **Future extensibility**: Phase 2 adds `action.yml` → type codegen. Generated action wrappers must interop cleanly with whatever primary API we pick. A functional `makeAction` factory produces values that slot directly into step arrays without any builder glue.

## Decision

Adopt a **pure functional API** as the sole public surface:

- `defineWorkflow(workflow)` — identity function that pins the input type as `const` for maximal literal inference. No runtime transformation.
- Action wrappers (`checkout()`, `setupNode({ with: {...} })`, …) are **functions returning plain `UsesStep` objects**, constructed via a `makeAction<Ref, Inputs, Outputs>()` factory.
- Expression helpers (`secret(name)`, `needs(jobId, key)`, `stepOutput(stepId, key)`, …) return plain interpolated strings — no wrapper type.
- **No classes. No fluent builders. No mutation.** Workflows are values.

Rejected alternatives:

- **Class-based builder** (`new Workflow().addJob(...)`): rejected. Degrades inference on nested unions; conflicts with the user's global "avoid classes" rule; hides YAML structure behind method calls.
- **Fluent functional builder** (`workflow().job(...).step(...)`): rejected. Same inference concerns as classes without the compensating benefit of encapsulation. Harder to splice partial fragments.
- **Hybrid** (builder for workflows, literals for jobs): rejected. Two styles in one API increases cognitive load; the seam between them is a recurring source of type friction in competitors.

## Consequences

Positive:

- Output YAML is visually isomorphic to input TypeScript — diffs review cleanly.
- `as const` inference via `defineWorkflow<const T>` preserves literal types for `runs-on`, `if`, step `id`s, enabling precise error messages and future outputs-typing (Phase 3).
- Reusable fragments are just values: `const setupSteps = [checkout(), setupNode({...})]` and spread into any job.
- `makeAction` factory produces a stable shape that the Phase 2 codegen can emit without any API redesign.
- Aligns with the user's React/global conventions (arrow functions, no classes, derived over imperative).

Negative:

- No IDE chain-completion guidance (`.addJob(` → `.addStep(`). Users must know the workflow shape or lean on TypeScript errors. Mitigated by strong types + examples in README.
- Phantom fields (`__outputs` on `UsesStep`) leak into emitted objects and must be stripped in `emit.ts`. Small runtime cost; isolated to one `clean()` pass.
- Users migrating from builder-style libraries face a syntactic shift, though the mental model (YAML shape) is actually closer to the target.
