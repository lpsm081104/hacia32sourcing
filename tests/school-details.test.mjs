import test from "node:test";
import assert from "node:assert/strict";
import { schoolDetails, emailHref, phoneHref } from "../school-details.mjs";

test("uses contact namespace and formats the source address without inventing fields", () => {
  const details = schoolDetails({
    "contact:email": " office@school.org ; admissions@school.org ",
    email: "old@school.org",
    "contact:phone": "+34 912 345 678",
    "addr:housenumber": "12",
    "addr:street": "Calle Mayor",
    "addr:city": "Madrid",
    "addr:postcode": "28001",
    opening_hours: "Mo-Fr 08:00-16:00",
  });
  assert.deepEqual(details.emails, [
    "office@school.org",
    "admissions@school.org",
  ]);
  assert.deepEqual(details.phones, ["+34 912 345 678"]);
  assert.equal(details.address, "12 Calle Mayor, Madrid, 28001");
  assert.equal(details.hours, "Mo-Fr 08:00-16:00");
});

test("preserves full addresses and falls back to unprefixed contacts", () => {
  const details = schoolDetails({
    "addr:full": "Campus Norte, Madrid",
    "addr:street": "Do not duplicate",
    "contact:email": " ",
    email: "office@school.org",
    phone: "+1 212 555 0100;+1 212 555 0100",
  });
  assert.equal(details.address, "Campus Norte, Madrid");
  assert.deepEqual(details.emails, ["office@school.org"]);
  assert.deepEqual(details.phones, ["+1 212 555 0100"]);
});

test("missing contact details remain missing", () => {
  assert.deepEqual(schoolDetails(), {
    address: "",
    emails: [],
    phones: [],
    hours: "",
  });
});

test("safe email and telephone links support international numbers and extensions", () => {
  assert.equal(emailHref("office@school.org"), "mailto:office@school.org");
  assert.equal(
    phoneHref("+1 (212) 555-0100 ext. 23"),
    "tel:+12125550100;ext=23",
  );
  assert.equal(phoneHref("+34 912 345 678"), "tel:+34912345678");
});

test("untrusted contact values cannot inject link targets or mail headers", () => {
  for (const email of [
    "javascript:alert(1)",
    "school@x.org?bcc=other@x.org",
    "school%0Abcc@school.org",
    "school@x.org\r\nBcc: other@x.org",
  ])
    assert.equal(emailHref(email), null);
  for (const phone of [
    "javascript:alert(1)",
    "+123?foo=bar",
    "Call reception",
    "+1+12345",
  ])
    assert.equal(phoneHref(phone), null);
});
