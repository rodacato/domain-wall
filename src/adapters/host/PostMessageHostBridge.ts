import type { CourseMessage, HostBridge, HostMessage } from "../../ports/HostBridge";
import { unwrapHostMessage, wrapMessage } from "./hostEnvelope";

interface MessageEventLike {
  readonly data: unknown;
  readonly origin: string;
  readonly source: unknown;
}

/** The pieces of `window` the bridge uses, so it can be tested without a browser. */
export interface BridgeEnvironment {
  readonly listener: {
    addEventListener(type: "message", handler: (event: MessageEventLike) => void): void;
    removeEventListener(type: "message", handler: (event: MessageEventLike) => void): void;
  };
  /** The page that embeds the course. */
  readonly host: { postMessage(message: unknown, targetOrigin: string): void };
}

/** Talks to the embedding page over postMessage, accepting messages only from it and from allowed origins. */
export class PostMessageHostBridge implements HostBridge {
  readonly isEmbedded = true;

  constructor(
    private readonly environment: BridgeEnvironment,
    private readonly allowedOrigins: readonly [string, ...string[]],
  ) {}

  send(message: CourseMessage): void {
    this.environment.host.postMessage(
      wrapMessage(message.type, message.payload),
      this.allowedOrigins[0],
    );
  }

  onMessage(handler: (message: HostMessage) => void): () => void {
    const listener = (event: MessageEventLike): void => {
      if (event.source !== this.environment.host) return;
      if (!this.allowedOrigins.includes(event.origin)) return;
      const message = unwrapHostMessage(event.data);
      if (message !== undefined) handler(message);
    };
    this.environment.listener.addEventListener("message", listener);
    return () => {
      this.environment.listener.removeEventListener("message", listener);
    };
  }
}
