#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { Command } from "commander";
import { parse } from "comment-parser";
import packageJson from "../package.json" with { type: "json" };
import { LegiscanClient } from "./client.js";

// Ensure the API key is set
const key = process.env.LEGISCAN_API_KEY;
if (!key) {
  console.error("Error: LEGISCAN_API_KEY environment variable not set.");
  process.exit(1);
}

// Initialize cli and client
const client = new LegiscanClient();
const program = new Command();

program.name("legiscan").description("CLI for Legiscan API").version(packageJson.version);

// Compiled binaries (scripts/build.ts) have no files beside them to read, so
// the client's source is built into them
declare const LEGISCAN_CLIENT_SOURCE: string | undefined;
const clientSource =
  typeof LEGISCAN_CLIENT_SOURCE === "string"
    ? LEGISCAN_CLIENT_SOURCE
    : fs.readFileSync(
        path.resolve(
          import.meta.dirname,
          import.meta.dirname.includes("/dist") ? "index.js" : "client.ts"
        ),
        "utf-8"
      );
const parsed = parse(clientSource);

// Find @cli comments and add them as commands
for (const comment of parsed) {
  const cli = comment.tags.find((t) => t.tag === "cli");
  if (!cli) continue;

  const name = cli.name;
  const method = cli.type;
  const description = comment.description;
  const params = comment.tags.filter((t) => t.tag === "param" && t.name !== "params");

  const command = program.command(name).description(description);

  for (const param of params) {
    if (param.optional) {
      command.option(`--${param.name} <${param.name}>`, param.description);
    } else {
      command.requiredOption(`--${param.name} <${param.name}>`, param.description);
    }
  }

  command.action(async (options) => {
    try {
      const result = await (client as any)[method](options);
      if (Array.isArray(result)) {
        for (const item of result) {
          console.log(JSON.stringify(item));
        }
      } else {
        console.log(JSON.stringify(result));
      }
    } catch (error) {
      console.error(`Error executing ${method}:`, (error as Error).message);
      process.exit(1);
    }
  });
}

program.parse();
