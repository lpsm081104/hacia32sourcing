export const levelLabels = {
  middle: "Middle school",
  high: "High school",
  combined: "Middle / high school",
  other: "Other school levels",
  unknown: "Level not specified",
};

export const ownershipLabels = {
  public: "Public",
  private: "Private",
  unknown: "Public / private not specified",
};

// ISCED 2 is lower secondary; ISCED 3 is upper secondary. These are
// international equivalents, not a claim about each country's grade boundaries.
export function classifyLevel(tags = {}) {
  const raw = String(tags["isced:level"] || "").trim();
  if (raw) {
    const levels = new Set();
    const valid = raw.split(/[;,/]/).every((part) => {
      const match = part.trim().match(/^([0-8])(?:\s*-\s*([0-8]))?$/);
      if (!match) return false;
      const start = Number(match[1]);
      const end = Number(match[2] ?? match[1]);
      if (end < start) return false;
      for (let i = start; i <= end; i++) levels.add(i);
      return true;
    });
    if (valid) return levelFromFlags(levels.has(2), levels.has(3));
  }
  const levels = String(tags["school:level"] || "")
    .toLowerCase()
    .split(/[;,]/)
    .map((value) => value.trim().replace(/[ -]+/g, "_"));
  const middle = levels.some((level) =>
    ["middle", "middle_school", "junior_high", "lower_secondary"].includes(
      level,
    ),
  );
  const high = levels.some((level) =>
    ["high", "high_school", "senior_high", "upper_secondary"].includes(level),
  );
  if (middle || high) return levelFromFlags(middle, high);
  if (
    levels.every((level) =>
      [
        "primary",
        "elementary",
        "preschool",
        "kindergarten",
        "tertiary",
      ].includes(level),
    )
  )
    return "other";
  return "unknown";
}

function levelFromFlags(middle, high) {
  return middle && high
    ? "combined"
    : middle
      ? "middle"
      : high
        ? "high"
        : "other";
}

export function classifyOwnership(tags = {}) {
  // Fees, religious affiliation, school names and funding do not reliably
  // establish public/private status. Conflicting explicit tags remain unknown.
  const values = [tags.ownership, tags["operator:type"], tags["school:type"]]
    .filter(Boolean)
    .map((value) => String(value).trim().toLowerCase());
  const publicTags = [
    "public",
    "government",
    "governmental",
    "state",
    "municipal",
    "federal",
  ];
  const publicStatus = values.some((value) => publicTags.includes(value));
  const privateStatus = values.includes("private");
  return publicStatus === privateStatus
    ? "unknown"
    : publicStatus
      ? "public"
      : "private";
}
