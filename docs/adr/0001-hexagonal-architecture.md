# 1. Hexagonal architecture with enforced layer boundaries

Status: accepted

## Context

The course must be extensible without touching its core: a new programming language, spoken
language, industry or course module should be added as data or templates. The course may also be
embedded as an iframe in another host (Dojo), which changes how code is executed.

## Decision

Source is organised in layers under `src/`: `domain`, `generation`, `content`, `application`,
`ports`, `adapters`, `ui`. Allowed imports are listed in `.dependency-cruiser.cjs` and checked in
CI together with a no-cycles rule. `main.tsx` is the only composition root and wires adapters to
ports. `domain`, `generation` and `application` must not import Node core modules.

## Consequences

- The UI only talks to use cases; swapping an adapter (for example the code runner) never touches
  the domain.
- Layer violations fail the build instead of surfacing in review.
