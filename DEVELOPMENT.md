# School finder

A static, dependency-free school discovery app for the Americas and Europe. No accounts, contact management, or outreach tracking.

## Run locally

From the repository root, run:

```sh
python3 -m http.server 3000 --bind 0.0.0.0
```

Open the forwarded port in your development environment. No install or build step is required. Check JavaScript syntax with `node --check app.js`.

## Country-dependent city dropdown

The city selector loads only the selected country's static `data/cities/<ISO>.json`. It supports native keyboard type-ahead and displays the first-level region beside each city. Changing countries resets both selected and manually entered cities; late responses from previous countries are ignored. A user can choose “Other city or town” for places missing from the major-city dataset, or enter a city if a list fails to load. The country list covers the application's 106 countries and territories, with 17,519 source place records in this snapshot. Some countries have empty lists. No external autocomplete requests are sent; Nominatim is used only after explicit school-search submission, with city, first-level region (for a listed selection), and country code.

City data is from GeoNames via datasets/world-cities under CC BY 4.0, bundled separately from school data. Source, limitations, attribution, and regeneration commands are in [data/cities/README.md](data/cities/README.md). Regeneration is optional maintenance; normal startup requires no network access for city data beyond the site's own JSON files.

## Data and limitations

Searches are submitted explicitly: Nominatim locates the selected city and Overpass returns OpenStreetMap objects tagged `amenity=school` within the city bounding box. Results can include nearby places within that rectangle and are not a complete school directory. Separately mapped objects for the same campus may appear more than once. Universities and colleges with other amenity tags are excluded. Data varies by location; missing addresses and unnamed schools are shown honestly. No sample schools are presented as live results.

The browser needs HTTPS access to nominatim.openstreetmap.org and overpass-api.de. Public services can impose rate limits or be unavailable. This initial implementation is appropriate for low-volume evaluation; a public launch should use a hosted data service or a cached backend with a shared rate limiter, particularly to comply with Nominatim's application-wide maximum of one request per second. Respect the providers' usage policies and preserve OpenStreetMap attribution. Searches are sent to those providers; the app itself stores no search history.

Optional fonts load from fonts.googleapis.com and fonts.gstatic.com with local fallbacks. No API keys or secrets are required.

## School classifications

Results are grouped by level and can be filtered independently by level, public/private status, and school name. Both category filters support multiple checked options: a school may match any checked level and any checked ownership status, and must also match the name query. No checked options means all values for that filter. The combined middle/high category means a school explicitly offers both levels; selecting high school alone selects the high-only category. Filters persist across location searches.

`classification.mjs` maps ISCED 1 to primary, ISCED 2 (lower secondary) to middle school, ISCED 3 (upper secondary) to high school, and both secondary stages to middle/high. Semicolon-separated levels and numeric ranges are supported. Explicit local metadata is used if valid ISCED data is unavailable. See [CLASSIFICATION.md](CLASSIFICATION.md) for supported country mappings and conservative handling of ambiguous terms. International equivalents do not establish precise grades in every country.

Public/private status uses explicit `ownership`, `operator:type`, `school:type`, or `school:sector` tags with supported local-language equivalents. Conflicting explicit classifications remain unspecified. Names, fee status, religion, and funding alone do not establish ownership. No classification is inferred from school names, and unclassified schools remain visible in their own group. OpenStreetMap coverage may leave many results unclassified. Original local wording is displayed on cards. Name filtering matches native and translated source names, ignores accents, and preserves original spelling in the interface.

Run classification regression tests with `node --test tests/classification.test.mjs`.

## School contact details

Cards show address, email, phone and opening hours from each OpenStreetMap object's tags. `contact:email` and `contact:phone` take priority over unprefixed `email` and `phone`. Multiple semicolon-separated contacts are preserved and deduplicated. Full addresses are preferred; otherwise available address components are combined. Missing values are labeled “Not listed”; the app does not fabricate them or infer them from nearby objects. Valid emails and phone numbers have mail/call links, while unusual source values remain plain text. Hours are displayed as listed, without making current open/closed claims or assuming the schedule is instructional rather than campus-access hours.

## Shared reached-out pins

See [TEAM-PINS-SETUP.md](TEAM-PINS-SETUP.md) for database creation, team membership, and browser-safe connection settings. Searching and classification filters work independently of team pins. The shared pin controls remain unavailable until the service is configured; there is no misleading browser-only fallback. Run all unit tests with `node --test tests/*.test.mjs`. The tests use mocked HTTP responses, so they do not establish that a real Supabase project or its row-level policies are correctly installed.
