const clean = (value) => (typeof value === "string" ? value.trim() : "");

export function schoolDetails(tags = {}) {
  const street = [
    clean(tags["addr:housenumber"]),
    clean(tags["addr:street"]) || clean(tags["addr:place"]),
  ]
    .filter(Boolean)
    .join(" ");
  const address =
    clean(tags["addr:full"]) ||
    [
      ...new Set(
        [
          street,
          clean(tags["addr:unit"]) ? `Unit ${clean(tags["addr:unit"])}` : "",
          clean(tags["addr:suburb"]),
          clean(tags["addr:city"]) ||
            clean(tags["addr:town"]) ||
            clean(tags["addr:village"]),
          clean(tags["addr:state"]),
          clean(tags["addr:postcode"]),
          clean(tags["addr:country"]),
        ].filter(Boolean),
      ),
    ].join(", ");
  const values = (preferred, fallback) => [
    ...new Set(
      (clean(tags[preferred]) || clean(tags[fallback]))
        .split(";")
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  ];
  return {
    address,
    emails: values("contact:email", "email"),
    phones: values("contact:phone", "phone"),
    hours: clean(tags.opening_hours),
  };
}

export function emailHref(email) {
  // Invalid or unusual source values are still displayed as text, never turned
  // into links with injected recipients, subject lines or control characters.
  return /^[a-z0-9.!$'+=_`{|}~-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(email)
    ? `mailto:${email}`
    : null;
}

export function phoneHref(phone) {
  const match = phone.match(/^([+\d\s().-]+?)(?:\s*(?:ext\.?|x)\s*(\d+))?$/i);
  if (!match || (match[1].match(/\d/g) || []).length < 3) return null;
  const number = match[1].replace(/[\s().-]/g, "");
  if (!/^\+?\d+$/.test(number)) return null;
  return `tel:${number}${match[2] ? `;ext=${match[2]}` : ""}`;
}
