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
