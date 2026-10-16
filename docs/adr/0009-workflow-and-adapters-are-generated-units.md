# 9. The workflow and the repository adapters are generated like the aggregates

Status: accepted

## Context

Modules 8 and 9 teach with code: the workflow as a pipeline of typed stages, and ports with
adapters. Both are already described by the pack (`workflow`, and a repository per aggregate), so
they can be generated, tested and shown with anchors like everything else.

## Decision

- **Workflow.** One module per pack: a type for every step, an error type that is the union of every
  stage's errors, one function per stage and a pipeline function that wires them. A `validate` stage
  builds value objects through their smart constructors; a `compute` stage applies the pack's
  expressions; a `callPort` or `commit` stage takes a port, whose operation answers with a receipt
  holding the data the stage adds or an error. Errors are values, and the first one ends the run.
  Generated tests check the happy path (with the computed values worked out from the pack), every
  invalid field, and every port error, with the ports after the failing one made to fail the test if
  they are called.
- **Adapters.** Each aggregate gets an in-memory repository implementing its port, with tests that
  a saved aggregate is found and an unknown identity is not.
- Both are generated for all four languages and verified in CI like the aggregates (ADR 7).

## Consequences

- Module 8 and 9 show real code in the learner's language, and the exercises derive from it.
- The workflow's semantics are fixed by this ADR: validate stages only build scalar and enum value
  objects, other stages only add data, and a commit stage implies a port named after the stage.
- Publishing the events a workflow produces is left to the commit port; it is not generated.
