import { describe, expect, it, vi } from "vitest";
import type { CodeRunner, RunRequest } from "../../ports/CodeRunner";
import type { CourseMessage, HostBridge, HostMessage } from "../../ports/HostBridge";
import { wrapMessage } from "./hostEnvelope";
import { HostLlmProvider } from "./HostLlmProvider";
import { HostRunner } from "./HostRunner";
import { NoHostBridge } from "./NoHostBridge";
import { PostMessageHostBridge, type BridgeEnvironment } from "./PostMessageHostBridge";
import { SyntaxCheckRunner } from "./SyntaxCheckRunner";

/** A host the course can talk to in tests: it records what the course sends and lets a test answer. */
class FakeHost implements HostBridge {
  readonly isEmbedded = true;
  readonly sent: CourseMessage[] = [];
  private handlers: ((message: HostMessage) => void)[] = [];

  send(message: CourseMessage): void {
    this.sent.push(message);
  }

  onMessage(handler: (message: HostMessage) => void): () => void {
    this.handlers.push(handler);
    return () => {
      this.handlers = this.handlers.filter((candidate) => candidate !== handler);
    };
  }

  answer(message: HostMessage): void {
    for (const handler of this.handlers) handler(message);
  }
}

const request: RunRequest = {
  language: "python",
  files: [{ path: "run_tests.py", content: "print(1)" }],
  testEntry: "run_tests.py",
  timeoutMs: 1000,
};

describe("HostRunner", () => {
  it("sends the request to the host and resolves with the outcome it answers", async () => {
    const host = new FakeHost();
    const runner: CodeRunner = new HostRunner(host);

    const running = runner.run(request);
    const sent = host.sent[0];
    if (sent?.type !== "course:runRequested") throw new Error("nothing was requested");
    host.answer({
      type: "host:runResult",
      payload: {
        requestId: sent.payload.requestId,
        outcome: { kind: "executed", tests: [], durationMs: 5 },
      },
    });

    expect(await running).toEqual({
      ok: true,
      value: { kind: "executed", tests: [], durationMs: 5 },
    });
  });

  it("gives up when the host does not answer in time", async () => {
    vi.useFakeTimers();
    const runner = new HostRunner(new FakeHost());

    const running = runner.run({ ...request, timeoutMs: 50 });
    await vi.advanceTimersByTimeAsync(60);

    expect(await running).toEqual({ ok: false, error: { kind: "timedOut", afterMs: 50 } });
    vi.useRealTimers();
  });

  it("ignores answers to requests it did not make", async () => {
    const host = new FakeHost();
    const runner = new HostRunner(host);
    const running = runner.run({ ...request, timeoutMs: 20 });

    host.answer({
      type: "host:runResult",
      payload: { requestId: "someone-else", outcome: { kind: "syntaxChecked", diagnostics: [] } },
    });

    expect((await running).ok).toBe(false);
  });
});

describe("HostLlmProvider", () => {
  it("resolves with the JSON the host answers and with its failures", async () => {
    const host = new FakeHost();
    const provider = new HostLlmProvider(host);

    const answered = provider.generateStructured({ system: "s", user: "u", jsonSchema: {} });
    const first = host.sent[0];
    if (first?.type !== "course:llmRequested") throw new Error("nothing was requested");
    host.answer({
      type: "host:llmResult",
      payload: { requestId: first.payload.requestId, json: { a: 1 } },
    });
    expect(await answered).toEqual({ ok: true, value: { a: 1 } });

    const failed = provider.generateStructured({ system: "s", user: "u", jsonSchema: {} });
    const second = host.sent[1];
    if (second?.type !== "course:llmRequested") throw new Error("nothing was requested");
    host.answer({
      type: "host:llmFailed",
      payload: { requestId: second.payload.requestId, message: "quota" },
    });
    expect(await failed).toEqual({ ok: false, error: { kind: "failed", message: "quota" } });
  });

  it("stops waiting when the learner cancels", async () => {
    const controller = new AbortController();
    const provider = new HostLlmProvider(new FakeHost());

    const answered = provider.generateStructured({
      system: "s",
      user: "u",
      jsonSchema: {},
      signal: controller.signal,
    });
    controller.abort();

    expect(await answered).toEqual({ ok: false, error: { kind: "aborted" } });
  });
});

describe("PostMessageHostBridge", () => {
  function environment(): {
    readonly env: BridgeEnvironment;
    readonly host: {
      posted: unknown[];
      origins: string[];
      postMessage: (m: unknown, o: string) => void;
    };
    readonly deliver: (event: { data: unknown; origin: string; source: unknown }) => void;
  } {
    const handlers: ((event: { data: unknown; origin: string; source: unknown }) => void)[] = [];
    const host = {
      posted: [] as unknown[],
      origins: [] as string[],
      postMessage(message: unknown, origin: string) {
        this.posted.push(message);
        this.origins.push(origin);
      },
    };
    return {
      host,
      env: {
        host,
        listener: {
          addEventListener: (_type, handler) => handlers.push(handler),
          removeEventListener: (_type, handler) => handlers.splice(handlers.indexOf(handler), 1),
        },
      },
      deliver: (event) => {
        for (const handler of [...handlers]) handler(event);
      },
    };
  }

  it("wraps what the course sends and addresses it to the allowed origin only", () => {
    const { env, host } = environment();
    new PostMessageHostBridge(env, ["https://dojo.example"]).send({
      type: "course:ready",
      payload: { protocolVersion: 1 },
    });

    expect(host.posted).toEqual([wrapMessage("course:ready", { protocolVersion: 1 })]);
    expect(host.origins).toEqual(["https://dojo.example"]);
  });

  it("passes on valid messages from the host and drops everything else", () => {
    const { env, host, deliver } = environment();
    const received: HostMessage[] = [];
    new PostMessageHostBridge(env, ["https://dojo.example"]).onMessage((m) => received.push(m));
    const valid = wrapMessage("host:setLocale", { locale: "en" });

    deliver({ data: valid, origin: "https://dojo.example", source: host });
    deliver({ data: valid, origin: "https://evil.example", source: host });
    deliver({ data: valid, origin: "https://dojo.example", source: {} });
    deliver({ data: { type: "host:setLocale" }, origin: "https://dojo.example", source: host });
    deliver({
      data: wrapMessage("host:setLocale", { locale: "fr" }),
      origin: "https://dojo.example",
      source: host,
    });

    expect(received).toEqual([{ type: "host:setLocale", payload: { locale: "en" } }]);
  });

  it("stops listening when asked", () => {
    const { env, host, deliver } = environment();
    const received: HostMessage[] = [];
    const stop = new PostMessageHostBridge(env, ["https://dojo.example"]).onMessage((m) =>
      received.push(m),
    );

    stop();
    deliver({
      data: wrapMessage("host:setLocale", { locale: "en" }),
      origin: "https://dojo.example",
      source: host,
    });

    expect(received).toEqual([]);
  });
});

describe("NoHostBridge and SyntaxCheckRunner", () => {
  it("is not embedded and sends nothing anywhere", () => {
    const bridge = new NoHostBridge();

    expect(bridge.isEmbedded).toBe(false);
    expect(() => {
      bridge.send();
      bridge.onMessage()();
    }).not.toThrow();
  });

  it("reports syntax diagnostics and never claims the tests ran", async () => {
    const runner = new SyntaxCheckRunner({
      check: (_language, source) =>
        Promise.resolve(
          source.includes("oops")
            ? [{ line: 2, column: 1, kind: "unexpected", snippet: "oops" }]
            : [],
        ),
      withoutComments: (_language, source) => Promise.resolve(source),
    });

    const outcome = await runner.run({
      ...request,
      files: [
        { path: "a.py", content: "x = 1" },
        { path: "b.py", content: "oops" },
        { path: "notes.txt", content: "oops" },
      ],
    });

    expect(outcome).toEqual({
      ok: true,
      value: {
        kind: "syntaxChecked",
        diagnostics: [{ line: 2, column: 1, message: "b.py: unexpected oops" }],
      },
    });
  });
});
