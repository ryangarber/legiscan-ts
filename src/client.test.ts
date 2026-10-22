import dotenv from "dotenv";
import { LegiscanClient } from "./client.ts";

dotenv.config({ quiet: true });

const client = new LegiscanClient();
// These call the live API, so they need a key.
const apiTest = test.skipIf(!process.env.LEGISCAN_API_KEY);

apiTest("test session list", async () => {
  const state = "FL";
  const sessionList = await client.getSessionList({ state });
  assert.isArray(sessionList, "Session list should be an array");
});

apiTest("test master list", async () => {
  const state = "CA";
  const masterList = await client.getMasterList({ state });
  assert.isArray(masterList, "Master list should be an array");
});

apiTest("test bill text", async () => {
  const id = 674;
  const billText = await client.getBillText({ id });
  assert(billText.doc_id === id, "Bill text should have the correct ID");
});

apiTest("test bill", async () => {
  const id = 509;
  const bill = await client.getBill({ id });
  assert(bill.bill_id === id, "Bill should have the correct ID");
});

apiTest("test amendment", async () => {
  const id = 79;
  const amendment = await client.getAmendment({ id });
  assert(amendment.amendment_id === id, "Amendment should have the correct ID");
});

apiTest("test supplement", async () => {
  const id = 386;
  const supplement = await client.getSupplement({ id });
  assert(supplement.supplement_id === id, "Supplement should have the correct ID");
});

apiTest("test roll call", async () => {
  const id = 222;
  const rollCall = await client.getRollCall({ id });
  assert(rollCall.roll_call_id === id, "Roll call should have the correct ID");
});

apiTest("test person", async () => {
  const id = 32;
  const person = await client.getPerson({ id });
  assert(person.people_id === id, "Person should have the correct ID");
});

apiTest("test session people", async () => {
  const id = 146;
  const sessionPeople = await client.getSessionPeople({ id });
  assert.isArray(sessionPeople, "Session people should be an array");
});

apiTest("test sponsored list", async () => {
  const id = 321;
  const sponsoredList = await client.getSponsoredList({ id });
  assert.isArray(sponsoredList, "Sponsored list should be an array");
});

apiTest("test search", async () => {
  const search = client.getSearchAsync({ query: "random query" });
  const result = await search.next();
  assert.isNotEmpty(result.value, "Search result should not be empty");
});
