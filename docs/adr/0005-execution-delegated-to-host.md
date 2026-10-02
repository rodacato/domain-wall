# 5. Code execution is delegated to the host; the browser only checks syntax

Status: accepted

## Context

Running Python, Ruby (including dry-rb gems) and TypeScript in the browser needs heavy runtimes
(Pyodide, ruby.wasm) and a custom build for gems. The host application (Dojo) already runs a
sandboxed Piston with these languages.

## Decision

The `CodeRunner` port has two adapters in v1: a local syntax checker (tree-sitter compiled to
wasm, loaded on demand) and a host adapter that requests execution from the parent page over
`postMessage`. A run outcome is a discriminated union: `Executed` (real test results) or
`SyntaxChecked` (tests not executed). The UI never reports a pass for a syntax-only check.

## Consequences

- Standalone exercises are validated for syntax and structure; real test execution requires the host.
- Interactive wall demonstrations use the reference interpreter (ADR 4), which is semantic.
- Heavy in-browser runtimes can be added later as another adapter without touching the domain.
