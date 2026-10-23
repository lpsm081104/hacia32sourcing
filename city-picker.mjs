import { normalizeText } from "./classification.mjs";

export function createCityPicker({ select, manual, hint, request = fetch }) {
  const cache = new Map();
  let generation = 0;
  let rows = [];
  let loading = false;
  function updateManual() {
    const active = select.value === "__manual__";
    manual.hidden = !active;
    manual.disabled = !active;
    manual.required = active;
    if (!active) manual.value = "";
  }
  select.addEventListener("change", () => {
    updateManual();
    if (!manual.hidden) manual.focus();
  });
  async function load(code, preferredName = "") {
    const current = ++generation;
    rows = [];
    select.replaceChildren(
      new Option(code ? "Loading cities…" : "Select a country first", ""),
    );
    select.disabled = true;
    updateManual();
    hint.textContent = code
      ? "Loading the selected country's city list…"
      : "Choose a country to see its cities and towns.";
    loading = Boolean(code);
    if (!code) return;
    if (!/^[A-Z]{2}$/.test(code)) throw new Error("Invalid country code.");
    try {
      if (!cache.has(code))
        cache.set(
          code,
          (async () => {
            const response = await request(`./data/cities/${code}.json`, {
              signal: AbortSignal.timeout(15000),
            });
            if (!response.ok) throw new Error("City list unavailable");
            const list = await response.json();
            if (
              !Array.isArray(list) ||
              !list.every(
                (row) =>
                  Array.isArray(row) &&
                  row.length === 3 &&
                  row.every((value) => typeof value === "string"),
              )
            )
              throw new Error("Invalid city list");
            return list;
          })(),
        );
      const list = await cache.get(code);
      if (current !== generation) return;
      rows = [...list].sort(
        (a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]),
      );
      select.replaceChildren(new Option("Select a city or town", ""));
      const fragment = document.createDocumentFragment();
      for (const [name, state, id] of rows)
        fragment.append(new Option(state ? `${name} — ${state}` : name, id));
      fragment.append(new Option("Other city or town…", "__manual__"));
      select.append(fragment);
      hint.textContent = rows.length
        ? "Type to jump in the list. Missing town? Choose Other city or town."
        : "No cities listed. Choose Other city or town to enter a place.";
    } catch {
      cache.delete(code);
      if (current !== generation) return;
      select.replaceChildren(new Option("Other city or town…", "__manual__"));
      select.value = "__manual__";
      hint.textContent =
        "The city list could not load. Enter a city or town below.";
    } finally {
      if (current === generation) {
        select.disabled = false;
        loading = false;
        if (preferredName) {
          const match = rows.find(
            (row) => normalizeText(row[0]) === normalizeText(preferredName),
          );
          select.value = match ? match[2] : "__manual__";
          updateManual();
          if (!match) manual.value = preferredName;
        } else updateManual();
      }
    }
  }
  return {
    load,
    selection() {
      if (loading || select.disabled || !select.value) return null;
      if (select.value === "__manual__")
        return manual.value.trim()
          ? { name: manual.value.trim(), state: "" }
          : null;
      const row = rows.find((row) => row[2] === select.value);
      return row ? { name: row[0], state: row[1] } : null;
    },
    reportValidity() {
      if (loading)
        hint.textContent = "Please wait for the city list to finish loading.";
      else if (!manual.disabled) manual.reportValidity();
      else select.reportValidity();
    },
  };
}
