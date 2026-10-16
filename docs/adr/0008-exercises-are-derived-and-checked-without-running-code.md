# 8. Exercises are derived from the pack and checked without running code

Status: accepted

## Context

Every module ends with an exercise (see the syllabus). Writing them by hand per industry would
break the rule that the course template is fixed and only the pack changes. Running the learner's
code needs the host's Piston (ADR 5), which is not available when the course runs on its own.

## Decision

- **Derived, not authored.** An exercise is computed from the loaded pack. Six need no code: where
  a rule lives, business language versus jargon, ordering events by their sequence, assigning notes
  to contexts, what each field of the anti-corruption translation does, and classifying subdomains.
  They are a closed set of challenges (classify, order) with a checker, so a new pack never needs a
  new exercise.
- **Code exercises take a piece out of generated code.** Implement the rule, implement the change
  (the rule the evolution adds), wire a stage into the pipeline and write the line that stores an
  aggregate in an in-memory adapter. The hole is the line range of an anchor (ADR 3), so it is the
  same in every language.
- **Judged by syntax and shape, never by "passed".** A `SyntaxChecker` port (tree-sitter compiled
  to WebAssembly, adapter in `adapters/syntax`) tells whether the assembled file is well formed.
  The answer must also mention what a correct one must: the rule's error code and the data the
  reference solution reads. Only code counts: comments are blanked out with the same parser, and
  the data must be named outside a string. The verdict says the generated tests run in Dojo; it
  never claims they passed. A host that can execute code later adds a second runner behind the same
  exercise, and the progress records which of the two said yes ("checked, not run" or "tests
  passed").

## Consequences

- The learner gets feedback offline in all four languages, and the same exercise works for every
  industry, including generated packs.
- A correct answer written differently from the reference can be rejected if it avoids the data the
  reference reads. The reference is shown on request, and the real tests are the final word once
  the host runs them.
- Tree-sitter grammars (about 1.5 MB of WebAssembly) are loaded only when an exercise is checked.
