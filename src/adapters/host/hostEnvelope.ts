import { z } from "zod";
import { HOST_PROTOCOL_VERSION, type HostMessage } from "../../ports/HostBridge";

const outcomeSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("executed"),
    tests: z.array(
      z.object({
        name: z.string(),
        status: z.enum(["passed", "failed"]),
        message: z.string().nullable(),
      }),
    ),
    durationMs: z.number(),
  }),
  z.object({
    kind: z.literal("syntaxChecked"),
    diagnostics: z.array(z.object({ line: z.number(), column: z.number(), message: z.string() })),
  }),
]);

const themeSchema = z.object({
  mode: z.enum(["light", "dark"]),
  tokens: z.record(z.string(), z.string()).optional(),
});

const hostMessageSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("host:init"),
    payload: z.object({
      locale: z.enum(["es-MX", "en"]).optional(),
      theme: themeSchema.optional(),
      programmingLanguage: z.enum(["typescript", "python", "ruby", "ruby-dry"]).optional(),
      industry: z.string().optional(),
      capabilities: z
        .object({ remoteExecution: z.boolean().optional(), llm: z.boolean().optional() })
        .optional(),
    }),
  }),
  z.object({
    type: z.literal("host:setLocale"),
    payload: z.object({ locale: z.enum(["es-MX", "en"]) }),
  }),
  z.object({ type: z.literal("host:setTheme"), payload: themeSchema }),
  z.object({
    type: z.literal("host:runResult"),
    payload: z.object({ requestId: z.string(), outcome: outcomeSchema }),
  }),
  z.object({
    type: z.literal("host:llmResult"),
    payload: z.object({ requestId: z.string(), json: z.unknown() }),
  }),
  z.object({
    type: z.literal("host:llmFailed"),
    payload: z.object({ requestId: z.string(), message: z.string() }),
  }),
]);

const envelopeSchema = z.object({
  source: z.literal("muro"),
  protocol: z.literal(HOST_PROTOCOL_VERSION),
  type: z.string(),
  payload: z.unknown(),
});

export function wrapMessage(type: string, payload: unknown): unknown {
  return { source: "muro", protocol: HOST_PROTOCOL_VERSION, type, payload };
}

/** Reads what arrived over postMessage as a host message, or undefined if it is not one. */
export function unwrapHostMessage(data: unknown): HostMessage | undefined {
  const envelope = envelopeSchema.safeParse(data);
  if (!envelope.success) return undefined;
  const message = hostMessageSchema.safeParse({
    type: envelope.data.type,
    payload: envelope.data.payload,
  });
  return message.success ? (message.data as HostMessage) : undefined;
}
