import { color } from "listr2";

// What identifies each kind of record, should it have several IDs
const IDS = [
  "bill_id",
  "people_id",
  "roll_call_id",
  "amendment_id",
  "supplement_id",
  "doc_id",
  "session_id"
];
// Fields worth a column when listing many records, in display order
const COLUMNS = [
  "state",
  "session",
  "bill_number",
  "name",
  "party",
  "role",
  "session_title",
  "status",
  "last_action_date",
  "title",
  "description"
];
const MAX_COLUMNS = 4;
// Strings past this are summarized; base64 documents can be megabytes long
const MAX_STRING = 300;

type Row = Record<string, unknown>;

const isRecord = (value: unknown): value is Row =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isEmpty = (value: unknown) =>
  value === null ||
  value === undefined ||
  value === "" ||
  (Array.isArray(value) && value.length === 0) ||
  (isRecord(value) && Object.keys(value).length === 0);

const label = (key: string) => key.replaceAll("_", " ");

function truncate(text: string, width: number) {
  return text.length > width ? `${text.slice(0, Math.max(width - 1, 0))}…` : text;
}

function scalar(value: unknown): string {
  if (typeof value === "boolean") return value ? color.green("yes") : color.red("no");
  if (typeof value === "number") return color.yellow(String(value));
  const text = String(value);
  if (text.length > MAX_STRING) {
    return `${text.slice(0, 80)}${color.dim(`… (${text.length} chars, use --json for all of it)`)}`;
  }
  if (/^https?:\/\//.test(text)) return color.cyan(color.underline(text));
  return text;
}

/**
 * Fields worth showing a person: not empty, not a cache hash, and not the
 * `_id` or `_raw` twin of a field that already has the normalized value
 */
function visible(row: Row): [string, unknown][] {
  return Object.entries(row).filter(([key, value]) => {
    if (isEmpty(value) || key.endsWith("_hash")) return false;
    const twin = key.match(/^(.+)_(id|raw)$/)?.[1];
    return !(twin && twin in row);
  });
}

/**
 * Renders a record as an indented key/value tree, with lists of records as
 * tables stretched to end at the same column
 */
function tree(row: Row, indent = 0, end = tableEnd(row, indent)): string[] {
  const pad = " ".repeat(indent);
  const fields = visible(row);
  const width = Math.max(...fields.map(([key]) => label(key).length));
  const lines: string[] = [];

  for (const [key, value] of fields) {
    const name = color.bold(label(key).padEnd(width));
    if (isRecord(value)) {
      lines.push(`${pad}${name}`, ...tree(value, indent + 2, end));
    } else if (Array.isArray(value) && value.every(isRecord)) {
      lines.push(
        `${pad}${name}  ${color.dim(`(${value.length})`)}`,
        ...table(value, indent + 2, end)
      );
    } else if (Array.isArray(value)) {
      lines.push(`${pad}${name}  ${value.map(scalar).join(color.dim(", "))}`);
    } else {
      lines.push(`${pad}${name}  ${scalar(value)}`);
    }
  }
  return lines;
}

/**
 * The column the widest table in a record's tree ends at
 */
function tableEnd(row: Row, indent: number): number {
  return Math.max(
    0,
    ...visible(row).map(([, value]) => {
      if (isRecord(value)) return tableEnd(value, indent + 2);
      if (Array.isArray(value) && value.every(isRecord)) {
        const { widths, used } = layout(value, indent + 2);
        return used + (widths.at(-1) ?? 0);
      }
      return 0;
    })
  );
}

/**
 * Picks a list of records' most telling columns, led by their ID, and sizes them
 */
function layout(rows: Row[], indent: number) {
  const keys = new Set(rows.flatMap((row) => Object.keys(row)));
  const id = IDS.find((key) => keys.has(key)) ?? [...keys].find((key) => key.endsWith("_id"));
  const preferred = COLUMNS.filter((key) => keys.has(key));
  // Records without any of the usual fields fall back to their own simple ones
  const others = visible(rows[0] ?? {})
    .filter(([key, value]) => key !== id && !preferred.includes(key) && !isRecord(value))
    .filter(([key, value]) => !Array.isArray(value) && !key.endsWith("_id") && key !== "url")
    .map(([key]) => key);
  const columns = [...(id ? [id] : []), ...[...preferred, ...others].slice(0, MAX_COLUMNS)];
  const cell = (row: Row, key: string) => {
    const value = row[key];
    if (isRecord(value)) return String(value.session_title ?? value.name ?? "");
    return isEmpty(value) ? "" : String(value);
  };

  const widths = columns.map((key) =>
    Math.max(label(key).length, ...rows.map((row) => cell(row, key).length))
  );
  // Let the last column take whatever room the terminal has left
  const used = indent + widths.slice(0, -1).reduce((sum, width) => sum + width + 2, 0);
  const last = widths.length - 1;
  widths[last] = Math.max(
    label(columns[last] ?? "").length,
    Math.min(widths[last] ?? 0, (process.stdout.columns || 120) - used)
  );
  return { id, columns, widths, cell, used };
}

/**
 * Renders a list of records as a table, led by their ID so any row can be
 * looked up with another command, and widened to end at the given column
 */
function table(rows: Row[], indent = 0, end = 0): string[] {
  const pad = " ".repeat(indent);
  const { id, columns, widths, cell, used } = layout(rows, indent);
  const last = widths.length - 1;
  widths[last] = Math.max(widths[last] ?? 0, end - used);

  const line = (cells: string[]) =>
    cells
      .map((text, i) => truncate(text, widths[i]!).padEnd(widths[i]!))
      .join("  ")
      .trimEnd();

  return [
    pad + color.bold(line(columns.map(label))),
    pad + color.dim(widths.map((width) => "─".repeat(width)).join("  ")),
    ...rows.map((row) => {
      const text = line(columns.map((key) => cell(row, key)));
      // Keep the ID column dim so the eye lands on the content
      return pad + (id ? color.dim(text.slice(0, widths[0])) + text.slice(widths[0]) : text);
    })
  ];
}

/**
 * Formats an API result for people to read; use --json for anything to be parsed
 */
export function render(result: unknown): string {
  if (Array.isArray(result)) {
    if (result.length === 0) return color.dim("No results.");
    const lines = result.every(isRecord) ? table(result) : result.map(scalar);
    const noun = result.length === 1 ? "result" : "results";
    return [...lines, "", color.dim(`${result.length} ${noun}`)].join("\n");
  }
  if (isRecord(result)) return tree(result).join("\n");
  return scalar(result);
}
