# Domain Wall

[![CI · Test](https://github.com/rodacato/domain-wall/actions/workflows/ci.yml/badge.svg)](https://github.com/rodacato/domain-wall/actions/workflows/ci.yml)
[![Site · Pages](https://github.com/rodacato/domain-wall/actions/workflows/site-pages.yml/badge.svg)](https://github.com/rodacato/domain-wall/actions/workflows/site-pages.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**Play it in your browser: [rodacato.github.io/domain-wall](https://rodacato.github.io/domain-wall/)**

**Domain Wall** is an interactive Domain-Driven Design course, a guided workshop you play on your
own. Everything happens on an animated Event Storming wall: the
domain is discovered, split into bounded contexts and finally turned into code.

At the start you choose a programming language and an industry, and the whole course adapts:
code, idioms, examples and scenarios. It is not a language comparison.

![The course's Demo mode stepping through module 1 on the wall](docs/media/demo.gif)

[Full recording (MP4)](docs/media/demo.mp4)

## What you learn

Ten modules, each a scene on the wall you can step back and forth through, followed by an
exercise:

| #   | Module                         | You will be able to                                                                                                                                |
| --- | ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Why DDD                        | Explain why changing an anemic model keeps getting more expensive and how a rich model contains the cost.                                          |
| 2   | Ubiquitous language            | Spot ambiguous terms and agree on one vocabulary that experts and code use alike.                                                                  |
| 3   | Event Storming                 | Discover a domain by ordering events in time and adding commands, actors, policies, systems, read models and aggregates.                           |
| 4   | Bounded contexts               | Draw context boundaries and justify where a model stops being valid.                                                                               |
| 5   | Context map                    | Choose and justify a relationship pattern between contexts, including an anticorruption layer against an external system.                          |
| 6   | Subdomains                     | Classify subdomains as core, supporting or generic and decide where to invest effort.                                                              |
| 7   | Tactical building blocks       | Model with value objects, entities and aggregates that protect their invariants, and expose events, repositories, factories and services.          |
| 8   | Functional modeling            | Express the domain with constrained types, states as types, workflows as pipelines and errors as values, and compare it with the classic approach. |
| 9   | Architecture around the domain | Isolate the domain with ports and adapters and justify the dependency rule.                                                                        |
| 10  | Evolution                      | Refactor toward deeper understanding when a new requirement arrives and recognize implicit concepts.                                               |

The industry is a **domain pack**: the default _Made by Hand_, a marketplace of Mexican artisans,
or one of four curated ones (clinic, logistics, fintech, code review). Or describe your own business:
the course generates a pack for it, validates it with the same checks as the curated packs, and
falls back to the default pack if it cannot. Code is generated in TypeScript, Python, Ruby and Ruby
with dry-rb; the course runs in English and Spanish. What is left is in
[the roadmap](docs/roadmap.md); the full design is in [the proposal](docs/proposal/muro-proposal.md).

Standalone, code exercises are checked for syntax and structure. Their tests run when a host that
offers execution, such as Dojo, embeds the course; the course never reports a pass it did not run.

## Run it

Requires Node 22 or later and pnpm 12 (pinned in `packageManager`; `corepack enable` picks it up).

```bash
pnpm install
pnpm dev          # http://localhost:5173
```

## Checks

| Command               | What it does                                                                                     | Runs in CI            |
| --------------------- | ------------------------------------------------------------------------------------------------ | --------------------- |
| `pnpm check`          | typecheck, lint, format, architecture rules, unit tests, pack, course and translation validation | every push and PR     |
| `pnpm test:generated` | generates every pack in every language and runs its tests on Dojo's runtime versions             | every push and PR     |
| `pnpm test:e2e:smoke` | one Playwright test: onboarding into the first module                                            | every PR              |
| `pnpm test:e2e`       | the full Playwright suite: course, host protocol, accessibility                                  | nightly and on demand |
| `pnpm demo`           | records `docs/media/demo.gif` and `demo.mp4` from the production build (needs `ffmpeg`)          | no                    |

The e2e scripts need `pnpm exec playwright install chromium` once. `pnpm test:generated` needs
Docker and network access: Python and Ruby run in their official images (`python:3.10-slim`,
`ruby:3.0.1-slim`), Ruby with dry-rb in an image built from `scripts/docker/ruby-dry.Dockerfile`,
and TypeScript compiles with `tsc` 5.0.3 through `pnpm dlx` on your Node. Those are the versions
Dojo's code runner uses ([ADR 7](docs/adr/0007-generated-code-targets-dojo-runtimes.md)).

## Architecture

- Hexagonal layers under `src/`: `domain` imports only itself; `generation`, `ports` and `content`
  depend on `domain`; `application` composes them; `adapters` implement `ports`; `ui` talks only to
  `application` and `domain`. The rules live in `.dependency-cruiser.cjs` and fail CI
  ([ADR 1](docs/adr/0001-hexagonal-architecture.md)).
- The course is a fixed, verified template rendered over a domain pack, a JSON document with a
  closed vocabulary holding everything specific to an industry
  ([ADR 2](docs/adr/0002-closed-vocabulary-domain-pack.md)). Programming languages are templates
  with code-to-note anchors ([ADR 3](docs/adr/0003-template-generation-with-anchors.md)); spoken
  languages are translation catalogs ([ADR 6](docs/adr/0006-locale-registry-and-pack-cache-key.md)).
- A pure reference interpreter runs the pack's rules, drives the wall's demonstrations and is the
  oracle for the generated tests ([ADR 4](docs/adr/0004-reference-interpreter.md)).
- All decisions: [docs/adr/](docs/adr/). Vocabulary: [docs/ubiquitous-language.md](docs/ubiquitous-language.md).

## Embedding in Dojo

[Dojo](https://github.com/rodacato/dojo) is a self-hosted practice space for developers that embeds
courses like this one in an iframe. Domain Wall runs standalone or embedded. Today it speaks its own
protocol (`source: "muro"`, protocol 1, host named with `?hostOrigin=`), documented in
[docs/host-protocol.md](docs/host-protocol.md) and tested against a stand-in host
(`e2e/host.e2e.ts`). It does not speak Dojo's scroll protocol v0 yet; aligning the two is pending.

## Contributing

To add an industry, add a directory under `packs/presets/<id>/` with the same part files as
`packs/presets/clinic/`; the app picks it up, and `pnpm validate:packs` and `pnpm test:generated`
must pass. To add a spoken language, add a catalog folder next to `src/content/locales/en/`;
`pnpm check:translations` fails on any missing key. Read the relevant ADR before changing a layer
or the pack format, and run `pnpm check` before opening a pull request.

## Sources

The conceptual base is Eric Evans' _Domain-Driven Design_ and _Domain-Driven Design Reference_,
complemented by Scott Wlaschin's _Domain Modeling Made Functional_, Vaughn Vernon's _Implementing
Domain-Driven Design_, Alberto Brandolini's _Introducing EventStorming_ and Alistair Cockburn's
_Hexagonal Architecture_. The course explains concepts in its own words and points to chapters; it
does not reproduce the books.

## License

MIT, see [LICENSE](LICENSE).
