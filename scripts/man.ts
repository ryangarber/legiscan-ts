/**
 * Writes the CLI's man page, which npm installs from package.json's "man"
 *
 *   pnpm man [--out dist/legiscan.1]
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { parseArgs } from "node:util";
import { message } from "@optique/core";
import { generateManPage } from "@optique/man";
import { program } from "../src/cli.ts";

const { values } = parseArgs({
  options: {
    out: { type: "string", short: "o", default: resolve(import.meta.dirname, "../dist/legiscan.1") }
  }
});

const page = generateManPage(program, {
  section: 1,
  manual: "User Commands",
  environment: {
    entries: [
      {
        term: { type: "literal", value: "LEGISCAN_API_KEY" },
        description: message`LegiScan API key, used when --api-key is not given.`
      }
    ]
  },
  files: {
    entries: [
      {
        term: { type: "literal", value: "~/Library/Application Support/legiscan/credentials.json" },
        description: message`Saved API key on macOS.`
      },
      {
        term: { type: "literal", value: "$XDG_CONFIG_HOME/legiscan/credentials.json" },
        description: message`Saved API key on Linux, falling back to ~/.config.`
      },
      {
        term: { type: "literal", value: "%APPDATA%\\legiscan\\credentials.json" },
        description: message`Saved API key on Windows.`
      }
    ]
  }
});

mkdirSync(dirname(values.out), { recursive: true });
writeFileSync(values.out, page);
console.log(`Wrote ${values.out}`);
