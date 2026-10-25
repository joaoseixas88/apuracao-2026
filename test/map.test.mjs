import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { geoArea } from "d3-geo";

const geography = JSON.parse(readFileSync(new URL("../data/br-ufs.json", import.meta.url)));

test("as 27 UFs têm contornos internos para o mapa", () => {
  assert.equal(geography.features.length, 27);
  for (const feature of geography.features) {
    assert.ok(geoArea(feature) < 1, `Contorno invertido na UF ${feature.properties.codarea}`);
  }
});
