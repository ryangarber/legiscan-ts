A modern TypeScript fork of [Civic News's JavaScript library](https://github.com/Chalkbeat/legiscan-client) for accessing the Legiscan database of US state legislation. You will need an API key from https://legiscan.com/legiscan in order to use this client.

# Changes from the original library

This library is a complete rewrite of the original JavaScript client, with the following goals:
* Use TypeScript for a better developer experience
* Normalize API responses to be more consistent and easier to work with
* Keep up to date with the LegiScan API
* Replace deprecated dependencies
* Add tests for the client

# Installation

For Node or other server-based runtimes, it is recommended to install with PNPM:

```sh
pnpm install @ryangarber/legiscan-ts
```

Although it is primarily intended for use on the server, the client uses only standard runtime APIs like `fetch()`, and (as long as the API continues to use the correct CORS headers) can also run in the browser itself.

When using Node, this package also installs a command-line client that can be run with the `legiscan` command, either for manual access or integration with other languages.

# Usage

To interact with the API, import and create an instance of the `LegiscanClient` class, which takes an API key as its argument. You can also set the `$LEGISCAN_API_KEY` environment variable, and then the client will pick that up instead.

```js
import { LegiscanClient } from "@ryangarber/legiscan-ts";
// providing an API key directly:
let legiscan = new LegiscanClient(API_KEY);
// with the environment variable:
let legiscan = new LegiscanClient();
```

The client provides async methods corresponding to each API call. For example, to run a search and add bill details, you could write the following code:

```js
let results = await client.getSearch("education AND javascript");
for (let result of results) {
  let details = await client.getBill(result.bill_id);
  Object.assign(result, details);
}
```

Generally, the objects returned by the client methods will match the schema described in the [API documentation](https://legiscan.com/misc/LegiScan_API_User_Manual.pdf), but with some normalization applied. For example, when calling `getBill`, the status, event, and sponsor type fields will be normalized to their string representations, with an added `*_id` property containing the numerical code. This is meant to create more consistency between API calls, some of which return flags as strings and some as numerical codes.

# CLI

When installed globally, or when executed from an `npm run` script, the `legiscan` command provides [ND-JSON](https://github.com/ndjson/ndjson-spec) output from API calls. Some of these calls return a lot of results, or need to be filtered, and that's easier to do with newline-delimited output in languages and tools that support streaming from invoked processes.

To use it without Node, download the standalone build for your system (`legiscan-darwin-arm64`, `legiscan-darwin-x64`, `legiscan-linux-arm64`, `legiscan-linux-x64`, `legiscan-win32-arm64.exe` or `legiscan-win32-x64.exe`) from the [latest release](https://github.com/RyanGarber/legiscan-ts/releases/latest), or build it from source with `pnpm build:cli` (needs [Bun](https://bun.sh)).

The command line takes a case-insensitive API method name as its first argument, followed by positional arguments for required input and flags for optional parameters matching the Legiscan documentation:

```sh
# get a bill by its id
legiscan bill --id 174039

# search for bills in a state
legiscan search "education AND gender" --state TN
```

# Best practices and usage notes

## Caching

The Legiscan API limits users to 30,000 requests per month (resetting on the 1st). This may seem like a lot, unless you're a journalist who does a lot of scraping, or until you start pulling all legislation for an active session in, say, Michigan (about 3,000 bills as of April 2024). Since you cannot get many parts of the bill status without individual calls to the `getBill` method, your token usage can add up quickly.

As a result, it is extremely important to add a caching layer whenever you use the API client for anything involving bill details. For example, in the `samples/michigan.js` file, you can see where we use `lowdb` as a key/value store:

```js
import { JSONFilePreset } from "lowdb/node";

const defaultData = { cache: {} };
const db = await JSONFilePreset("cache.json", defaultData);
```

Each bill returned from a Legiscan API call includes a `change_hash` ID that is unique to that particular bill revision. Using that hash as a key, you can only make requests when the bill is updated, and otherwise pull from the database to save a request:

```js
var hash = bill.change_hash;

var details = db.data.cache[hash];
if (details) {
  // use the cached info
  details = JSON.parse(details);
} else {
  // get a fresh copy and cache it
  details = await client.getBill(bill.bill_id);
  db.data.cache[hash] = JSON.stringify(details);
  await db.write();
}
```

This is, of course, a kind of Minimum Viable Cache, and if you're using a database more extensively for storing persistent legislative data, you can probably just adapt it. Conversely, if you're only getting master lists or searches and don't really care about the bill details, it may be possible (although probably not advisable) to hit the API directly. We do not ship a cache layer in the client itself, because we believe it's better for you to be in control of response freshness based on your specific needs.

## Flags and Enums

The Legiscan API uses a lot of flags and/or sentinel values for things like legislation progress, states, or record type. Sometimes these are supplemented with a human-readable text version, and sometimes not. As mentioned above, this client will attempt to normalize and fill in properties so that anything like `state_id` will also provide a string-typed `state` field.

However, if you're interacting with some API calls that expect to receive these flags, this library also exports a set of constants that can be used to convert between them. The following constants are objects mapping the numeral code to their text value:

* `BillType` - Legislation categories, such as "Bill," Resolution," or "ExecutiveOrder"
* `EventType` - Distinguishes between hearings, executive sessions, and markup
* `Party` - Political party associated with sponsors, legislation, and so on
* `Progress` - Legislation progress from "Prefiled" forward. Note that these IDs are not in chronological order.
* `Reason` - Not used in the REST API
* `Role` - The type of person or persons sponsoring a bill
* `SastType` - Same As/Similar To metadata
* `SponsorType` - The sponsor relationship to a bill ("Sponsor", "CoSponsor", etc)
* `Stance` - A position that can be provided when setting an automated monitor list
* `State` - US State by Postal Code
* `SupplementType` - Types of supplemental documents for a bill, such as fiscal notes or analysis
* `TextType` - Types of primary documents for a bill revision
* `Vote` - "Yea," "Nay," "Not voting," or "Absent"

These map to the numerical code returned by the API. You can use `asName` and `asNumber` to convert between the two. For example, to get the text value of a vote code, or to get the code for a "Nay" vote, you could write:

```ts
import { asName, Vote } from "@ryangarber/legiscan-ts";
let voteName = asName(Vote, 1); // "Yea"
let voteNumber = asNumber(Vote, "Nay"); // 2
// values of the correct type will be returned as-is:
console.log(asName(Vote, "Yea")); // "Yea"
```

## Internal methods

In addition to the methods provided on the client, you can also make arbitrary requests to the Legiscan API endpoint using its `request()` method. This is what we use internally for calling the API, and may be useful if new methods are added, or you're using something the client doesn't currently have built-in. For example, to get a monitor list, you could write:

```js
var response = await client.request("getMonitorList", { record: "current" });
console.log(response.monitorlist);
```

In some cases (including the above monitor list), the API will not return an array for a list of items, but instead will provide an object with numerical keys. In this case, you can use the provided `numericalToArray` function to convert this into an actual JavaScript array (note that this will throw away any non-numerical keys on the object during conversion):

```js
import { numericalToArray } from "@ryangarber/legiscan-ts";
var response = await client.request("getMonitorList", { record: "current" });
// convert to a native array
var list = numericalToArray(response.monitorlist);
```

Yes, this is a weird and annoying API choice, and was one of the inspirations for creating this client in the first place.
