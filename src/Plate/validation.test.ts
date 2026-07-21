import { describe, expect, test } from "vitest";

import { layerToCSV, parseLayerCSV } from "./csv";
import { BLUE_STYLE } from "./schemas";
import {
  migrateLegacyPlateState,
  parsePlateDocument,
  plateStateToDocument,
} from "./validation";

const ids = Array.from(
  { length: 12 },
  (_, index) => `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
);

describe("plate documents", () => {
  test("migrates validated legacy state with fresh IDs", () => {
    let idIndex = 0;
    const state = migrateLegacyPlateState(
      {
        plateSize: 24,
        wellAnnotations: [{ id: "legacy", label: "Control", wells: [0], annotationStyle: BLUE_STYLE }],
        selection: { wells: [1] },
        excludedWells: [],
      },
      { generateId: () => ids[idIndex++] },
    );
    expect(state.layers[0].annotations[0].id).toBe(ids[1]);
    expect(state.selection?.wells).toEqual([1]);
    expect(plateStateToDocument(state)).not.toHaveProperty("selection");
  });

  test("rejects duplicates and out-of-range wells", () => {
    expect(() => parsePlateDocument({
      schemaVersion: 1,
      plateSize: 24,
      excludedWells: [24],
      layers: [{ id: ids[0], name: "Layer", annotations: [{ id: ids[0], label: "A", wells: [0], annotationStyle: BLUE_STYLE }] }],
    })).toThrow();
  });
});

describe("tidy CSV", () => {
  test("groups explicit keys, deduplicates rows, and infers metadata", () => {
    let idIndex = 0;
    const annotations = parseLayerCSV(
      "Well,Annotation,Annotation Key,Color,Concentration,Active\nA1,Drug A,drug-a,blue,5,true\nA1,Drug A,drug-a,blue,5,true\nA2,Drug A,drug-a,blue,5,true",
      { plateSize: 24, generateId: () => ids[idIndex++] },
    );
    expect(annotations).toHaveLength(1);
    expect(annotations[0].wells).toEqual([0, 1]);
    expect(annotations[0].metadata).toEqual({ Concentration: 5, Active: true });
    expect(layerToCSV(annotations, 24)).toContain("A2,Drug A");
  });

  test("surfaces key conflicts and invalid colors", () => {
    expect(() => parseLayerCSV(
      "Well,Annotation,Annotation Key\nA1,A,key\nA2,B,key",
      { plateSize: 24, generateId: () => ids[0] },
    )).toThrow("conflicts");
    expect(() => parseLayerCSV(
      "Well,Annotation,Color\nA1,A,chartreuse",
      { plateSize: 24, generateId: () => ids[0] },
    )).toThrow("invalid");
  });
});
