import test from "node:test";
import assert from "node:assert/strict";
import { classifyLevel, classifyOwnership } from "../classification.mjs";

for (const [name, tags, expected] of [
  ["lower secondary", { "isced:level": "2" }, "middle"],
  ["upper secondary", { "isced:level": "3" }, "high"],
  ["both secondary levels", { "isced:level": "2;3" }, "combined"],
  [
    "school spanning primary through high",
    { "isced:level": "1-3" },
    "combined",
  ],
  ["primary only", { "isced:level": "1" }, "primary"],
  ["no source level", {}, "unknown"],
  ["name is not level evidence", { name: "Central High School" }, "unknown"],
  ["ambiguous secondary", { "school:level": "secondary" }, "unknown"],
  [
    "primary and ambiguous secondary",
    { "school:level": "primary;secondary" },
    "unknown",
  ],
  [
    "explicit textual levels",
    { "school:level": "lower_secondary;upper_secondary" },
    "combined",
  ],
  ["invalid numeric data", { "isced:level": "23" }, "unknown"],
  ["descending range", { "isced:level": "3-2" }, "unknown"],
  ["partially invalid data", { "isced:level": "2;unknown" }, "unknown"],
  [
    "explicit fallback",
    { "isced:level": "unknown", "school:level": "high_school" },
    "high",
  ],
])
  test(`level: ${name}`, () => assert.equal(classifyLevel(tags), expected));

for (const [name, tags, expected] of [
  ["government operator", { "operator:type": "government" }, "public"],
  ["private ownership", { ownership: "private" }, "private"],
  ["explicit school type", { "school:type": "public" }, "public"],
  ["no source status", {}, "unknown"],
  ["fees do not imply private", { fee: "yes" }, "unknown"],
  [
    "religion does not imply private",
    { "operator:type": "religious", religion: "christian" },
    "unknown",
  ],
  [
    "public funding does not imply public ownership",
    { funding: "public" },
    "unknown",
  ],
  [
    "conflicting classifications",
    { ownership: "private", "operator:type": "government" },
    "unknown",
  ],
])
  test(`status: ${name}`, () =>
    assert.equal(classifyOwnership(tags), expected));
