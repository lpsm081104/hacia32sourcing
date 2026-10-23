# City dropdown data

City data © [GeoNames](https://www.geonames.org/), provided through [datasets/world-cities](https://github.com/datasets/world-cities), licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Not affiliated with or endorsed by the providers.

This source lists places with more than 15,000 inhabitants, plus capitals and seats of government which can be smaller. It is not a complete list of all cities and towns. The site offers an “Other city or town” option for missing places.

Changes made: restricted to supported search countries and territories, grouped by country code, sorted, and converted from CSV into compact JSON arrays `[name, first-level region, GeoNames ID]`. Source spellings are retained; region names are as provided by the source. Source columns for country names are replaced by country-scoped files. `source.json` records the source CSV's checksum and counts. Data was retrieved for this implementation on 2026-10-23.

The mapping in `../city-countries.json` aligns the source's country names with ISO country codes, with Kosovo represented as XK. Countries without source rows have an empty list and still support manual town entry.

To regenerate, download the source CSV linked in `source.json` with normal TLS verification and run `python3 scripts/build-city-data.py /path/to/world-cities.csv` from the repository root. Review country-name mapping changes if refreshing to a source with different names. The app fetches only the selected country's checked-in JSON; it makes no external autocomplete requests. Search boundaries still come from a separate Nominatim request using the chosen city, region and country. The dropdown alone does not prove a geocoder's boundary or country match.
