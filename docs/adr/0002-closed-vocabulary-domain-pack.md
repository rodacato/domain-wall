# 2. The domain pack is a closed-vocabulary contract

Status: accepted

## Context

An LLM may generate the domain pack for an arbitrary business. Generated code and tests must be
deterministic and trustworthy, and the LLM must never write code or concept explanations.

## Decision

The pack is strict JSON validated by Zod. Rules, effects, workflow stages and anti-corruption
mappings come from small closed vocabularies (predicate, expression and effect kinds). Every
concept separates a stable English `codeName` from per-locale labels. Every value object carries
valid and invalid examples, and every rule carries a violation scenario, so tests are derived
without a solver. Names follow a reversible convention (no consecutive capitals) so a code in one
language's casing maps back to the canonical `codeName`.

## Consequences

- A generated business cannot express arbitrary logic. This is deliberate for a teaching tool.
- Templates and test generators can be exhaustively tested.
- Extending the vocabulary is a schema change plus an update of every language's templates.
