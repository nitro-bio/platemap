import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";
import { usePlateReducer } from "./hooks/usePlateReducer";
import { Plate } from "./Plate";
import { PlateControls } from "./PlateControls";
import { BLUE_STYLE, ORANGE_STYLE, type PlateLayer } from "./schemas";

afterEach(cleanup);

const LAYER_ONE = "00000000-0000-4000-8000-000000000001";
const LAYER_TWO = "00000000-0000-4000-8000-000000000002";
const ANNOTATION_ONE = "00000000-0000-4000-8000-000000000003";
const ANNOTATION_TWO = "00000000-0000-4000-8000-000000000004";

const layers: PlateLayer[] = [
  {
    id: LAYER_ONE,
    name: "Layer 1",
    annotations: [
      {
        id: ANNOTATION_ONE,
        label: "Control",
        wells: [0],
        annotationStyle: ORANGE_STYLE,
      },
    ],
  },
  {
    id: LAYER_TWO,
    name: "Layer 2",
    annotations: [
      {
        id: ANNOTATION_TWO,
        label: "Treatment",
        wells: [0],
        annotationStyle: BLUE_STYLE,
      },
    ],
  },
];

function Harness({ isometric = false }: { isometric?: boolean }) {
  const reducer = usePlateReducer({
    initialPlateSize: 24,
    initialLayers: layers,
    initialExcludedWells: [1],
    initialViewMode: isometric ? "isometric" : "flat",
  });
  return (
    <>
      <Plate {...reducer} />
      <PlateControls {...reducer} />
    </>
  );
}

describe("Plate accessibility and layers", () => {
  test("renders only the active layer and supports native selection", () => {
    render(<Harness />);
    const well = screen.getByRole("button", {
      name: "A1, annotations: Control",
    });
    expect(screen.queryByText("Treatment")).toBeNull();
    expect(well.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(well);
    expect(well.getAttribute("aria-pressed")).toBe("true");
  });

  test("disables excluded wells and labels row and column controls", () => {
    render(<Harness />);
    expect(
      (
        screen.getByRole("button", {
          name: "A2, excluded",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    expect(screen.getByRole("button", { name: "Select row A" })).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Select column 1" }),
    ).toBeTruthy();
  });

  test("renders read-only isometric planes and synchronizes focus", () => {
    const { container } = render(<Harness isometric />);
    expect(
      screen.getByRole("region", { name: "Isometric plate stack" }),
    ).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: "A1, annotations: Control" }),
    ).toBeNull();
    const wellGrid = container.querySelector<HTMLElement>(".well-container");
    expect(wellGrid?.style.gridColumn).toBe("1 / -1");
    fireEvent.click(screen.getByRole("button", { name: "View layer Layer 2" }));
    expect(
      screen.getByRole("status", { name: "Active layer" }).textContent,
    ).toBe("Layer 2 · 2 of 2");
    fireEvent.click(screen.getByRole("button", { name: "Next layer" }));
    expect(
      screen.getByRole("status", { name: "Active layer" }).textContent,
    ).toBe("Layer 1 · 1 of 2");
    fireEvent.keyDown(
      screen.getByRole("region", { name: "Isometric plate stack" }),
      { key: "ArrowLeft" },
    );
    expect(
      screen.getByRole("status", { name: "Active layer" }).textContent,
    ).toBe("Layer 2 · 2 of 2");
    fireEvent.wheel(
      screen.getByRole("region", { name: "Isometric plate stack" }),
      { deltaX: 80, deltaY: 0 },
    );
    expect(
      screen.getByRole("status", { name: "Active layer" }).textContent,
    ).toBe("Layer 1 · 1 of 2");
  });

  test("shows a four-part overflow representation while naming all annotations", () => {
    const overflowLayers: PlateLayer[] = [
      {
        id: LAYER_ONE,
        name: "Overflow",
        annotations: Array.from({ length: 6 }, (_, index) => ({
          id: `00000000-0000-4000-8000-${String(index + 10).padStart(12, "0")}`,
          label: `Annotation ${index + 1}`,
          wells: [0],
          annotationStyle: BLUE_STYLE,
        })),
      },
    ];
    function OverflowHarness() {
      const reducer = usePlateReducer({
        initialPlateSize: 24,
        initialLayers: overflowLayers,
      });
      return <Plate {...reducer} />;
    }
    const { container } = render(<OverflowHarness />);
    expect(
      container.querySelectorAll(
        '[data-well-index="0"] span[class*="platemap-annotation-"]',
      ),
    ).toHaveLength(4);
    expect(
      screen.getByRole("button", {
        name: /Annotation 6.*3 additional annotations/,
      }),
    ).toBeTruthy();
  });

  test("renders and changes focus across eight 1,536-well planes", () => {
    const denseLayers: PlateLayer[] = Array.from({ length: 8 }, (_, index) => ({
      id: `10000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
      name: `Dense ${index + 1}`,
      annotations: [],
    }));
    function DenseHarness() {
      const reducer = usePlateReducer({
        initialPlateSize: 1536,
        initialLayers: denseLayers,
        initialViewMode: "isometric",
      });
      return <Plate {...reducer} />;
    }
    const { container } = render(<DenseHarness />);
    expect(container.querySelectorAll('[data-well-index="1535"]')).toHaveLength(
      8,
    );
    fireEvent.click(screen.getByRole("button", { name: "View layer Dense 8" }));
    expect(
      screen
        .getByRole("button", { name: "View layer Dense 8" })
        .getAttribute("aria-current"),
    ).toBe("true");
  }, 20_000);
});
