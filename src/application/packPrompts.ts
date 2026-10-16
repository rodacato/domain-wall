import { CONTENT_RULES, STRUCTURAL_RULES } from "../domain/pack/validation/validateSemantics";
import type { ValidationIssue } from "../domain/shared/ValidationIssue";
import { passDefinition, type PackDraft, type PassId } from "../domain/packGeneration/passes";

const RULES_OF_THE_PACK = [...STRUCTURAL_RULES, ...CONTENT_RULES]
  .map((rule) => `- ${rule.id}: ${rule.description}`)
  .join("\n");

export const SYSTEM_PROMPT = `You design the domain of a business for an interactive Domain-Driven Design course.
You answer only with JSON that follows the schema you are given, with no commentary.

How the domain is written:
- Everything is in a closed vocabulary: rules are predicates, effects and expressions of fixed kinds. Never invent a kind.
- Code names are in English. Types, events, commands, aggregates, value objects and states are PascalCase (OrderPlaced); fields, arguments and workflow fields are camelCase (unitPrice). Never write two capital letters in a row (write ItemId, not ItemID) and never use a single-letter word.
- Every human-facing text is an object with both languages: { "es-MX": "...", "en": "..." }. Write the Spanish as Mexican Spanish, not as a translation of the English.
- Events are in the past tense and form a believable business process in the order of their "sequence". Commands are imperative.
- Stay within the sizes the course allows, and keep labels short enough to fit a sticky note.

A finished pack must satisfy these checks, so write it to pass them:
${RULES_OF_THE_PACK}`;

const GUIDANCE: Readonly<Record<PassId, string>> = {
  storm:
    "Run an Event Storming of this business: its business name and description, the people who explain it (experts), the actors, 10 to 16 domain events in order, the commands that cause them, policies that react to events, external systems and read models. Name the aggregates that will handle each command in 'handledBy' even though you define them later, and use the same names then.",
  strategy:
    "Split what you have into 3 or 4 bounded contexts and classify each as core, supporting or generic with a reason. Describe how the contexts relate (context map patterns), pick one ambiguous term that means different things in different contexts, and describe the anti-corruption layer against one external system.",
  model:
    "Model the domain in code terms: shared value objects (scalars with constraints and examples, enums, records) and one aggregate for each name used in 'handledBy'. Each aggregate has states, rules (each with a scenario that violates it), transitions that emit events, and a walkthrough from the initial state to a terminal one. Keep it small: 2 to 4 rules per aggregate.",
  narrative:
    "Write the story around the model: the checkout-like workflow as a pipeline of stages (validate, compute, call a port, commit) with the types each stage produces, the expert conversations for every slot in the schema (at least two lines each, mentioning concepts as {{term:Name}}), and the two change scenarios (a business change and an evolution) as patches that apply cleanly.",
};

function compact(value: unknown): string {
  return JSON.stringify(value);
}

export interface PassPrompt {
  readonly system: string;
  readonly user: string;
  readonly jsonSchema: unknown;
}

/** What to ask for in one pass: the business, the guidance, what exists so far and why the last answer was refused. */
export function buildPassPrompt(input: {
  readonly pass: PassId;
  readonly description: string;
  readonly draft: PackDraft;
  readonly issues: readonly ValidationIssue[];
  readonly example: PackDraft;
  readonly jsonSchema: unknown;
}): PassPrompt {
  const sections = [
    `Business, as the learner described it:\n${input.description}`,
    `Your task now:\n${GUIDANCE[input.pass]}`,
    `Here is the shape of an answer, taken from a different business. Do not copy its content:\n${compact(input.example)}`,
  ];
  if (Object.keys(input.draft).length > 0) {
    sections.push(
      `What exists so far, which you must stay consistent with:\n${compact(input.draft)}`,
    );
  }
  if (input.issues.length > 0) {
    sections.push(
      `Your previous answer was refused for these reasons. Fix every one and answer again in full:\n${input.issues
        .map((issue) => `- [${issue.ruleId}] ${issue.path}: ${issue.message}`)
        .join("\n")}`,
    );
  }
  return { system: SYSTEM_PROMPT, user: sections.join("\n\n"), jsonSchema: input.jsonSchema };
}

/** A small excerpt of a known-good pack to show the shape of a pass, short enough not to crowd the answer. */
export function exampleFor(pass: PassId, pack: PackDraft): PackDraft {
  const part = Object.fromEntries(passDefinition(pass).keys.map((key) => [key, pack[key]]));
  return Object.fromEntries(
    Object.entries(part).map(([key, value]) => [
      key,
      Array.isArray(value) ? value.slice(0, 1) : value,
    ]),
  );
}
