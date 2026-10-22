import { asName, asNumber, State } from "./enums.ts";

test("test conversion", () => {
  assert.equal(asName(State, 51), "DC");
  assert.equal(asNumber(State, "DC"), 51);
});

test("test passthrough", () => {
  assert.equal(asName(State, "DC"), "DC");
  assert.equal(asNumber(State, 51), 51);
});

test("test numbers as strings", () => {
  assert.equal(asName(State, "51"), "DC");
  assert.equal(asNumber(State, "51"), 51);
});

test("test invalid", () => {
  assert.isUndefined(asName(State, 0));
  assert.isUndefined(asNumber(State, "ZZ"));
});
