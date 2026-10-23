# International classification scope

The school finder groups schools by educational stages, not by an assumption that every country uses US terminology. It uses valid `isced:level` first: 1 = primary, 2 = lower secondary, 3 = upper secondary. A school offering both secondary stages is in the combined category; schools with secondary and primary stages are grouped by their secondary offering. School groups are exclusive; selecting primary does not also include a school grouped under secondary. Other stages stay under “Other school levels.”

If ISCED is unavailable, explicit `school:level`, `education:level`, `school:stage`, and educational `school:type` values are considered. Conflicting recognized fields remain unspecified. Country context comes from an explicit two-letter `addr:country` tag when provided, otherwise the selected search country. Accents, letter case, underscores, and common ordinal notation are normalized. Original values are shown on cards.

Supported local terms include:

| Country  | Primary                                  | Lower secondary / middle                       | Upper secondary / high                               |
| -------- | ---------------------------------------- | ---------------------------------------------- | ---------------------------------------------------- |
| Brazil   | Ensino Fundamental I / 1 / anos iniciais | Ensino Fundamental II / 2 / anos finais        | Ensino Médio                                         |
| Portugal | Ensino Básico, 1.º and 2.º ciclos        | Ensino Básico, 3.º ciclo                       | Ensino Secundário                                    |
| Mexico   | Primaria                                 | Secundaria, secundaria técnica, telesecundaria | Preparatoria, bachillerato, educación media superior |
| Spain    | Educación Primaria                       | ESO / Educación Secundaria Obligatoria         | Bachillerato                                         |
| Colombia | Educación Básica Primaria                | Educación Básica Secundaria                    | Educación Media                                      |
| France   | Primaire / élémentaire                   | Collège                                        | Lycée                                                |
| Italy    | Scuola primaria                          | Scuola secondaria di primo grado               | Scuola secondaria di secondo grado / liceo           |
| Germany  | Grundschule                              | Sekundarstufe I                                | Sekundarstufe II                                     |

Explicit standard English stage names also work. Sixth form is recognized as upper secondary in the UK. This table is a bounded vocabulary, not comprehensive support for every system, language, qualification, historical reform, or abbreviation. New country mappings should be explicit and have regression tests.

Unqualified “Ensino Fundamental,” “Ensino Básico,” and Spanish “secundaria” outside supported country contexts are not forced into a single category. “Bachillerato” is supported for Mexico and Spain, but not assumed to mean the same stage everywhere. French “collège” is not mapped as lower secondary in Canada. School names, abbreviations in names, and operator names are not classification evidence. Missing data remains unspecified.

Public/private status recognizes explicit local equivalents such as escola pública/privada/particular, público/privado, école publique/privée, scuola pubblica/privata, and öffentlich/privat. Spanish `concertado` in explicit sector metadata is classified as private management with its original term retained; it must not be mistaken for wholly private funding. Fees, religion, or public funding alone do not establish sector. Charter, community, and mixed/unclear terms remain unspecified unless another explicit recognized source field establishes a nonconflicting classification. “Public school” in UK local metadata stays ambiguous; the standard OSM `public` value still means public.

Reference frameworks for further mapping work: [UNESCO ISCED](https://uis.unesco.org/en/topic/international-standard-classification-education-isced), [Brazil's education law, article 32](https://www.planalto.gov.br/ccivil_03/leis/l9394.htm), and the respective national education authorities. An alias is used only for explicit metadata, never as a search for matching words anywhere in a school's name.
