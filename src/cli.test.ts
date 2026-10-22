import { exec as _exec } from "node:child_process";
import { promisify } from "node:util";
import dotenv from "dotenv";
import { assert, test } from "vitest";

const exec = promisify(_exec);

dotenv.config({ quiet: true });

test("check cli commands", async () => {
  const { stdout } = await exec("pnpm exec tsx ./src/cli.ts --help");
  assert.include(stdout, "legiscan bill --id ID", "Should show bill command usage");
  assert.include(stdout, "--api-key KEY", "Should show the --api-key option");
});

test("reject invalid option values", async () => {
  const error = await exec("pnpm exec tsx ./src/cli.ts bill --id abc").catch((e) => e);
  assert.include(error.stderr, "Expected a valid integer");
});

test.skipIf(!process.env.LEGISCAN_API_KEY)("print json results", async () => {
  const { stdout } = await exec("pnpm exec tsx ./src/cli.ts person --id 1 --json");
  assert.equal(JSON.parse(stdout).people_id, 1);
});
