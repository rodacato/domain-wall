import { describe, expect, it } from "vitest";
import { opensByItself } from "./tourVisibility";

describe("when the tour opens by itself", () => {
  it("opens on a first visit and not after it has been seen", () => {
    expect(opensByItself("", false)).toBe(true);
    expect(opensByItself("", true)).toBe(false);
  });

  it("obeys the query string over what was seen", () => {
    expect(opensByItself("?tour=on", true)).toBe(true);
    expect(opensByItself("?tour=off", false)).toBe(false);
    expect(opensByItself("?pack=clinic&tour=off", false)).toBe(false);
  });

  it("ignores a value it does not know", () => {
    expect(opensByItself("?tour=maybe", false)).toBe(true);
    expect(opensByItself("?tour=maybe", true)).toBe(false);
  });
});
