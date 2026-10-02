import { describe, expect, it } from "vitest";
import { buildPackIndex } from "../PackIndex";
import { loadDefaultPack } from "../packFixtures";
import type { CommandCall } from "../schema/Aggregate";
import { createInstance, type AggregateInstance } from "./AggregateInstance";
import { executeCommand } from "./executeCommand";
import type { Rejection } from "./Rejection";

const index = buildPackIndex(loadDefaultPack());

function call(command: string, args: CommandCall["args"] = {}): CommandCall {
  return { command, args } as CommandCall;
}

function newOrder(): AggregateInstance {
  const created = createInstance(index, "Order");
  if (!created.ok) throw new Error(created.error);
  return created.value;
}

function play(start: AggregateInstance, calls: readonly CommandCall[]): AggregateInstance {
  let instance = start;
  for (const step of calls) {
    const outcome = executeCommand(index, instance, step);
    if (!outcome.ok) throw new Error(`${step.command} rejected: ${JSON.stringify(outcome.error)}`);
    instance = outcome.value.instance;
  }
  return instance;
}

function rejectionOf(instance: AggregateInstance, step: CommandCall): Rejection {
  const outcome = executeCommand(index, instance, step);
  if (outcome.ok) throw new Error(`${step.command} was accepted`);
  return outcome.error;
}

const withOneLine = (): AggregateInstance =>
  play(newOrder(), [call("AddOrderLine", { quantity: 2, unitPrice: 45000 })]);

describe("executing commands on an Order", () => {
  it("accepts a valid command, moves to the target state and reports the events", () => {
    const placed = executeCommand(
      index,
      play(withOneLine(), [call("SetShippingAddress")]),
      call("PlaceOrder"),
    );

    expect(placed.ok && placed.value.instance.state).toBe("Placed");
    expect(placed.ok && placed.value.events).toEqual(["OrderPlaced"]);
  });

  it("derives the total from the lines", () => {
    const paid = play(withOneLine(), [
      call("SetShippingAddress"),
      call("PlaceOrder"),
      call("ConfirmPayment", { amount: 90000 }),
    ]);

    expect(paid.state).toBe("Paid");
  });

  it("rejects a command that has no transition from the current state", () => {
    expect(rejectionOf(newOrder(), call("ConfirmPayment"))).toEqual({
      kind: "invalidStateForCommand",
      command: "ConfirmPayment",
      state: "Draft",
    });
  });

  it("rejects an argument that breaks a value object constraint before looking at rules", () => {
    expect(rejectionOf(newOrder(), call("AddOrderLine", { quantity: 0 }))).toEqual({
      kind: "constraintViolated",
      errorCode: "QuantityMustBePositive",
      path: "quantity",
    });
  });

  it("rejects an argument of the wrong type", () => {
    expect(rejectionOf(newOrder(), call("AddOrderLine", { quantity: "many" }))).toMatchObject({
      kind: "malformedArgument",
      path: "quantity",
    });
  });

  it("reports the first failing guard, in declaration order", () => {
    expect(rejectionOf(newOrder(), call("PlaceOrder"))).toEqual({
      kind: "ruleViolated",
      rule: "OrderMustHaveLines",
      phase: "guard",
    });
    expect(rejectionOf(withOneLine(), call("PlaceOrder"))).toEqual({
      kind: "ruleViolated",
      rule: "ShippingAddressRequired",
      phase: "guard",
    });
  });

  it("rejects a payment that is not the exact total", () => {
    const placed = play(withOneLine(), [call("SetShippingAddress"), call("PlaceOrder")]);

    expect(rejectionOf(placed, call("ConfirmPayment", { amount: 89999 }))).toEqual({
      kind: "ruleViolated",
      rule: "PaymentMustMatchTotal",
      phase: "guard",
    });
  });

  it("checks invariants against the resulting state", () => {
    const fiveLines = play(
      newOrder(),
      Array.from({ length: 5 }, () => call("AddOrderLine")),
    );

    expect(rejectionOf(fiveLines, call("AddOrderLine"))).toEqual({
      kind: "ruleViolated",
      rule: "OrderLinesWithinLimit",
      phase: "invariant",
    });
  });

  it("does not allow cancelling a shipped order: the state machine has no such transition", () => {
    const shipped = play(withOneLine(), [
      call("SetShippingAddress"),
      call("PlaceOrder"),
      call("ConfirmPayment", { amount: 90000 }),
      call("MarkOrderShipped"),
    ]);

    expect(rejectionOf(shipped, call("CancelOrder"))).toEqual({
      kind: "invalidStateForCommand",
      command: "CancelOrder",
      state: "Shipped",
    });
  });

  it("reports a fault when the call names a parameter the command does not have", () => {
    expect(rejectionOf(newOrder(), call("PlaceOrder", { nonsense: 1 }))).toMatchObject({
      kind: "fault",
    });
  });
});
