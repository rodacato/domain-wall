import type { TypeName } from "../naming/CodeName";

/** Why the interpreter refused a command. Mirrors what generated code returns as an error value. */
export type Rejection =
  | {
      readonly kind: "invalidStateForCommand";
      readonly command: TypeName;
      readonly state: TypeName;
    }
  | { readonly kind: "constraintViolated"; readonly errorCode: TypeName; readonly path: string }
  | { readonly kind: "malformedArgument"; readonly path: string; readonly expected: string }
  | {
      readonly kind: "ruleViolated";
      readonly rule: TypeName;
      readonly phase: "guard" | "invariant";
    }
  /** The pack is inconsistent. Semantic validation exists to make this unreachable. */
  | { readonly kind: "fault"; readonly message: string };

export function describeRejection(rejection: Rejection): string {
  switch (rejection.kind) {
    case "invalidStateForCommand":
      return `${rejection.command} is not allowed in state ${rejection.state}`;
    case "constraintViolated":
      return `${rejection.errorCode} at ${rejection.path}`;
    case "malformedArgument":
      return `${rejection.path} should be ${rejection.expected}`;
    case "ruleViolated":
      return `${rejection.rule} (${rejection.phase})`;
    case "fault":
      return `pack fault: ${rejection.message}`;
  }
}
