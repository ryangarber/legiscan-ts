import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import * as prompts from "@clack/prompts";

export type KeySource = "option" | "env" | "stored" | "prompt";

/**
 * Where the CLI keeps the key it prompted for, following each platform's
 * convention for per-user config
 */
export function keyFile() {
  const base =
    process.platform === "win32"
      ? (process.env.APPDATA ?? path.join(os.homedir(), "AppData", "Roaming"))
      : process.platform === "darwin"
        ? path.join(os.homedir(), "Library", "Application Support")
        : (process.env.XDG_CONFIG_HOME ?? path.join(os.homedir(), ".config"));
  return path.join(base, "legiscan", "credentials.json");
}

function readStoredKey(): string | undefined {
  try {
    const { apiKey } = JSON.parse(fs.readFileSync(keyFile(), "utf-8"));
    return typeof apiKey === "string" && apiKey ? apiKey : undefined;
  } catch {
    return undefined;
  }
}

function storeKey(apiKey: string) {
  const file = keyFile();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  // Only the user should be able to read their key
  fs.writeFileSync(file, `${JSON.stringify({ apiKey }, null, 2)}\n`, { mode: 0o600 });
}

/**
 * Finds the API key from, in order: the --api-key option, $LEGISCAN_API_KEY,
 * the stored key file, and finally an interactive prompt (whose answer is stored)
 * @param option the value of --api-key, if given
 * @param output where to draw the prompt; stderr keeps stdout clean for --json
 */
export async function resolveKey(
  option: string | undefined,
  output: NodeJS.WriteStream
): Promise<{ key: string; source: KeySource }> {
  if (option) return { key: option, source: "option" };
  if (process.env.LEGISCAN_API_KEY) return { key: process.env.LEGISCAN_API_KEY, source: "env" };

  const stored = readStoredKey();
  if (stored) return { key: stored, source: "stored" };

  if (!process.stdin.isTTY) {
    throw new Error(
      "No API key found. Pass --api-key, set LEGISCAN_API_KEY, or run legiscan interactively to save one."
    );
  }

  prompts.intro("LegiScan API key", { output });
  const key = await prompts.password({
    message: "Enter your LegiScan API key (from https://legiscan.com/myaccount)",
    validate: (value) => (value?.trim() ? undefined : "An API key is required"),
    output
  });
  if (prompts.isCancel(key)) {
    prompts.cancel("No API key given.", { output });
    process.exit(1);
  }

  storeKey(key.trim());
  prompts.outro(`Saved to ${keyFile()}`, { output });
  return { key: key.trim(), source: "prompt" };
}
