import { expect, it } from "vitest";
import { money } from "./format";
it("preserves centavos when server aggregate exceeds JavaScript safe integer", () => {
  expect(money("900719925474099301")).toBe("₱9,007,199,254,740,993.01");
  expect(money(-25)).toBe("-₱0.25");
  expect(money(100)).toBe("₱1.00");
});
it("does not turn missing or invalid financial values into fake zero balances", () => {
  expect(money(undefined)).toBe("—");
  expect(money("not-a-number")).toBe("—");
  expect(money(0)).toBe("₱0.00");
});
