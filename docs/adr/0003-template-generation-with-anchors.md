# 3. Code generation with templates, a view model and anchors

Status: accepted

## Context

Example code must be idiomatic per language and generated from the pack. The UI relates each code
block to the wall note that originated it.

## Decision

Pack -> language-specific view model (pure, tested) -> logic-light templates. A programming
language is a descriptor (naming conventions, reserved words, type map, operators, file layout,
test harness) plus template directories, and needs no change to the core. Templates mark ranges
with an anchor helper; the renderer returns clean code plus `ref -> line range` anchors.

## Consequences

- Adding a language is data and templates.
- Logic lives in the view model, where it has unit tests.
- Generated output for the default domain is covered by golden snapshots, so template changes are
  reviewed as readable diffs.
