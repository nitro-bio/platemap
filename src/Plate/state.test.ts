import { describe, expect, test } from "vitest";
import { BLUE_STYLE } from "./schemas";
import {
  type PlateState,
  plateReducer,
  resizePlateState,
  validatePlateState,
} from "./state";

const state = (): PlateState<{ concentration: number; active: boolean }> => ({
  plateSize: 96,
  excludedWells: [95],
  selection: { wells: [0] },
  activeWellAnnotation: null,
  wellAnnotations: [
    {
      id: "control",
      label: "Control",
      wells: [0, 95],
      annotationStyle: BLUE_STYLE,
      metadata: { concentration: 5, active: true },
    },
  ],
});

describe("plate state invariants", () => {
  test("accepts typed scalar metadata and rejects invalid persisted wells", () => {
    expect(validatePlateState(state())).toEqual(state());
    expect(() =>
      validatePlateState({ ...state(), excludedWells: [96] }),
    ).toThrow("outside the plate");
    expect(() =>
      validatePlateState({ ...state(), excludedWells: [1, 1] }),
    ).toThrow("unique");
    expect(() =>
      validatePlateState({ ...state(), excludedWells: [0, 95] }),
    ).toThrow("Selected wells cannot be excluded");
  });

  test("rejects lossy resize unless the caller explicitly resolves content", () => {
    expect(() => resizePlateState(state(), 24)).toThrow(
      "would remove placed content",
    );
    const resized = resizePlateState(state(), 24, "remove-out-of-range");
    expect(resized.plateSize).toBe(24);
    expect(resized.excludedWells).toEqual([]);
    expect(resized.wellAnnotations[0].wells).toEqual([0]);
    expect(resized.selection?.wells).toEqual([0]);
  });

  test("filters newly excluded wells from selection", () => {
    const next = plateReducer(state(), {
      type: "SET_EXCLUDED_WELLS",
      payload: [0, 95],
    });
    expect(next.selection).toBeNull();
  });
});
