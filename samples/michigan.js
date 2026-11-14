/*
Sample code: list all current Michigan legislation for reporters

Uses lowdb as a key/value store to cache bill details based on their change
hash, so that the ~3K records don't eat an entire month's worth of API calls
in the first week.

*/

import * as fs from "node:fs/promises";
import progress from "cli-progress";
import { stringify } from "csv";
import { JSONFilePreset } from "lowdb/node";
import { LegiscanClient } from "../src/client.ts";

const defaultData = { cache: {} };
const db = await JSONFilePreset("cache.json", defaultData);

const BATCH_SIZE = 20;

const client = new LegiscanClient();

const handle = await fs.open("../outfile.csv", "w+");
const stream = handle.createWriteStream();
const exporter = stringify({});
exporter.pipe(stream);
exporter.write([
	"bill ID",
	"last action",
	"bill number",
	"description",
	"link",
	"subjects",
	"sponsors",
	"supplements",
]);

console.log("Getting master list from Legiscan...");
const all = await client.getMasterList({ state: "MI" });

let cachedCount = 0;
const bar = new progress.SingleBar(
	{
		format:
			"{bar} | Retrieved: {value}/{total} ({percentage}%) | Cached: {cachedCount}/{total}",
	},
	progress.Presets.rect,
);
console.log("Retrieving details for each bill...");
bar.start(all.length, 0, { cachedCount });

for (let i = 0; i < all.length; i += BATCH_SIZE) {
	const slice = all.slice(i, i + BATCH_SIZE);
	const request = slice.map(async (bill) => {
		const hash = bill.change_hash;

		let details;
		const cached = db.data.cache[hash];
		if (cached) {
			// use the cached info
			cachedCount++;
			details = JSON.parse(cached);
		} else {
			// get a fresh copy and cache it
			details = await client.getBill(bill.bill_id);
			db.data.cache[hash] = JSON.stringify(details);
		}
		Object.assign(bill, details);
		bar.increment(1, { cachedCount });
	});

	await Promise.all(request);
	await db.write();
	for (const bill of slice) {
		exporter.write([
			bill.bill_id,
			bill.last_action_date,
			bill.bill_number,
			bill.description,
			bill.state_link,
			bill.subjects.map((s) => s.subject_name).join(", "),
			bill.sponsors.map((s) => s.name).join(", "),
			bill.supplements.some((b) => b.type_id === 3 || 2),
		]);
	}
}

bar.stop();

exporter.end();
