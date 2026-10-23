import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const mapping = JSON.parse(
  await readFile(new URL("data/city-countries.json", root)),
);
test("every offered country has a valid local city list with unique place IDs", async () => {
  let count = 0;
  for (const code of mapping.supportedCodes) {
    assert.match(code, /^[A-Z]{2}$/);
    const rows = JSON.parse(
      await readFile(new URL(`data/cities/${code}.json`, root)),
    );
    const ids = new Set();
    for (const [name, state, id] of rows) {
      assert.equal(typeof name, "string");
      assert(name.trim());
      assert.equal(typeof state, "string");
      assert.match(id, /^\d+$/);
      assert(!ids.has(id), `${code}: duplicate city ID ${id}`);
      ids.add(id);
    }
    count += rows.length;
  }
  const metadata = JSON.parse(
    await readFile(new URL("data/cities/source.json", root)),
  );
  assert.equal(metadata.places, count);
  assert.equal(metadata.countries, mapping.supportedCodes.length);
  assert.equal(metadata.license, "CC-BY-4.0");
});
test("city coverage matches the countries and territories offered in the interface", async () => {
  const app = await readFile(new URL("app.js", root), "utf8");
  const regionBlock = app.split("const regions = {")[1].split("};")[0];
  const offered = [...new Set(regionBlock.match(/\b[A-Z]{2}\b/g))].sort();
  assert.deepEqual(mapping.supportedCodes, offered);
});
test("country-specific lists include the shortcut cities and disambiguating regions", async () => {
  for (const [code, city] of [
    ["CO", "Bogotá"],
    ["ES", "Madrid"],
    ["MX", "Mexico City"],
    ["BR", "São Paulo"],
  ]) {
    const rows = JSON.parse(
      await readFile(new URL(`data/cities/${code}.json`, root)),
    );
    assert(
      rows.some((row) => row[0] === city),
      `${city} missing from ${code}`,
    );
  }
  const us = JSON.parse(await readFile(new URL("data/cities/US.json", root)));
  const springfields = us.filter((row) => row[0] === "Springfield");
  assert(new Set(springfields.map((row) => row[1])).size > 1);
});
