import { act, renderHook } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import { BLUE_STYLE } from "../schemas";
import { usePlateReducer } from "./usePlateReducer";

const ids = Array.from(
  { length: 12 },
  (_, index) =>
    `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
);

describe("usePlateReducer layers", () => {
  test("creates, activates, renames, moves, and deletes layers", () => {
    let idIndex = 0;
    const { result } = renderHook(() =>
      usePlateReducer({
        initialPlateSize: 96,
        generateId: () => ids[idIndex++],
      }),
    );
    expect(result.current.plateState.layers.map((layer) => layer.name)).toEqual(
      ["Layer 1"],
    );
    act(() => result.current.plateActions.addLayer());
    expect(result.current.plateState.layers.map((layer) => layer.name)).toEqual(
      ["Layer 2", "Layer 1"],
    );
    const active = result.current.plateState.activeLayerId;
    act(() => result.current.plateActions.renameLayer(active, "Treatment"));
    act(() => result.current.plateActions.moveLayer(active, "down"));
    expect(result.current.plateState.layers[1].name).toBe("Treatment");
    act(() => result.current.plateActions.deleteLayer(active));
    expect(result.current.plateState.layers).toHaveLength(1);
    expect(result.current.plateState.activeWellAnnotationId).toBeNull();
  });

  test("preserves global selection and prunes all durable wells on shrink", () => {
    const { result } = renderHook(() =>
      usePlateReducer({
        initialPlateSize: 96,
        initialLayers: [
          {
            id: ids[0],
            name: "Layer 1",
            annotations: [
              {
                id: ids[1],
                label: "A",
                wells: [0, 95],
                annotationStyle: BLUE_STYLE,
              },
            ],
          },
        ],
        initialSelection: { wells: [0, 95] },
        initialExcludedWells: [94],
      }),
    );
    act(() => result.current.plateActions.setPlateSize(24));
    expect(result.current.plateState.layers[0].annotations[0].wells).toEqual([
      0,
    ]);
    expect(result.current.plateState.selection?.wells).toEqual([0]);
    expect(result.current.plateState.excludedWells).toEqual([]);
  });

  test("rejects invalid initialization and final-layer deletion", () => {
    expect(() =>
      renderHook(() =>
        usePlateReducer({ initialPlateSize: 24, initialLayers: [] }),
      ),
    ).toThrow();
    const { result } = renderHook(() =>
      usePlateReducer({ initialPlateSize: 24, generateId: () => ids[0] }),
    );
    expect(() =>
      act(() => result.current.plateActions.deleteLayer(ids[0])),
    ).toThrow("Cannot delete the final layer");
  });
});
