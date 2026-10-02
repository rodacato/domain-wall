# Phase 1 spikes

Findings from the risk spikes of phase 1. Each one lists what was tried, what was measured and what
it means for the plan.

## 1. Syntax checking in the browser

**Tried:** `@vscode/tree-sitter-wasm` 0.3.1 (its own tree-sitter runtime plus prebuilt grammars) in
Node, parsing one valid and one broken sample each of TypeScript, Python and Ruby.

**Result:** works. Valid code parses without errors; every broken sample is flagged by
`rootNode.hasError`. Loading a grammar takes under 10 ms once the bytes are in memory.

| Asset               | Uncompressed size |
| ------------------- | ----------------- |
| tree-sitter runtime | 206 KB            |
| TypeScript grammar  | 1.4 MB            |
| Python grammar      | 458 KB            |
| Ruby grammar        | 2.1 MB            |

Only the runtime and the grammar of the learner's language are fetched, on demand.

**Rejected:** `tree-sitter-wasms` + `web-tree-sitter` 0.27. The prebuilt grammars were built against
an older tree-sitter ABI and fail to load ("dylink metadata").

**Caveat:** tree-sitter reports that code _parses_, not which diagnostics a compiler would give.
Diagnostics in the UI will therefore be "line N has a syntax error", not full compiler messages.

## 2. Code execution in Dojo's Piston

Dojo already runs Piston (`scripts/piston-reprovision.sh`, `docker-compose.yml`). Facts that shape
the generated code:

| Runtime in Dojo's Piston | Version                  |
| ------------------------ | ------------------------ |
| Ruby                     | 3.0.1                    |
| Python                   | 3.10.0 and 3.12.0        |
| TypeScript               | 5.0.3                    |
| Go / Rust / SQLite       | 1.16.2 / 1.68.2 / 3.36.0 |

The script notes that upstream Piston ships no newer Ruby; a bump needs a fork or a custom image
layer.

**Consequences for the templates** (see ADR 7):

- Ruby templates must run on 3.0: no `Data.define` (3.2), no hash shorthand `new(x:)` (3.1).
- Python templates must run on 3.10.
- Piston has no Vitest, pytest or RSpec. Tests are generated against what the runtimes ship:
  `unittest` for Python, Minitest for Ruby, and a small dependency-free harness for TypeScript.

**dry-rb on Ruby 3.0.1 works.** In a `ruby:3.0.1-slim` container, `gem install` resolved
dry-types 1.7.2, dry-struct 1.6.0, dry-monads 1.6.0, dry-validation 1.10.0, dry-core 1.0.2 and
dry-schema 1.13.4, and an `Order` aggregate built from `Dry::Struct` with a `Result`-returning
`place` method ran correctly, including `new(to_h.merge(...))` with a nested struct list.

**Shipping the gems inside each Piston request does not work.** Piston parses request bodies with
`body_parser.json()` and no limit option (`api/src/index.js`), which defaults to 100 KB, while the
dry-rb gems and their dependencies are several MB. The gems are instead installed
into the Ruby package directory on Piston's volume, which was verified end to end; see
`dry-rb-in-dojo-piston.md`. Until Dojo provisions them, Ruby with dry-rb is generated, displayed
and verified in this repository's CI, and executed only where those gems exist.

## 3. Structured output from an LLM

**Tried:** converting the pack schema with `z.toJSONSchema` and counting what strict
structured-output modes dislike. No live provider call was made (no keys in this environment).

| Measure                     | Value    |
| --------------------------- | -------- |
| Schema size                 | 27 KB    |
| Object schemas / properties | 95 / 334 |
| `$defs` / `$ref` uses       | 35 / 239 |
| `anyOf` unions              | 14       |
| Objects with free-form keys | 4        |

The four free-form objects are `args` of a command call, `table` of a code mapping, the literal
JSON values, and the dialogue slots. Strict modes require every object to have fixed, fully
required properties, so these cannot be sent as they are.

**Consequences:**

- Generation passes need dedicated _wire schemas_ that avoid free-form keys (key/value arrays,
  literals as JSON strings), plus a mapper back to the pack. The domain schema stays the single
  source of truth for validation.
- Three smaller passes (storm, strategy, model) keep each schema well under provider limits and
  nesting depth. Verifying actual provider limits is the first task of the generation phase.
