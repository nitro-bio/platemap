import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, test } from "vitest";
import { Plate } from "./Plate";
import { BLUE_STYLE, type PlateSelection, type PlateSize } from "./schemas";

afterEach(cleanup);

function Harness({
  plateSize = 24,
  buildUpSelection = false,
}: {
  plateSize?: PlateSize;
  buildUpSelection?: boolean;
}) {
  const [selection, setSelection] = useState<PlateSelection | null>(null);
  return (
    <Plate
      plateSize={plateSize}
      excludedWells={[1]}
      selection={selection}
      setSelection={({ selection: next }) => setSelection(next)}
      wellAnnotations={[
        {
          id: "control",
          label: "Control",
          wells: [0],
          annotationStyle: BLUE_STYLE,
          metadata: { concentration: 5, active: true },
        },
        {
          id: "standard",
          label: "Standard",
          wells: [0],
          annotationStyle: BLUE_STYLE,
        },
      ]}
      activeWellAnnotation={null}
      setWellAnnotations={() => undefined}
      setActiveWellAnnotation={() => undefined}
      buildUpSelection={buildUpSelection}
    />
  );
}

describe("Plate accessibility", () => {
  test("names wells and supports native keyboard selection", () => {
    render(<Harness />);
    const well = screen.getByRole("button", {
      name: "A1, annotations: Control, Standard",
    });
    expect(well.getAttribute("aria-pressed")).toBe("false");
    fireEvent.keyDown(well, { key: "Enter" });
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

  test("supports row, column, and additive well selection", () => {
    render(<Harness buildUpSelection />);
    fireEvent.click(screen.getByRole("button", { name: "Select row A" }));
    expect(screen.getByRole("button", { name: /A1, selected/ })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Select column 1" }));
    expect(screen.getByRole("button", { name: /B1, selected/ })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /B1, selected/ }));
    expect(screen.getByRole("button", { name: "B1" })).toBeTruthy();
  });

  test("renders overlapping annotations with semantic CSS-variable hooks", () => {
    const { container } = render(<Harness />);
    expect(
      container.querySelectorAll(".platemap-annotation-blue"),
    ).toHaveLength(2);
    const well = screen.getByRole("button", {
      name: "A1, annotations: Control, Standard",
    });
    expect(well.className).toContain("var(--color-plate-foreground)");
  });

  test("renders and labels the last well on a 1536-well plate", () => {
    render(<Harness plateSize={1536} />);
    expect(screen.getByRole("group", { name: "1536-well plate" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "AF48" })).toBeTruthy();
  });
});
