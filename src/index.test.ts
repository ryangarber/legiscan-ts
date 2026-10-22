import { assert, test } from "vitest";

test("check package exports", async () => {
  assert.exists((await import("./index.ts")).LegiscanClient);
  assert.exists((await import("./index.ts")).State);
});
