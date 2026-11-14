/*
Sample code: multiquery merging

Getting all bills around a topic based on keywords may involve running
multiple queries. This code performs repeated searches for keywords in a
larger query, de-deduplicates them based on the Legiscan ID, and then outputs
the final result to a JSON file for processing.

*/

import * as fs from "node:fs";
import { LegiscanClient } from "../src/client.ts";
import { Progress } from "../src/index.ts";

const client = new LegiscanClient();

// search term that fills in flex words within base query
const queries = [
	"gender",
	"transgender",
	"sexual orientation",
	"homosexual",
	"homosexuality",
	"parental rights",
	"gender identity",
	"gender transition",
];

const collected = new Map();
let hits = [];

for (const q of queries) {
	const query = `school AND "${q}" NOT "medical school"`;

	for await (const item of client.getSearchAsync({
		query: query,
		state: "wa",
	})) {
		const { bill_id, relevance } = item;
		const details = await client.getBill(bill_id);
		Object.assign(item, details);
		// store the result for every hit
		hits.push({ bill_id, relevance, searchTerm: q });
		// store the item just once
		if (!collected.has(bill_id)) {
			collected.set(bill_id, item);
		}
	}
}

console.log(`${hits.length} search results`);
console.log(`${collected.size} distinct bills associated with those results`);

const acceptable = new Set([Progress.Enrolled, Progress.Passed]);
for (const [id, bill] of collected) {
	// removes bills that are not enrolled or passed
	// we got the details by default above, which includes status
	// sets an arbitrary relevance threshold to filter bills based on Legiscan's relevancy score
	if (!acceptable.has(bill.status_id) || bill.relevance < 70) {
		collected.delete(id);
		hits = hits.filter((b) => b.bill_id !== id);
	}
}

console.log(`${hits.length} search results for passed bills`);
console.log("Search queries that returned results: ", [
	...new Set(hits.map((h) => h.searchTerm)),
]);
console.log(`${collected.size} distinct bills that have passed`);

fs.writeFileSync(
	"outfile.json",
	JSON.stringify(Object.fromEntries(collected), null, 2),
);
