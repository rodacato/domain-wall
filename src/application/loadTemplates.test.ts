import { describe, expect, it } from "vitest";
import { loadTemplates } from "./loadTemplates";

describe("loadTemplates", () => {
  it("groups template files by language and names them without extension", () => {
    const templates = loadTemplates({
      "../generation/languages/python/templates/aggregate.mustache": "class {{name}}",
      "../generation/languages/ruby-dry/templates/events.mustache": "events",
    });

    expect(templates.python).toEqual({ aggregate: "class {{name}}" });
    expect(templates["ruby-dry"]).toEqual({ events: "events" });
    expect(templates.typescript).toEqual({});
  });

  it("ignores files that are not templates of a known language", () => {
    const templates = loadTemplates({
      "../generation/languages/cobol/templates/aggregate.mustache": "x",
      "../generation/languages/python/pythonDescriptor.ts": "x",
    });

    expect(templates.python).toEqual({});
  });
});
