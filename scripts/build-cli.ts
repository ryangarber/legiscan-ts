/**
 * Compiles the CLI for the given targets (the host's by default) into
 * standalone binaries; needs `bun` on PATH.
 *
 *   pnpm build:cli --target all
 */
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { proc } from "@ryangarber/utils";

const TARGETS = [
	"darwin-arm64",
	"darwin-x64",
	"linux-arm64",
	"linux-x64",
	"win32-arm64",
	"win32-x64",
] as const;
type Target = (typeof TARGETS)[number];

const host = `${process.platform}-${process.arch}`;
const main = resolve(import.meta.dirname, "../src/cli.ts");
const client = resolve(import.meta.dirname, "../src/client.ts");

function artifactOf(target: Target) {
	return `legiscan-${target}${target.startsWith("win32-") ? ".exe" : ""}`;
}

const { values } = parseArgs({
	options: {
		target: {
			type: "string",
			short: "t",
			multiple: true,
			default: ["current"],
		},
		out: {
			type: "string",
			short: "o",
			default: resolve(import.meta.dirname, "../bin"),
		},
	},
});

const targets: Target[] = values.target.includes("all")
	? [...TARGETS]
	: values.target.map((target) => {
			const resolved = target === "current" ? host : target;
			if (!TARGETS.includes(resolved as Target)) {
				throw new Error(
					`Unknown target ${resolved}; expected all, current or ${TARGETS.join(", ")}`,
				);
			}
			return resolved as Target;
		});

for (const target of targets) {
	const outfile = join(values.out, artifactOf(target));
	await proc({
		title: `Building ${target} (${targets.indexOf(target) + 1} of ${targets.length})`,
		command: [
			"bun",
			"build",
			main,
			"--compile",
			`--target=bun-${target.replace("win32", "windows")}`,
			`--outfile=${outfile}`,
			// The CLI finds its commands in the client's doc comments.
			`--define=LEGISCAN_CLIENT_SOURCE=${JSON.stringify(readFileSync(client, "utf-8"))}`,
		],
	});
	// Apple Silicon only runs signed binaries; an ad hoc signature will do.
	if (target.startsWith("darwin-") && process.platform === "darwin") {
		await proc({
			title: `Signing ${target}`,
			command: ["codesign", "--force", "--sign", "-", outfile],
		});
	}
	// Only a native build can run here.
	if (target === host) {
		await proc({
			title: `Checking ${target}`,
			command: [outfile, "--version"],
			env: { ...process.env, LEGISCAN_API_KEY: "unused" },
		});
	}
}
