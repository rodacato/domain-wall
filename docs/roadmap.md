# Roadmap

The order follows one principle: build the learning experience first, and add the integrations
that depend on other systems afterwards.

| #   | Phase                                                                                                                                                                        | Status |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 1   | Foundations and contract: tooling, pack schema, reference interpreter, semantic validation, the default pack, translation checks, spikes                                     | done   |
| 2   | Course model and content skeleton: syllabus, concept ids, progress model, content file format, UI catalogs                                                                   | next   |
| 3   | The wall: pure wall engine and scenes, visual language, app shell, onboarding. First demoable slice: Event Storming and bounded contexts                                     |        |
| 4   | Code generation for the course: TypeScript first (entity style, anchors for the semantic zoom), then Python, Ruby and Ruby with dry-rb, then the functional and naive styles |        |
| 5   | Course modules 1-10 with their interactions: invariant breaker, functional pipeline, before/after, hexagonal architecture, evolution                                         |        |
| 6   | Persistence, progress across industry and language changes, demo mode, accessibility, GitHub Pages deployment                                                                |        |
| 7   | Dojo integration: host protocol, `HostRunner`, execution harness contract, LLM access through the host (SheLLM)                                                              |        |
| 8   | LLM-generated packs: wire schemas, three generation passes, validation loop with retries, the generation scene, curated presets                                              |        |

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
