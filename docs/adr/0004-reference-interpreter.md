# 4. A reference interpreter for the aggregate DSL

Status: accepted

## Context

Wall animations (breaking invariants, the functional pipeline) must be instant and must not depend
on a language runtime. Generated tests in four languages need an independent oracle.

## Decision

The domain layer contains a small pure interpreter for the closed aggregate DSL: it executes
commands against aggregate state and reports the first rejecting rule. It validates pack scenarios
during semantic validation and drives interactive animations. CI compares generated test outcomes
against what the interpreter predicts.

## Consequences

- The DSL semantics exist twice (interpreter and templates); differential testing keeps them aligned.
- The wall's interactions work before any runtime is loaded.
