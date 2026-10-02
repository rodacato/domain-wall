import { describe, expect, it } from "vitest";
import { MEMBER_NAME_PATTERN, TYPE_NAME_PATTERN, typeNameSchema, type TypeName } from "./CodeName";
import { renderCodeName, renderName, splitIntoWords, splitSnakeCaseIntoWords } from "./NameStyle";

const asTypeName = (name: string): TypeName => typeNameSchema.parse(name);

describe("code name patterns", () => {
  it.each(["Order", "OrderLine", "Address2Line", "Cfdi"])("accepts the type name %s", (name) => {
    expect(TYPE_NAME_PATTERN.test(name)).toBe(true);
  });

  it.each(["order", "CFDI", "OrderID", "Order_Line", "A", "2Order"])(
    "rejects the type name %s",
    (name) => {
      expect(TYPE_NAME_PATTERN.test(name)).toBe(false);
    },
  );

  it.each(["orderId", "x", "total", "shippingAddress"])("accepts the member name %s", (name) => {
    expect(MEMBER_NAME_PATTERN.test(name)).toBe(true);
  });

  it.each(["OrderId", "orderID", "order_id"])("rejects the member name %s", (name) => {
    expect(MEMBER_NAME_PATTERN.test(name)).toBe(false);
  });
});

describe("name styles", () => {
  it("splits a code name into lowercase words", () => {
    expect(splitIntoWords(asTypeName("OrderLineAdded"))).toEqual(["order", "line", "added"]);
  });

  it("renders every style from the same words", () => {
    const words = ["order", "must", "have", "lines"];
    expect(renderName(words, "PascalCase")).toBe("OrderMustHaveLines");
    expect(renderName(words, "camelCase")).toBe("orderMustHaveLines");
    expect(renderName(words, "snake_case")).toBe("order_must_have_lines");
    expect(renderName(words, "SCREAMING_SNAKE_CASE")).toBe("ORDER_MUST_HAVE_LINES");
    expect(renderName(words, "kebab-case")).toBe("order-must-have-lines");
  });

  it("recovers the canonical code name from a snake_case error code", () => {
    const original = asTypeName("OrderMustHaveLines");
    const snakeCase = renderCodeName(original, "snake_case");

    const recovered = renderName(splitSnakeCaseIntoWords(snakeCase), "PascalCase");

    expect(recovered).toBe(original);
  });
});
