import test from "node:test";
import assert from "node:assert/strict";
import { createTeamPins } from "../team-pins.mjs";

function fixture() {
  const calls = [];
  const responses = [];
  const client = createTeamPins(
    { url: "https://example.supabase.co", publishableKey: "public-test-key" },
    async (url, options) => {
      calls.push({ url, options });
      assert(responses.length, "Unexpected API request");
      return responses.shift();
    },
  );
  const json = (value) =>
    new Response(JSON.stringify(value), {
      headers: { "Content-Type": "application/json" },
    });
  const login = () =>
    responses.push(
      json({
        access_token: "test-access",
        refresh_token: "test-refresh",
        expires_in: 3600,
        user: { id: "test-user" },
      }),
      json([{ user_id: "test-user" }]),
      json([{ school_id: "way/1" }]),
    );
  return { client, calls, responses, json, login };
}

test("pins need a configured service and authenticated team membership", async () => {
  const unconfigured = createTeamPins({ url: "", publishableKey: "" });
  assert.equal(unconfigured.configured, false);
  await assert.rejects(
    () => unconfigured.signIn("member@example.com", "test"),
    /not connected/,
  );
  const { client } = fixture();
  await assert.rejects(() => client.set("way/1", true), /Sign in/);
});

test("loads shared pins, adds/removes stable school IDs, and clears on sign-out", async () => {
  const f = fixture();
  f.login();
  await f.client.signIn("member@example.com", "test");
  assert.equal(f.client.ready, true);
  assert.equal(f.client.has("way/1"), true);
  f.responses.push(new Response(null, { status: 204 }));
  await f.client.set("node/2", true);
  assert.equal(f.client.has("node/2"), true);
  const insert = f.calls.at(-1);
  assert.equal(insert.options.method, "POST");
  assert.equal(insert.options.headers.Authorization, "Bearer test-access");
  assert.deepEqual(JSON.parse(insert.options.body), { school_id: "node/2" });
  f.responses.push(new Response(null, { status: 204 }));
  await f.client.set("node/2", false);
  assert.equal(f.client.has("node/2"), false);
  f.responses.push(new Response(null, { status: 204 }));
  await f.client.signOut();
  assert.equal(f.client.signedIn, false);
  assert.equal(f.client.ready, false);
});

test("non-members cannot load or edit pins", async () => {
  const f = fixture();
  f.login();
  f.responses[1] = f.json([]);
  await assert.rejects(
    () => f.client.signIn("outsider@example.com", "test"),
    /not on the school-finder team/,
  );
  assert.equal(f.client.ready, false);
  assert.equal(f.client.signedIn, false);
});

test("failed writes do not falsely display a successful pin", async () => {
  const f = fixture();
  f.login();
  await f.client.signIn("member@example.com", "test");
  f.responses.push(new Response(null, { status: 403 }));
  await assert.rejects(() => f.client.set("node/2", true));
  assert.equal(f.client.has("node/2"), false);
});

test("partial pagination failures make all pin statuses unavailable", async () => {
  const f = fixture();
  f.login();
  await f.client.signIn("member@example.com", "test");
  f.responses.push(
    f.json([{ user_id: "test-user" }]),
    f.json(
      Array.from({ length: 500 }, (_, i) => ({ school_id: `node/${i + 1}` })),
    ),
    new Response(null, { status: 500 }),
  );
  await assert.rejects(() => f.client.refresh());
  assert.equal(f.client.ready, false);
  await assert.rejects(
    () => f.client.set("node/600", true),
    /refresh team pins/,
  );
});

test("revoked membership is checked again on refresh", async () => {
  const f = fixture();
  f.login();
  await f.client.signIn("member@example.com", "test");
  f.responses.push(f.json([]));
  await assert.rejects(
    () => f.client.refresh(),
    /not on the school-finder team/,
  );
  assert.equal(f.client.ready, false);
});
