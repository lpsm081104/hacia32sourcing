import test from "node:test";
import assert from "node:assert/strict";
import {
  classifyLevel,
  classifyOwnership,
  classificationInfo,
  normalizeText,
} from "../classification.mjs";

for (const [country, value, expected] of [
  ["BR", "Escola de Ensino Médio", "high"],
  ["BR", "ensino fundamental I", "primary"],
  ["BR", "ensino fundamental 1", "primary"],
  ["BR", "ensino fundamental II", "middle"],
  ["BR", "ensino fundamental 2", "middle"],
  ["BR", "ensino fundamental - anos iniciais", "primary"],
  ["BR", "Ensino Fundamental (Anos Finais)", "middle"],
  ["BR", "ensino fundamental", "unknown"],
  ["BR", "ensino fundamental II;ensino médio", "combined"],
  ["BR", "educação infantil", "other"],
  ["PT", "2.º ciclo do ensino básico", "primary"],
  ["PT", "ensino básico 3º ciclo", "middle"],
  ["PT", "ensino secundário", "high"],
  ["PT", "ensino básico", "unknown"],
  ["PT", "ensino médio", "unknown"],
  ["MX", "Escuela secundaria", "middle"],
  ["MX", "Preparatoria", "high"],
  ["MX", "Bachillerato", "high"],
  ["ES", "Educación Secundaria Obligatoria", "middle"],
  ["ES", "Bachillerato", "high"],
  ["ES", "secundaria", "unknown"],
  ["CO", "educación básica secundaria", "middle"],
  ["CO", "educación media", "high"],
  ["CO", "bachillerato", "unknown"],
  ["FR", "Collège", "middle"],
  ["FR", "Lycée", "high"],
  ["CA", "Collège", "unknown"],
  ["IT", "scuola secondaria di primo grado", "middle"],
  ["IT", "scuola secondaria di secondo grado", "high"],
  ["DE", "Sekundarstufe I", "middle"],
  ["DE", "Sekundarstufe II", "high"],
  ["GB", "sixth form", "high"],
  ["US", "constructor", "unknown"],
])
  test(`${country} explicit local stage: ${value}`, () =>
    assert.equal(classifyLevel({ "school:level": value }, country), expected));

for (const [country, value, expected] of [
  ["BR", "escola privada", "private"],
  ["BR", "escola particular", "private"],
  ["BR", "escola pública", "public"],
  ["BR", "estadual", "public"],
  ["MX", "escuela privada", "private"],
  ["ES", "público", "public"],
  ["ES", "concertado", "private"],
  ["MX", "concertado", "unknown"],
  ["FR", "privé sous contrat", "private"],
  ["FR", "école publique", "public"],
  ["DE", "öffentlich", "public"],
  ["IT", "scuola privata", "private"],
  ["GB", "public school", "unknown"],
  ["US", "public school", "public"],
  ["BR", "comunitária", "unknown"],
])
  test(`${country} explicit local sector: ${value}`, () =>
    assert.equal(
      classifyOwnership({ "school:sector": value }, country),
      expected,
    ));

test("ISCED has priority over local wording and school names never establish classification", () => {
  assert.equal(
    classifyLevel(
      { "isced:level": "3", "school:level": "ensino fundamental I" },
      "BR",
    ),
    "high",
  );
  assert.equal(
    classifyLevel({ name: "Escola de Ensino Médio" }, "BR"),
    "unknown",
  );
  assert.equal(
    classifyOwnership({ name: "Escola Privada Central", fee: "yes" }, "BR"),
    "unknown",
  );
});
test("explicit source country is used and conflicting local fields stay unspecified", () => {
  assert.equal(
    classifyLevel(
      { "addr:country": "PT", "school:level": "ensino secundário" },
      "BR",
    ),
    "high",
  );
  assert.equal(
    classifyLevel(
      {
        "school:level": "ensino médio",
        "school:stage": "ensino fundamental II",
      },
      "BR",
    ),
    "unknown",
  );
  assert.equal(
    classifyOwnership(
      { ownership: "privada", "operator:type": "municipal" },
      "BR",
    ),
    "unknown",
  );
});
test("original local labels are preserved and a school type is not mistaken for a sector", () => {
  const info = classificationInfo(
    { "school:level": "Ensino Médio", "school:sector": "Escola Privada" },
    "BR",
  );
  assert.equal(info.level, "high");
  assert.equal(info.ownership, "private");
  assert.equal(info.localLevel, "Ensino Médio");
  assert.equal(info.localSector, "Escola Privada");
  assert.equal(
    classificationInfo({ "school:type": "high_school" }, "US").localSector,
    "",
  );
});
test("name search normalizes accents without changing displayed names", () => {
  assert.equal(normalizeText("Escola São José"), "escola sao jose");
  assert.equal(normalizeText("ENSINO MÉDIO"), "ensino medio");
});
