# 7. Generated code targets the runtimes Dojo's Piston provides

Status: proposed

## Context

Real execution happens in the host's Piston (ADR 5). Dojo's Piston offers Ruby 3.0.1, Python
3.10/3.12 and TypeScript 5.0.3, with no third-party test frameworks and no way to install packages
at run time (see `docs/spikes/phase-1-spikes.md`).

## Decision

Templates and generated tests use only what those runtimes ship:

- Ruby: syntax and standard library of 3.0 (`Struct` with `keyword_init`, no `Data.define`, no hash
  shorthand); Minitest for tests. The dry-rb variant uses dry-types 1.7, dry-struct 1.6,
  dry-monads 1.6 and dry-validation 1.10, the versions that resolve on Ruby 3.0.
- Python: 3.10-compatible syntax and `unittest`.
- TypeScript: 5.0-compatible syntax; tests use a small harness shipped with the generated code
  instead of Vitest. The repository's CI runs the same harness.

CI runs the generated code on the same major versions (Ruby 3.0, Python 3.10, Node with TypeScript
5.0) so that passing CI means passing in Dojo.

## Consequences

- Generated code never uses newer language features, even where they would read better.
- Raising the baseline later is a template change plus a Dojo runtime bump.
- Ruby with dry-rb additionally needs the gems installed in the Piston image.
