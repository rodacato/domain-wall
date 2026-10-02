# Ubiquitous language of the project

| Term                  | Meaning                                                                                                 |
| --------------------- | ------------------------------------------------------------------------------------------------------- |
| Wall                  | The animated Event Storming canvas on which the whole course happens.                                   |
| Note                  | A sticky note on the wall; its kind follows the Event Storming colour convention.                       |
| Scene                 | A declarative sequence of wall commands that teaches one idea.                                          |
| Concept               | The smallest unit of progress; identified by a stable concept id, independent of industry and language. |
| Module                | One of the ten ordered parts of the syllabus; a set of concepts, scenes and exercises.                  |
| Domain pack           | JSON with everything specific to an industry; the contract the course renders over.                     |
| Code name             | The stable English identifier of a pack concept, used by generated code.                                |
| Label                 | The per-locale display text of a pack concept.                                                          |
| Rule                  | A predicate with an error code and message; used as a transition guard or an aggregate invariant.       |
| Violation scenario    | A command sequence that must be rejected by exactly one rule.                                           |
| Anchor                | A mapping from a generated code line range to the pack concept that originated it.                      |
| Gate                  | A validation stage a generated pack must pass before activation (schema, semantics, code).              |
| Reference interpreter | The pure interpreter that executes the aggregate DSL.                                                   |
| Run outcome           | The result of asking a runner to check or execute code: executed, or syntax-checked only.               |
| Preset                | A curated, pre-generated and reviewed domain pack.                                                      |
