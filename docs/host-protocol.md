# Embedding the course: the host protocol

Muro can run on its own or inside another page, such as Dojo, in an iframe. The two talk over
`postMessage` with the protocol below. It is typed in [`src/ports/HostBridge.ts`](../src/ports/HostBridge.ts)
and exercised by `e2e/host.e2e.ts`, which plays the part of a host.

## Embedding

```html
<iframe src="https://domain-wall.example/?hostOrigin=https://dojo.example"></iframe>
```

- `hostOrigin` names the origins the course trusts as its host (comma separated). Without it, or
  when the course is not in an iframe, the course ignores every message and sends none.
- The course accepts a message only if it comes from the embedding window **and** from one of those
  origins, and sends its own messages only to the first one.
- `?theme=light|dark|auto` picks a theme without a message.

## Envelope

Every message, in both directions:

```json
{ "source": "muro", "protocol": 1, "type": "course:ready", "payload": {} }
```

Anything that does not match is dropped.

## Course to host

| `type`                    | `payload`                                                                   |
| ------------------------- | --------------------------------------------------------------------------- |
| `course:ready`            | `{ protocolVersion }`. Sent once the course is listening.                   |
| `course:conceptCompleted` | `{ conceptId, moduleId, programmingLanguage, packId }`                      |
| `course:runRequested`     | `{ requestId, language, files: [{ path, content }], testEntry, timeoutMs }` |
| `course:llmRequested`     | `{ requestId, system, user, jsonSchema }` (draft, see below)                |

## Host to course

| `type`           | `payload`                                                                                |
| ---------------- | ---------------------------------------------------------------------------------------- |
| `host:init`      | `{ locale?, theme?: { mode, tokens? }, programmingLanguage?, industry?, capabilities? }` |
| `host:setLocale` | `{ locale }` (`es-MX` or `en`)                                                           |
| `host:setTheme`  | `{ mode: "light" \| "dark", tokens?: { "--ui-accent": "#…" } }`                          |
| `host:runResult` | `{ requestId, outcome }`                                                                 |
| `host:llmResult` | `{ requestId, json }` (draft)                                                            |
| `host:llmFailed` | `{ requestId, message }` (draft)                                                         |

`capabilities` in `host:init` says what the host can do: `{ remoteExecution?: boolean, llm?: boolean }`.
If `host:init` gives both `locale` and `programmingLanguage`, the course skips its onboarding.
`industry` is the id of a curated pack (`clinic`, `fintech`, `logistics`, `education`); anything else
selects the default one. Theme `tokens` are CSS custom properties; names that do not start with `--`
are ignored.

## Running tests

With `remoteExecution` true, the exercises written in code get a **Run the tests** button. The
course sends every file of the generated project (the learner's answer already in place) and the
file that runs the tests. The host runs it in its sandbox and answers with:

```json
{
  "kind": "executed",
  "durationMs": 120,
  "tests": [{ "name": "Order completes its happy path", "status": "passed", "message": null }]
}
```

The generated harness of each language prints one JSON line per test and a summary, so a host that
only has the process output can build `tests` from the lines that start with `{`:

```
{"type":"test","name":"Order completes its happy path","status":"passed"}
{"type":"test","name":"Order rejects PlaceOrder","status":"failed","message":"expected …"}
{"type":"summary","passed":1,"failed":1}
```

`syntaxChecked` is also a valid outcome (`{ kind: "syntaxChecked", diagnostics: [] }`); the course
then says that no test ran. It never reports a pass for anything but `executed`.

The generated code targets the runtimes of Dojo's Piston (see ADR 7). The Ruby with dry-rb variant
needs the gems there; see `docs/spikes/dry-rb-in-dojo-piston.md`.

## Language model access (draft)

Generating a pack for a business the learner describes needs a model. Rather than holding keys, the
course asks the host: `course:llmRequested` carries the prompts and a JSON Schema the answer must
follow, and the host answers `host:llmResult` with parsed JSON or `host:llmFailed`. The course
validates whatever comes back; it does not trust the host's JSON. This part is a proposal to align
with the host's own mechanism, and nothing in the course depends on it yet.
