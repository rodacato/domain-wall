import { z } from "zod";
import { localizedTextSchema } from "../../locale/LocalizedText";
import { memberNameSchema } from "../naming/CodeName";
import { fieldTypeSchema } from "./FieldType";

export const fieldSchema = z.strictObject({
  codeName: memberNameSchema,
  label: localizedTextSchema,
  type: fieldTypeSchema,
});
export type Field = z.infer<typeof fieldSchema>;
