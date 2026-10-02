# Domain Wall

**Muro** is an interactive Domain-Driven Design course that feels like a live workshop.
Everything happens on an animated Event Storming wall: the domain is discovered, split into
bounded contexts and finally turned into code.

At the start you choose a programming language and an industry, and the whole course adapts:
code, idioms, examples and scenarios. It is not a language comparison.

## Status

Phase 1 (foundations and contract) is in progress. See
[the proposal](docs/proposal/muro-proposal.md) for the full product and architecture design.

## How it is built

- The course is a fixed, verified **template** rendered over a **domain pack**: a JSON document
  holding everything specific to an industry.
- Programming languages are sets of **templates**; spoken languages are **translation catalogs**.
- Hexagonal architecture: `domain`, `generation`, `content`, `application`, `ports`,
  `adapters`, `ui`. Layer boundaries are enforced in CI (see `docs/adr/`).

## Development

Requires Node 22+ and pnpm.

```bash
pnpm install
pnpm check   # typecheck, lint, format, architecture rules, tests
```

## Sources

The conceptual base is Eric Evans' _Domain-Driven Design_ and _Domain-Driven Design Reference_,
complemented by Scott Wlaschin's _Domain Modeling Made Functional_ and Vaughn Vernon's
_Implementing Domain-Driven Design_. The course explains concepts in its own words and points to
chapters; it does not reproduce the books.

## License

[MIT](LICENSE)
