import assert from "node:assert/strict";
import test from "node:test";

import {
  getSenamhiUrl,
  parseAffectedDepartments,
  SENAMHI_DEPARTMENTS,
} from "../src/alerts.js";

test("parses affected departments from the official advisory map", () => {
  const html = `
    <h2><span>DEPARTAMENTOS DE POSIBLE AFECTACIÓN:</span></h2>
    <div><p><a id="arequipa">AREQUIPA</a>, <a id="lima">LIMA</a></p></div>
  `;

  assert.deepEqual(parseAffectedDepartments(html), ["arequipa", "lima"]);
});

test("treats a published but empty department section as unverifiable data", () => {
  const html = `
    <h2><span>DEPARTAMENTOS DE POSIBLE AFECTACIÓN:</span></h2>
    <div><p></p></div>
  `;

  assert.deepEqual(parseAffectedDepartments(html), []);
});

test("rejects maps that omit the affected-departments section", () => {
  assert.throws(
    () => parseAffectedDepartments("<html><body>mapa</body></html>"),
    /no affected-departments heading/,
  );
});

test("supports only known SENAMHI department identifiers", () => {
  assert.equal(SENAMHI_DEPARTMENTS.has("lima"), true);
  assert.equal(getSenamhiUrl("arequipa"), "https://www.senamhi.gob.pe/?p=aviso-meteorologico&dp=arequipa");
  assert.throws(() => getSenamhiUrl("unknown"), /Unsupported SENAMHI department/);
});
