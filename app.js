import {
  classifyLevel,
  classifyOwnership,
  levelLabels,
  ownershipLabels,
} from "./classification.mjs";
import { teamConfig } from "./team-config.mjs";
import { createTeamPins } from "./team-pins.mjs";
import { schoolDetails, emailHref, phoneHref } from "./school-details.mjs";

const teamPins = createTeamPins(teamConfig);
const pendingPins = new Set();

const regions = {
  north: "CA US MX",
  central: "BZ CR SV GT HN NI PA",
  caribbean:
    "AG BS BB CU DM DO GD HT JM KN LC VC TT AW BQ CW SX PR VG VI KY TC AI BM MS GP MQ BL MF",
  south: "AR BO BR CL CO EC GY PY PE SR UY VE GF FK",
  europe:
    "AL AD AT BY BE BA BG HR CY CZ DK EE FI FR DE GR HU IS IE IT XK LV LI LT LU MT MD MC ME NL MK NO PL PT RO RU SM RS SK SI ES SE CH TR UA GB VA AX FO GI GG IM JE",
};
const names = new Intl.DisplayNames(["en"], { type: "region" });
const form = document.querySelector("#search-form");
const region = document.querySelector("#region");
const country = document.querySelector("#country");
const city = document.querySelector("#city");
const filter = document.querySelector("#name-filter");
const levelFilter = document.querySelector("#level-filter");
const ownershipFilter = document.querySelector("#ownership-filter");
const results = document.querySelector("#results");
const status = document.querySelector("#status");
const submit = document.querySelector("#submit");
let schools = [];
let locationLabel = "";
let hasSearched = false;

function populateCountries() {
  const previous = country.value;
  const codes =
    region.value === "all"
      ? Object.values(regions).join(" ")
      : regions[region.value];
  country.replaceChildren(new Option("Select a country", ""));
  [...new Set(codes.split(" "))]
    .sort((a, b) => names.of(a).localeCompare(names.of(b)))
    .forEach((code) => country.add(new Option(names.of(code), code)));
  country.value = previous;
}
region.addEventListener("change", populateCountries);
populateCountries();

document.querySelectorAll("[data-city]").forEach((button) => {
  button.addEventListener("click", () => {
    region.value = button.dataset.region;
    populateCountries();
    country.value = button.dataset.country;
    city.value = button.dataset.city;
    submit.focus();
  });
});

function element(tag, text, className) {
  const node = document.createElement(tag);
  node.textContent = text;
  if (className) node.className = className;
  return node;
}

function render() {
  results.replaceChildren();
  const query = filter.value.trim().toLocaleLowerCase();
  const selectedLevels = checkedValues(levelFilter);
  const selectedOwnership = checkedValues(ownershipFilter);
  const visible = schools.filter(
    (school) =>
      school.name.toLocaleLowerCase().includes(query) &&
      (!selectedLevels.length || selectedLevels.includes(school.level)) &&
      (!selectedOwnership.length ||
        selectedOwnership.includes(school.ownership)),
  );
  status.className = "";
  status.textContent = `${visible.length} of ${schools.length} mapped schools in ${locationLabel}. Results reflect OpenStreetMap coverage, not a complete directory.`;
  if (!visible.length) {
    const empty = element("div", "", "empty");
    empty.append(
      element(
        "h3",
        schools.length
          ? "No schools match these filters."
          : "No mapped schools found.",
      ),
      element(
        "p",
        schools.length
          ? "Try another school level or public/private status, or clear the name filter. Some schools have no classification data."
          : "Try another city. This does not mean there are no schools in this location.",
      ),
    );
    results.append(empty);
    return;
  }
  for (const [level, label] of Object.entries(levelLabels)) {
    const groupSchools = visible.filter((school) => school.level === level);
    if (!groupSchools.length) continue;
    const group = element("section", "", "school-group");
    const heading = element("h3", label, "group-heading");
    heading.append(element("span", String(groupSchools.length), "group-count"));
    group.append(heading);
    const grid = element("div", "", "school-grid");
    for (const school of groupSchools) {
      const card = element("article", "", "school");
      const badges = element("div", "", "school-badges");
      badges.append(
        element("span", levelLabels[school.level], "category"),
        element(
          "span",
          ownershipLabels[school.ownership],
          `ownership ${school.ownership}`,
        ),
      );
      card.append(badges, element("h4", school.name), detailsList(school));
      const link = element("a", "View on OpenStreetMap");
      link.href = `https://www.openstreetmap.org/${school.type}/${school.id}`;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      card.append(link, pinButton(school));
      grid.append(card);
    }
    group.append(grid);
    results.append(group);
  }
}

async function getJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    signal: AbortSignal.timeout(60000),
  });
  if (!response.ok)
    throw new Error(
      response.status === 429
        ? "The public data service is busy. Please wait a minute and try again."
        : `The public data service could not complete the search (HTTP ${response.status}). Please try again later.`,
    );
  return response.json();
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const cityName = city.value.trim();
  if (!cityName || !country.value) {
    city.reportValidity();
    return;
  }
  const countryCode = country.value;
  submit.disabled = true;
  submit.querySelector(".button-label").textContent = "Searching…";
  filter.disabled = true;
  levelFilter.disabled = true;
  ownershipFilter.disabled = true;
  filter.value = "";
  schools = [];
  hasSearched = false;
  results.replaceChildren();
  results.setAttribute("aria-busy", "true");
  status.className = "";
  status.textContent = `Finding schools in ${cityName}, ${names.of(countryCode)}…`;
  try {
    const params = new URLSearchParams({
      city: cityName,
      countrycodes: countryCode.toLowerCase(),
      format: "jsonv2",
      limit: "1",
    });
    const places = await getJson(
      `https://nominatim.openstreetmap.org/search?${params}`,
    );
    if (!places.length)
      throw new Error(
        "We could not locate that city in the selected country. Check its spelling or try a nearby city.",
      );
    const [south, north, west, east] = places[0].boundingbox.map(Number);
    if (![south, north, west, east].every(Number.isFinite))
      throw new Error(
        "The location service returned an invalid boundary. Please try another city.",
      );
    if (north - south > 3 || east - west > 3)
      throw new Error(
        "This location covers too large an area. Please search for a smaller city or town.",
      );
    const query = `[out:json][timeout:35];nwr["amenity"="school"](${south},${west},${north},${east});out center tags;`;
    const data = await getJson("https://overpass-api.de/api/interpreter", {
      method: "POST",
      body: new URLSearchParams({ data: query }),
    });
    if (data.remark)
      throw new Error(
        "The school search could not finish. Please try a smaller town or try again later.",
      );
    if (!Array.isArray(data.elements))
      throw new Error(
        "The school service returned an unexpected response. Please try again later.",
      );
    const seen = new Set();
    schools = data.elements
      .filter((item) => {
        const key = `${item.type}/${item.id}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map((item) => ({
        id: item.id,
        type: item.type,
        level: classifyLevel(item.tags),
        ownership: classifyOwnership(item.tags),
        name: item.tags?.name || item.tags?.["name:en"] || "Unnamed school",
        ...schoolDetails(item.tags),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
    locationLabel = `${cityName}, ${names.of(countryCode)}`;
    hasSearched = true;
    filter.disabled = schools.length === 0;
    levelFilter.disabled = schools.length === 0;
    ownershipFilter.disabled = schools.length === 0;
    render();
  } catch (error) {
    status.className = "error";
    status.textContent =
      error.name === "TimeoutError"
        ? "The search took too long. Try a smaller city or try again later."
        : error instanceof TypeError
          ? "Could not reach the public school data service. Check your connection and try again."
          : error.message;
    const empty = element("div", "", "empty");
    empty.append(
      element("h3", "Let’s try that again."),
      element(
        "p",
        "Change your location or submit a new search when the service is available.",
      ),
    );
    results.append(empty);
  } finally {
    submit.disabled = false;
    submit.querySelector(".button-label").textContent = "Find schools";
    results.removeAttribute("aria-busy");
  }
});
filter.addEventListener("input", render);
function checkedValues(fieldset) {
  return [...fieldset.querySelectorAll("input:checked")].map(
    (input) => input.value,
  );
}

for (const fieldset of [levelFilter, ownershipFilter]) {
  function updateSelection() {
    const selected = [...fieldset.querySelectorAll("input:checked")];
    const labels = selected.map((input) => input.dataset.label);
    document.getElementById(fieldset.dataset.summary).textContent =
      labels.length === 0
        ? fieldset.dataset.allLabel
        : labels.length <= 2
          ? labels.join(" + ")
          : `${labels.length} selected`;
    if (hasSearched) render();
  }
  fieldset.addEventListener("change", updateSelection);
  fieldset.querySelector("button").addEventListener("click", () => {
    fieldset.querySelectorAll("input").forEach((input) => {
      input.checked = false;
    });
    updateSelection();
  });
}
document.addEventListener("click", (event) => {
  document.querySelectorAll(".multi-select[open]").forEach((menu) => {
    if (!menu.contains(event.target)) menu.open = false;
  });
});
document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  document.querySelectorAll(".multi-select[open]").forEach((menu) => {
    if (menu.contains(document.activeElement))
      menu.querySelector("summary").focus();
    menu.open = false;
  });
});

function detailsList(school) {
  const list = element("dl", "", "school-details");
  for (const [label, values, href] of [
    ["Address", school.address ? [school.address] : [], null],
    ["Email", school.emails, emailHref],
    ["Phone", school.phones, phoneHref],
    ["Hours (as listed)", school.hours ? [school.hours] : [], null],
  ]) {
    const row = element("div", "", "detail-row");
    const description = element("dd", "", values.length ? "" : "not-listed");
    if (!values.length) description.textContent = "Not listed";
    for (const value of values) {
      const target = href?.(value);
      const entry = element(target ? "a" : "span", value);
      if (target) entry.href = target;
      description.append(entry);
    }
    row.append(element("dt", label), description);
    list.append(row);
  }
  return list;
}

function pinButton(school) {
  const id = `${school.type}/${school.id}`;
  const pinned = teamPins.has(id);
  const button = element("button", "", `pin-button${pinned ? " pinned" : ""}`);
  button.type = "button";
  button.dataset.pinId = id;
  button.setAttribute("aria-pressed", String(pinned));
  button.setAttribute(
    "aria-label",
    `${pinned ? "Remove reached-out pin from" : "Mark reached out to"} ${school.name}`,
  );
  const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  icon.setAttribute("viewBox", "0 0 24 24");
  icon.setAttribute("aria-hidden", "true");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", "m8 3 8 0-1 6 3 4H6l3-4-1-6Zm4 10v8");
  icon.append(path);
  const label = !teamPins.configured
    ? "Pins not connected"
    : !teamPins.signedIn
      ? "Sign in to use pins"
      : !teamPins.ready
        ? "Pin status unavailable"
        : pendingPins.has(id)
          ? "Saving…"
          : pinned
            ? "Reached out"
            : "Mark reached out";
  button.append(icon, element("span", label));
  button.disabled =
    !teamPins.configured ||
    pendingPins.has(id) ||
    (teamPins.signedIn && !teamPins.ready);
  button.addEventListener("click", async () => {
    if (!teamPins.signedIn) {
      openTeamDialog();
      return;
    }
    if (
      pinned &&
      !window.confirm(`Remove the team's reached-out pin from ${school.name}?`)
    )
      return;
    pendingPins.add(id);
    button.disabled = true;
    button.querySelector("span").textContent = "Saving…";
    try {
      await teamPins.set(id, !pinned);
      pinStatus.textContent = pinned
        ? `Reached-out pin removed from ${school.name}.`
        : `${school.name} is marked as reached out for the team.`;
    } catch (error) {
      pinStatus.textContent = error.message;
    } finally {
      pendingPins.delete(id);
      if (hasSearched) render();
      results
        .querySelector(`[data-pin-id="${id}"]`)
        ?.focus({ preventScroll: true });
    }
  });
  return button;
}

const teamDialog = document.querySelector("#team-dialog");
const teamForm = document.querySelector("#team-form");
const teamMessage = document.querySelector("#team-message");
const pinStatus = document.querySelector("#pins-status");
const refreshPins = document.querySelector("#refresh-pins");
const signOut = document.querySelector("#team-signout");
function updateTeamUi() {
  teamForm.hidden = !teamPins.configured || teamPins.signedIn;
  signOut.hidden = !teamPins.signedIn;
  refreshPins.hidden = !teamPins.signedIn;
  document.querySelector("#open-team").textContent = teamPins.signedIn
    ? "Team connected"
    : "Team pins";
  if (!teamPins.signedIn)
    pinStatus.textContent = teamPins.configured
      ? "Sign in to see the team's reached-out pins."
      : "Team pins are not connected yet. School search and filters are available.";
}
function openTeamDialog() {
  teamMessage.textContent = !teamPins.configured
    ? "Shared pins are not connected yet. The site owner needs to finish setup before the team can use them."
    : teamPins.signedIn
      ? "You are signed in. Pins are shared with your team. Refresh to see the latest updates."
      : "Sign in with the team account provided by the site owner. Pins show schools someone on your team has already contacted.";
  updateTeamUi();
  teamDialog.showModal();
}
document.querySelector("#open-team").addEventListener("click", openTeamDialog);
document
  .querySelector("#close-team")
  .addEventListener("click", () => teamDialog.close());
teamForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = teamForm.querySelector("button");
  button.disabled = true;
  teamMessage.textContent = "Signing in…";
  try {
    await teamPins.signIn(
      document.querySelector("#team-email").value.trim(),
      document.querySelector("#team-password").value,
    );
    pinStatus.textContent =
      "Team pins loaded. Updates are checked every minute while this page is open.";
    teamDialog.close();
  } catch (error) {
    teamMessage.textContent = error.message;
  } finally {
    document.querySelector("#team-password").value = "";
    button.disabled = false;
    updateTeamUi();
    if (hasSearched) render();
  }
});
async function syncPins() {
  if (!teamPins.signedIn || pendingPins.size) return;
  refreshPins.disabled = true;
  try {
    await teamPins.refresh();
    pinStatus.textContent =
      "Team pins are up to date. An unpinned school has no shared reached-out pin recorded.";
    teamMessage.textContent = "Team pins are up to date.";
  } catch (error) {
    pinStatus.textContent = error.message;
    teamMessage.textContent = error.message;
  } finally {
    refreshPins.disabled = false;
    if (hasSearched) render();
  }
}
refreshPins.addEventListener("click", syncPins);
signOut.addEventListener("click", async () => {
  try {
    await teamPins.signOut();
  } catch {
    /* The in-memory session is cleared even if remote logout fails. */
  }
  updateTeamUi();
  teamMessage.textContent = "Signed out. Sign in again to see team pins.";
  pinStatus.textContent = "Sign in to see the team's reached-out pins.";
  if (hasSearched) render();
});
setInterval(() => {
  if (!document.hidden) syncPins();
}, 60000);
updateTeamUi();
