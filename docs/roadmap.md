# Roadmap

The order follows one principle: build the learning experience first, and add the integrations
that depend on other systems afterwards.

| #   | Phase                                                                                                                                                          | Status |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 1   | Foundations and contract: tooling, pack schema, reference interpreter, semantic validation, the default pack, translation checks, spikes                       | done   |
| 2   | Course model and content skeleton: syllabus, concept ids, progress model, content file format, UI catalogs                                                     | done   |
| 3   | The wall: pure wall engine and scenes, visual language, app shell, onboarding                                                                                  | done   |
| 4   | Code generation: entity style in TypeScript, Python, Ruby and Ruby with dry-rb, the workflow pipeline, in-memory adapters, the anemic comparison, all in CI    | done   |
| 5   | Modules 1-10 with their interactions and exercises: invariant breaker, railway, hexagon, evolution diff, six no-code exercises, four code exercises            | done   |
| 6   | Persistence and presets: progress across industry and language changes, curated industries, demo, accessibility, theming, end-to-end tests, GitHub Pages       | done   |
| 7   | Dojo integration: typed host protocol, `HostRunner`, execution harness contract, tested against a stand-in host; LLM messages are a draft                      | done   |
| 8   | LLM-generated packs: four passes, validation loop with retries, the generation scene, providers for Anthropic, OpenAI-compatible servers, the host, simulation | done   |

What remains is outside this repository: aligning the host protocol with Dojo (and its language
model mechanism), and provisioning the dry-rb gems in Dojo's Piston.

## Decisions that move with the order

- **Execution.** Until phase 7 the browser only checks syntax and the reference interpreter drives
  the interactive demonstrations (ADR 5). Dojo's Piston provisioning for Ruby with dry-rb is tracked
  in `docs/spikes/dry-rb-in-dojo-piston.md` and will be revisited then.
- **LLM access.** The `LlmProvider` port gets a host-mediated adapter in phase 7 (calls travel
  through Dojo to SheLLM), in addition to the direct OpenAI-compatible and Anthropic adapters of
  phase 8. Pack generation is the last feature; every earlier phase works with the curated packs.
- **Code generation** moves after the wall because the wall's first slice (modules 3 and 4) needs no
  generated code. Module 7's semantic zoom needs the TypeScript generator, so phase 4 can start as
  soon as the wall can show a code panel.
