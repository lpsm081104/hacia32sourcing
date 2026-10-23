# School finder

A static, dependency-free school discovery app for the Americas and Europe. No accounts, contact management, or outreach tracking.

## Run locally

From the repository root, run:

```sh
python3 -m http.server 3000 --bind 0.0.0.0
```

Open the forwarded port in your development environment. No install or build step is required. Check JavaScript syntax with `node --check app.js`.

## Data and limitations

Searches are submitted explicitly: Nominatim locates the selected city and Overpass returns OpenStreetMap objects tagged `amenity=school` within the city bounding box. Results can include nearby places within that rectangle and are not a complete school directory. Separately mapped objects for the same campus may appear more than once. Universities and colleges with other amenity tags are excluded. Data varies by location; missing addresses and unnamed schools are shown honestly. No sample schools are presented as live results.

The browser needs HTTPS access to nominatim.openstreetmap.org and overpass-api.de. Public services can impose rate limits or be unavailable. This initial implementation is appropriate for low-volume evaluation; a public launch should use a hosted data service or a cached backend with a shared rate limiter, particularly to comply with Nominatim's application-wide maximum of one request per second. Respect the providers' usage policies and preserve OpenStreetMap attribution. Searches are sent to those providers; the app itself stores no search history.

Optional fonts load from fonts.googleapis.com and fonts.gstatic.com with local fallbacks. No API keys or secrets are required.

## School classifications

Results are grouped by level and can be filtered independently by level, public/private status, and school name. The combined middle/high category means a school explicitly offers both levels; selecting high school alone selects the high-only category. Filters persist across location searches.

`classification.mjs` maps ISCED 2 (lower secondary) to middle school, ISCED 3 (upper secondary) to high school, and both to middle/high. Semicolon-separated levels and numeric ranges are supported. Explicit `school:level` equivalents are used if valid ISCED data is unavailable. Generic “secondary” is ambiguous and remains unspecified. Known non-secondary levels are grouped under other levels. International equivalents do not establish precise grades in every country.

Public/private status uses explicit `ownership`, `operator:type`, or `school:type` tags. Conflicting explicit classifications remain unspecified. Names, fee status, religion, and funding alone do not establish ownership. No classification is inferred from school names, and unclassified schools remain visible in their own group. OpenStreetMap coverage may leave many results unclassified.

Run classification regression tests with `node --test tests/classification.test.mjs`.

## Shared reached-out pins

See [TEAM-PINS-SETUP.md](TEAM-PINS-SETUP.md) for database creation, team membership, and browser-safe connection settings. Searching and classification filters work independently of team pins. The shared pin controls remain unavailable until the service is configured; there is no misleading browser-only fallback. Run all unit tests with `node --test tests/*.test.mjs`. The tests use mocked HTTP responses, so they do not establish that a real Supabase project or its row-level policies are correctly installed.
