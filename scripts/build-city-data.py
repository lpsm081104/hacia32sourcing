"""Build country-scoped city lists from a GeoNames/datasets world-cities CSV.

Usage: python3 scripts/build-city-data.py /path/to/world-cities.csv
Only Python's standard library is required. See data/cities/README.md.
"""
import csv
import hashlib
import json
from pathlib import Path
import sys

root = Path(__file__).resolve().parent.parent
source = Path(sys.argv[1])
mapping = json.loads((root / "data/city-countries.json").read_text())
grouped = {code: [] for code in mapping["supportedCodes"]}
with source.open(encoding="utf-8", newline="") as stream:
    for row in csv.DictReader(stream):
        code = mapping["sourceCountries"].get(row["country"])
        if code:
            grouped[code].append([row["name"], row["subcountry"], row["geonameid"]])
for code, rows in grouped.items():
    rows.sort(key=lambda row: (row[0].casefold(), row[1].casefold(), row[2]))
    (root / f"data/cities/{code}.json").write_text(json.dumps(rows, ensure_ascii=False, separators=(",", ":")) + "\n")
metadata = {
    "source": "https://github.com/datasets/world-cities",
    "download": "https://raw.githubusercontent.com/datasets/world-cities/master/data/world-cities.csv",
    "sourceSha256": hashlib.sha256(source.read_bytes()).hexdigest(),
    "license": "CC-BY-4.0",
    "attribution": "GeoNames, via datasets/world-cities",
    "countries": len(grouped),
    "places": sum(map(len, grouped.values())),
}
(root / "data/cities/source.json").write_text(json.dumps(metadata, indent=2) + "\n")
print(f"Built {metadata['places']} place options across {metadata['countries']} country/territory lists.")
