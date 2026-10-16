import type { HostBridge } from "../../ports/HostBridge";

/** The bridge when the course runs on its own: nothing to send to and nothing to hear from. */
export class NoHostBridge implements HostBridge {
  readonly isEmbedded = false;

  send(): void {
    // nobody is listening
  }

  onMessage(): () => void {
    return () => {
      // nothing was subscribed
    };
  }
}
