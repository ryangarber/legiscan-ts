#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import {
  choice,
  command,
  commandLine,
  constant,
  envVar,
  flag,
  group,
  integer,
  merge,
  message,
  type NonEmptyString,
  object,
  option,
  optional,
  optionName,
  or,
  string,
  type ValueParser,
  withDefault
} from "@optique/core";
import { url } from "@optique/core/message";
import { defineProgram } from "@optique/core/program";
import { runSync } from "@optique/run";
import { parse } from "comment-parser";
import { color, Listr, PRESET_TIMER } from "listr2";
import packageJson from "../package.json" with { type: "json" };
import { type KeySource, keyFile, resolveKey } from "./cli/key.ts";
import { render } from "./cli/render.ts";
import { LegiscanClient } from "./client.ts";
import { State } from "./enums.ts";

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

type Param = { name: string; type: string; description: string; optional: boolean };
type Route = { name: string; description: string; method: string; params: Param[] };

// Commands come from the client's @cli doc comments
const routes: Route[] = parse(clientSource).flatMap((comment) => {
  const cli = comment.tags.find((t) => t.tag === "cli");
  if (!cli) return [];
  return {
    name: cli.name,
    description: comment.description,
    method: cli.type,
    params: comment.tags.filter((t) => t.tag === "param" && t.name !== "params")
  };
});

const plain = (text: string) => [{ type: "text" as const, text }];

// The @param {type} decides how the option's value is parsed
function valueParser(param: Param): ValueParser<"sync", string | number> {
  switch (param.type) {
    case "number":
      return integer({ metavar: param.name === "id" ? "ID" : "NUMBER" });
    case "State":
      return choice(Object.keys(State), { metavar: "STATE", caseInsensitive: true });
    default:
      return string({ metavar: param.name.toUpperCase() as NonEmptyString });
  }
}

const commands = or(
  ...routes.map((route) =>
    command(
      route.name,
      object({
        method: constant(route.method),
        args: object(
          Object.fromEntries(
            route.params.map((param) => {
              const parser = option(`--${param.name}`, valueParser(param), {
                description: plain(param.description)
              });
              return [param.name, param.optional ? optional(parser) : parser];
            })
          )
        )
      }),
      { description: plain(route.description) }
    )
  )
);

const globals = group(
  "Global options",
  object({
    apiKey: optional(
      option("--api-key", string({ metavar: "KEY" }), {
        description: message`LegiScan API key. Defaults to ${envVar("LEGISCAN_API_KEY")}, then the key saved by the last prompt.`
      })
    ),
    json: withDefault(
      flag("--json", {
        description: message`Print the raw result as JSON instead of formatting it.`
      }),
      false
    )
  })
);

export const program = defineProgram({
  parser: merge(commands, globals),
  metadata: {
    name: "legiscan",
    version: packageJson.version,
    brief: message`CLI for the LegiScan API`,
    description: message`Look up bills, sessions, legislators and votes from the LegiScan API.

Without ${optionName("--api-key")} or ${envVar("LEGISCAN_API_KEY")}, the key saved in your user config directory is used. If there is none, you are prompted for a key, which is then saved there.`,
    examples: message`Search for bills in California:

  ${commandLine('legiscan search --query "data privacy" --state CA')}

Show a bill's status and history:

  ${commandLine("legiscan bill --id 1234567")}

Get New York's sessions as JSON:

  ${commandLine("legiscan sessionlist --state NY --json")}`,
    author: plain(packageJson.author),
    bugs: message`Report bugs at ${url(packageJson.bugs.url)}.`
  }
});

/**
 * Describes what is being fetched, e.g. `bill 1234567` or `search "data privacy" in CA`
 */
function describe(route: Route, args: Record<string, unknown>) {
  const values = route.params
    .filter((param) => args[param.name] !== undefined)
    .map((param) => {
      const value = args[param.name];
      if (param.name === "id") return String(value);
      if (typeof value === "string" && param.type === "string") return JSON.stringify(value);
      return `${param.name} ${value}`;
    });
  return [route.name, ...values].join(" ");
}

/**
 * Shortens schema validation failures, which otherwise list every bad field as JSON
 */
function summarize(error: unknown): Error {
  const issues = (error as { issues?: { path: PropertyKey[]; message: string }[] }).issues;
  if (!Array.isArray(issues) || !issues[0]) return error as Error;
  const [{ path, message }] = issues;
  const more = issues.length > 1 ? ` (and ${issues.length - 1} more)` : "";
  return new Error(
    `LegiScan sent an unexpected response: ${path.map(String).join(".")}: ${message}${more}`
  );
}

async function execute(
  route: Route,
  args: Record<string, unknown>,
  { apiKey, json }: { apiKey?: string; json: boolean }
) {
  let source: KeySource | undefined;

  try {
    const resolved = await resolveKey(apiKey, json ? process.stderr : process.stdout);
    source = resolved.source;
    const client = new LegiscanClient(resolved.key) as unknown as Record<
      string,
      (args: Record<string, unknown>) => unknown
    >;

    if (json) {
      const result = await Promise.resolve(client[route.method]!(args)).catch((error) => {
        throw summarize(error);
      });
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
      return;
    }

    const title = describe(route, args);
    const { result } = await new Listr<{ result?: unknown }>(
      {
        title: `Fetching ${color.cyan(title)}`,
        task: (ctx, task) => load(ctx, task).catch((error) => Promise.reject(summarize(error)))
      },
      { rendererOptions: { timer: PRESET_TIMER }, fallbackRendererOptions: { timer: PRESET_TIMER } }
    ).run({});

    process.stdout.write(`\n${render(result)}\n`);

    async function load(ctx: { result?: unknown }, task: { title: string; output: string }) {
      // Paged endpoints have an async iterator variant, so progress can be shown
      const stream = client[`${route.method}Async`];
      if (stream) {
        const items: unknown[] = [];
        let pending = false;
        for await (const item of stream.call(client, args) as AsyncIterable<unknown>) {
          items.push(item);
          // Items arrive a page at a time, so report once the page is drained
          if (pending) continue;
          pending = true;
          setImmediate(() => {
            pending = false;
            task.output = `${items.length} results so far`;
          });
        }
        ctx.result = items;
      } else {
        ctx.result = await client[route.method]!(args);
      }
      const count = Array.isArray(ctx.result) ? color.dim(` (${ctx.result.length})`) : "";
      task.title = `Fetched ${color.cyan(title)}${count}`;
    }
  } catch (error) {
    const reason = (error as Error).message;
    // Listr has already shown the error beside the task
    if (json || !source) console.error(color.red(`Error: ${reason}`));
    if (source === "stored" && /key/i.test(reason)) {
      console.error(
        color.dim(
          `The API key saved in ${keyFile()} may be invalid; delete it to be prompted again.`
        )
      );
    }
    process.exitCode = 1;
  }
}

if (import.meta.main) {
  const argv = process.argv.slice(2);
  const parsed = runSync(program, {
    args: argv.length ? argv : ["--help"],
    aboveError: "none",
    help: "both",
    version: { value: packageJson.version, option: true },
    completion: "both"
  });
  const route = routes.find((route) => route.method === parsed.method)!;
  await execute(route, parsed.args, parsed);
}
