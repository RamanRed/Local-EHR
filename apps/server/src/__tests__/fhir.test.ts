import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { buildPatient } from "../utils/fhir-bundle-builder.js";

describe("buildPatient (FHIR R4)", () => {
  test("constructs valid FHIR Patient resource", () => {
    const resource = buildPatient(
      "MRN-1001",
      "Sharma",
      ["Arun"],
      "male",
      "1985-04-12",
      "9876543210"
    );

    assert.equal(resource.resourceType, "Patient");
    assert.equal(resource.id, "MRN-1001");
    assert.equal(resource.gender, "male");
    assert.equal(resource.name[0].family, "Sharma");
    assert.deepEqual(resource.name[0].given, ["Arun"]);
    assert.equal(resource.name[0].text, "Arun Sharma");
    assert.equal(resource.identifier[0].value, "MRN-1001");
  });
});
