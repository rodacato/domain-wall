import { z } from "zod";

/** Any JSON value: example data, command arguments and constants inside a pack. */
export const literalSchema = z.json();
export type Literal = z.infer<typeof literalSchema>;
