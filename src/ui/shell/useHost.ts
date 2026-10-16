import { useEffect, useRef, useState } from "react";
import {
  NO_CAPABILITIES,
  readyMessage,
  type HostBridge,
  type HostCapabilities,
  type HostMessage,
} from "../../application/host";

/** Listens to the embedding page, tells it the course is ready, and reports what it can do for the course. */
export function useHost(
  bridge: HostBridge,
  onMessage: (message: HostMessage) => void,
): HostCapabilities {
  const [capabilities, setCapabilities] = useState<HostCapabilities>(NO_CAPABILITIES);
  const handler = useRef(onMessage);

  useEffect(() => {
    handler.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    const stop = bridge.onMessage((message) => {
      if (message.type === "host:init") {
        setCapabilities({
          remoteExecution: message.payload.capabilities?.remoteExecution === true,
          llm: message.payload.capabilities?.llm === true,
        });
      }
      handler.current(message);
    });
    bridge.send(readyMessage());
    return stop;
  }, [bridge]);

  return capabilities;
}
