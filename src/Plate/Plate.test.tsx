import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, test } from "vitest";
import { Plate } from "./Plate";
import type { PlateSelection } from "./schemas";

afterEach(cleanup);

function Harness() {
  const [selection, setSelection] = useState<PlateSelection | null>(null);
  return (
    <Plate
      plateSize={24}
      excludedWells={[1]}
      selection={selection}
      setSelection={({ selection: next }) => setSelection(next)}
      wellAnnotations={[]}
      activeWellAnnotation={null}
      setWellAnnotations={() => undefined}
      setActiveWellAnnotation={() => undefined}
    />
  );
}

describe("Plate accessibility", () => {
  test("names wells and supports native keyboard selection", () => {
    render(<Harness />);
    const well = screen.getByRole("button", { name: "A1" });
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
});
