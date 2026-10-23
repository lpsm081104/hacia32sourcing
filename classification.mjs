export const levelLabels = {
  primary: "Primary school",
  middle: "Middle school / lower secondary",
  high: "High school / upper secondary",
  combined: "Middle / high school",
  other: "Other school levels",
  unknown: "Level not specified",
};
export const ownershipLabels = {
  public: "Public",
  private: "Private",
  unknown: "Public / private not specified",
};

export function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[_–—-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const commonLevels = {
  primary: "primary",
  "primary school": "primary",
  "primary education": "primary",
  elementary: "primary",
  "elementary school": "primary",
  "elementary education": "primary",
  middle: "middle",
  "middle school": "middle",
  "junior high": "middle",
  "junior high school": "middle",
  "lower secondary": "middle",
  "lower secondary education": "middle",
  high: "high",
  "high school": "high",
  "senior high": "high",
  "senior high school": "high",
  "upper secondary": "high",
  "upper secondary education": "high",
  preschool: "other",
  kindergarten: "other",
  tertiary: "other",
};
// Local terms are country-scoped: a shared language does not imply a shared
// education system. Unqualified secondary/basic stages stay unspecified.
const localLevels = {
  BR: {
    "ensino fundamental i": "primary",
    "ensino fundamental 1": "primary",
    "ensino fundamental anos iniciais": "primary",
    "anos iniciais do ensino fundamental": "primary",
    "ensino fundamental ii": "middle",
    "ensino fundamental 2": "middle",
    "ensino fundamental anos finais": "middle",
    "anos finais do ensino fundamental": "middle",
    "ensino medio": "high",
    "educacao infantil": "other",
  },
  PT: {
    "ensino basico 1 ciclo": "primary",
    "1 ciclo do ensino basico": "primary",
    "ensino basico 2 ciclo": "primary",
    "2 ciclo do ensino basico": "primary",
    "ensino basico 3 ciclo": "middle",
    "3 ciclo do ensino basico": "middle",
    "ensino secundario": "high",
    "educacao pre escolar": "other",
  },
  MX: {
    primaria: "primary",
    "educacion primaria": "primary",
    secundaria: "middle",
    "educacion secundaria": "middle",
    "secundaria tecnica": "middle",
    telesecundaria: "middle",
    preparatoria: "high",
    bachillerato: "high",
    "educacion media superior": "high",
    preescolar: "other",
  },
  ES: {
    primaria: "primary",
    "educacion primaria": "primary",
    eso: "middle",
    "educacion secundaria obligatoria": "middle",
    bachillerato: "high",
    "educacion infantil": "other",
  },
  CO: {
    "basica primaria": "primary",
    "educacion basica primaria": "primary",
    "basica secundaria": "middle",
    "educacion basica secundaria": "middle",
    "educacion media": "high",
    "media academica": "high",
    "media tecnica": "high",
  },
  FR: {
    primaire: "primary",
    "ecole primaire": "primary",
    elementaire: "primary",
    "ecole elementaire": "primary",
    college: "middle",
    lycee: "high",
    maternelle: "other",
    "ecole maternelle": "other",
  },
  IT: {
    primaria: "primary",
    "scuola primaria": "primary",
    "scuola media": "middle",
    "scuola secondaria di primo grado": "middle",
    "secondaria di primo grado": "middle",
    "scuola secondaria di secondo grado": "high",
    "secondaria di secondo grado": "high",
    liceo: "high",
  },
  DE: {
    grundschule: "primary",
    "sekundarstufe i": "middle",
    "sekundarstufe ii": "high",
  },
  GB: { "sixth form": "high" },
};

function countryFor(tags, selectedCountry) {
  const sourceCountry = String(tags["addr:country"] || "")
    .trim()
    .toUpperCase();
  return /^[A-Z]{2}$/.test(sourceCountry)
    ? sourceCountry
    : String(selectedCountry || "").toUpperCase();
}

function parseIsced(raw) {
  if (!raw) return null;
  const levels = new Set();
  const valid = raw.split(/[;,/]/).every((part) => {
    const match = part.trim().match(/^([0-8])(?:\s*-\s*([0-8]))?$/);
    if (!match) return false;
    const start = Number(match[1]),
      end = Number(match[2] ?? match[1]);
    if (end < start) return false;
    for (let i = start; i <= end; i++) levels.add(i);
    return true;
  });
  if (!valid) return null;
  return categoryFromStages(
    new Set(
      [...levels].map((level) =>
        level === 1
          ? "primary"
          : level === 2
            ? "middle"
            : level === 3
              ? "high"
              : "other",
      ),
    ),
  );
}

function stageToken(raw, country) {
  let value = normalizeText(raw)
    .replace(/[()]/g, " ")
    .replace(/\b([123])\s*[.º°ª]+\s*/g, "$1 ")
    .replace(/\s+/g, " ")
    .trim();
  // These prefixes occur in explicit metadata; school names are never parsed.
  value = value.replace(
    /^(?:escola de |escola do |escola |escuela de |escuela )/,
    "",
  );
  return Object.hasOwn(commonLevels, value)
    ? commonLevels[value]
    : localLevels[country] && Object.hasOwn(localLevels[country], value)
      ? localLevels[country][value]
      : null;
}

function categoryFromStages(stages) {
  if (stages.has("middle") && stages.has("high")) return "combined";
  if (stages.has("high")) return "high";
  if (stages.has("middle")) return "middle";
  if (stages.has("primary")) return "primary";
  return "other";
}

const levelKeys = [
  "school:level",
  "education:level",
  "school:stage",
  "school:type",
];
export function classifyLevel(tags = {}, selectedCountry = "") {
  const isced = parseIsced(String(tags["isced:level"] || "").trim());
  if (isced) return isced;
  const country = countryFor(tags, selectedCountry);
  const classifications = new Set();
  for (const key of levelKeys) {
    const raw = String(tags[key] || "").trim();
    if (!raw) continue;
    const stages = raw
      .split(/[;,/+]/)
      .map((value) => stageToken(value.trim(), country));
    if (stages.every(Boolean))
      classifications.add(categoryFromStages(new Set(stages)));
  }
  return classifications.size === 1 ? [...classifications][0] : "unknown";
}

const publicWords = new Set([
  "public",
  "government",
  "governmental",
  "state",
  "municipal",
  "federal",
  "publica",
  "publico",
  "publico estatal",
  "estatal",
  "estadual",
  "estaduais",
  "escola publica",
  "escuela publica",
  "ecole publique",
  "publique",
  "scuola pubblica",
  "pubblica",
  "pubblico",
  "offentlich",
  "offentliche schule",
  "staatlich",
]);
const privateWords = new Set([
  "private",
  "private school",
  "privada",
  "privado",
  "particular",
  "escola privada",
  "escola particular",
  "escuela privada",
  "prive",
  "privee",
  "ecole privee",
  "prive sous contrat",
  "prive hors contrat",
  "privata",
  "privato",
  "scuola privata",
  "privat",
  "privatschule",
  "independent",
]);
const ownershipKeys = [
  "ownership",
  "operator:type",
  "school:type",
  "school:sector",
];
export function classifyOwnership(tags = {}, selectedCountry = "") {
  const country = countryFor(tags, selectedCountry);
  const sectors = new Set();
  for (const key of ownershipKeys) {
    for (const raw of String(tags[key] || "").split(/[;,]/)) {
      const value = normalizeText(raw);
      if (
        publicWords.has(value) ||
        (value === "public school" && country && country !== "GB")
      )
        sectors.add("public");
      if (
        privateWords.has(value) ||
        (country === "ES" &&
          ["concertado", "concertada", "colegio concertado"].includes(value))
      )
        sectors.add("private");
    }
  }
  return sectors.size === 1 ? [...sectors][0] : "unknown";
}

export function classificationInfo(tags = {}, selectedCountry = "") {
  return {
    level: classifyLevel(tags, selectedCountry),
    ownership: classifyOwnership(tags, selectedCountry),
    localLevel: levelKeys
      .filter(
        (key) =>
          key !== "school:type" ||
          stageToken(tags[key], countryFor(tags, selectedCountry)),
      )
      .map((key) => tags[key])
      .filter((value) => typeof value === "string" && value.trim())
      .filter((value, index, values) => values.indexOf(value) === index)
      .join(" · "),
    localSector: ownershipKeys
      .filter(
        (key) =>
          key !== "school:type" ||
          !stageToken(tags[key], countryFor(tags, selectedCountry)),
      )
      .map((key) => tags[key])
      .filter((value) => typeof value === "string" && value.trim())
      .filter((value, index, values) => values.indexOf(value) === index)
      .join(" · "),
  };
}
