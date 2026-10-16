import type { ConceptId, ModuleId } from "../domain/course/ConceptId";
import type { RunOutcome } from "../domain/execution/RunOutcome";
import type { ProgrammingLanguageId } from "../domain/language/ProgrammingLanguage";
import type { LocaleCode } from "../domain/locale/LocaleRegistry";
import type { RunRequest } from "./CodeRunner";

export const HOST_PROTOCOL_VERSION = 1;

/** Messages the course sends to the page that embeds it. */
export type CourseMessage =
  | {
      readonly type: "course:ready";
      readonly payload: { readonly protocolVersion: number };
    }
  | {
      readonly type: "course:conceptCompleted";
      readonly payload: {
        readonly conceptId: ConceptId;
        readonly moduleId: ModuleId | null;
        readonly programmingLanguage: ProgrammingLanguageId;
        readonly packId: string;
      };
    }
  | {
      readonly type: "course:runRequested";
      readonly payload: RunRequest & { readonly requestId: string };
    }
  | {
      readonly type: "course:llmRequested";
      readonly payload: {
        readonly requestId: string;
        readonly system: string;
        readonly user: string;
        /** A JSON Schema the answer must follow. */
        readonly jsonSchema: unknown;
      };
    };

export type ThemeTokens = Readonly<Record<string, string>>;

/** Messages the host sends to the course. */
export type HostMessage =
  | {
      readonly type: "host:init";
      readonly payload: {
        readonly locale?: LocaleCode;
        readonly theme?: { readonly mode: "light" | "dark"; readonly tokens?: ThemeTokens };
        readonly programmingLanguage?: ProgrammingLanguageId;
        readonly industry?: string;
        readonly capabilities?: {
          readonly remoteExecution?: boolean;
          readonly llm?: boolean;
        };
      };
    }
  | { readonly type: "host:setLocale"; readonly payload: { readonly locale: LocaleCode } }
  | {
      readonly type: "host:setTheme";
      readonly payload: { readonly mode: "light" | "dark"; readonly tokens?: ThemeTokens };
    }
  | {
      readonly type: "host:runResult";
      readonly payload: { readonly requestId: string; readonly outcome: RunOutcome };
    }
  | {
      readonly type: "host:llmResult";
      readonly payload: { readonly requestId: string; readonly json: unknown };
    }
  | {
      readonly type: "host:llmFailed";
      readonly payload: { readonly requestId: string; readonly message: string };
    };

/** The channel to the page that embeds the course, or nothing when the course runs on its own. */
export interface HostBridge {
  readonly isEmbedded: boolean;
  send(message: CourseMessage): void;
  /** Calls the handler for every message the host sends; returns a function that stops listening. */
  onMessage(handler: (message: HostMessage) => void): () => void;
}
