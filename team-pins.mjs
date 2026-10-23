export function createTeamPins(config, request = fetch) {
  const configured =
    /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(config.url) &&
    Boolean(config.publishableKey);
  const base = config.url.replace(/\/$/, "");
  let session = null;
  let pins = new Set();
  let ready = false;

  async function api(path, options = {}) {
    const response = await request(`${base}${path}`, {
      ...options,
      headers: {
        apikey: config.publishableKey,
        ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
        "Content-Type": "application/json",
        ...options.headers,
      },
      signal: AbortSignal.timeout(20000),
    });
    if (!response.ok)
      throw new Error(
        "The team service could not complete this request. Check your connection and sign in again if needed.",
      );
    return response.status === 204 ? null : response.json();
  }

  function clear() {
    session = null;
    pins = new Set();
    ready = false;
  }

  async function refresh() {
    ready = false;
    if (!session) throw new Error("Sign in to see your team's pins.");
    if (Date.now() > session.expires_at - 30000) {
      const data = await api("/auth/v1/token?grant_type=refresh_token", {
        method: "POST",
        body: JSON.stringify({ refresh_token: session.refresh_token }),
      });
      session = { ...data, expires_at: Date.now() + data.expires_in * 1000 };
    }
    const members = await api(
      `/rest/v1/team_members?select=user_id&user_id=eq.${encodeURIComponent(session.user.id)}`,
    );
    if (!Array.isArray(members) || !members.length)
      throw new Error(
        "This account is not on the school-finder team. Ask the site owner to add you.",
      );
    const next = new Set();
    // Fetch every page before declaring any school unpinned. Partial or failed
    // reads must never be presented as "nobody has reached out".
    for (let offset = 0; offset <= 10000; offset += 500) {
      const rows = await api(
        `/rest/v1/school_pins?select=school_id&order=school_id.asc&limit=500&offset=${offset}`,
      );
      if (!Array.isArray(rows)) throw new Error("Could not load team pins.");
      rows.forEach((row) => next.add(row.school_id));
      if (rows.length < 500) {
        pins = next;
        ready = true;
        return;
      }
    }
    throw new Error(
      "The team pin list is too large to load completely. Contact the site owner.",
    );
  }

  return {
    configured,
    get signedIn() {
      return Boolean(session);
    },
    get ready() {
      return ready;
    },
    has(id) {
      return ready && pins.has(id);
    },
    async signIn(email, password) {
      if (!configured)
        throw new Error("Shared team pins are not connected yet.");
      clear();
      try {
        const data = await api("/auth/v1/token?grant_type=password", {
          method: "POST",
          body: JSON.stringify({ email, password }),
        });
        session = { ...data, expires_at: Date.now() + data.expires_in * 1000 };
        await refresh();
      } catch (error) {
        clear();
        throw error;
      }
    },
    async signOut() {
      try {
        if (session) await api("/auth/v1/logout", { method: "POST" });
      } finally {
        clear();
      }
    },
    refresh,
    async set(id, reachedOut) {
      if (!session || !ready)
        throw new Error("Sign in and refresh team pins before making changes.");
      if (!/^(node|way|relation)\/[0-9]+$/.test(id))
        throw new Error("Invalid school identifier.");
      if (reachedOut) {
        await api("/rest/v1/school_pins?on_conflict=school_id", {
          method: "POST",
          headers: { Prefer: "resolution=ignore-duplicates,return=minimal" },
          body: JSON.stringify({ school_id: id }),
        });
        pins.add(id);
      } else {
        await api(
          `/rest/v1/school_pins?school_id=eq.${encodeURIComponent(id)}`,
          { method: "DELETE", headers: { Prefer: "return=minimal" } },
        );
        pins.delete(id);
      }
    },
  };
}
