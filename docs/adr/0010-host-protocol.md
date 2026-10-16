# 10. The course talks to its host over a small typed postMessage protocol

Status: accepted

## Context

Dojo runs the code (ADR 5) and will provide access to a language model. The course must work on its
own, and must not trust whatever page embeds it.

## Decision

- Two ports, `HostBridge` (the channel) and `CodeRunner` (run or check a project), with adapters:
  `PostMessageHostBridge` and `NoHostBridge`, `HostRunner` (asks the host) and `SyntaxCheckRunner`
  (parses, never executes). `LlmProvider` is a third port, with `HostLlmProvider` as its adapter.
- The protocol is versioned (`protocol: 1`), validated with zod on arrival, correlated by
  `requestId` and bounded by timeouts. It is documented in `docs/host-protocol.md`.
- The host is trusted only if the address names its origin (`hostOrigin`), the message comes from the
  embedding window and the origin is on the list.
- Test results travel as the JSON lines the generated harness already prints, so any sandbox that
  can run the project can answer.

## Consequences

- Standalone, nothing changes: no host means no messages and a syntax-only check (ADR 8).
- Embedded, exercises can report real test results, and the host can follow progress and set the
  language, theme and industry.
- The language-model messages are a draft; they will change to fit the host's mechanism without
  touching the domain.
