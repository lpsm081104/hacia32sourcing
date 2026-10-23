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
const results = document.querySelector("#results");
const status = document.querySelector("#status");
const submit = document.querySelector("#submit");
let schools = [];
let locationLabel = "";

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
  const visible = schools.filter((school) =>
    school.name.toLocaleLowerCase().includes(query),
  );
  status.className = "";
  status.textContent = `${visible.length} of ${schools.length} mapped schools in ${locationLabel}. Results reflect OpenStreetMap coverage, not a complete directory.`;
  if (!visible.length) {
    const empty = element("div", "", "empty");
    empty.append(
      element(
        "h3",
        schools.length
          ? "No names match your filter."
          : "No mapped schools found.",
      ),
      element(
        "p",
        schools.length
          ? "Try a shorter name or clear the filter."
          : "Try another city. This does not mean there are no schools in this location.",
      ),
    );
    results.append(empty);
    return;
  }
  for (const school of visible) {
    const card = element("article", "", "school");
    card.append(
      element("span", "SCHOOL", "category"),
      element("h3", school.name),
      element("p", school.address || "Street address not listed"),
    );
    const link = element("a", "View on OpenStreetMap");
    link.href = `https://www.openstreetmap.org/${school.type}/${school.id}`;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    card.append(link);
    results.append(card);
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
  filter.value = "";
  schools = [];
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
        name: item.tags?.name || item.tags?.["name:en"] || "Unnamed school",
        address: [
          item.tags?.["addr:housenumber"],
          item.tags?.["addr:street"],
          item.tags?.["addr:city"],
        ]
          .filter(Boolean)
          .join(" "),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
    locationLabel = `${cityName}, ${names.of(countryCode)}`;
    filter.disabled = schools.length === 0;
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
