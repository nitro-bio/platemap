import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createElement, useState } from "react";
import { afterEach, describe, expect, test, vi } from "vitest";
import type { PlateSelection } from "./schemas";

vi.mock("react-selecto", () => ({
  default: ({
    onSelectEnd,
  }: {
    onSelectEnd: (event: {
      selected: Array<{ getAttribute: () => string }>;
    }) => void;
  }) =>
    createElement(
      "button",
      {
        type: "button",
        "aria-label": "Simulate drag selection",
        onClick: () =>
          onSelectEnd({
            selected: [
              { getAttribute: () => "0" },
              { getAttribute: () => "13" },
            ],
          }),
      },
      "Drag",
    ),
}));

import { Plate } from "./Plate";

afterEach(cleanup);

describe("Plate drag selection", () => {
  test("accepts the wells reported by the selection layer", () => {
    function Harness() {
      const [selection, setSelection] = useState<PlateSelection | null>(null);
      return (
        <Plate
          plateSize={96}
          excludedWells={[]}
          selection={selection}
          setSelection={({ selection: next }) => setSelection(next)}
          wellAnnotations={[]}
          activeWellAnnotation={null}
          setWellAnnotations={() => undefined}
          setActiveWellAnnotation={() => undefined}
        />
      );
    }
    render(<Harness />);
    fireEvent.click(
      screen.getByRole("button", { name: "Simulate drag selection" }),
    );
    expect(screen.getByRole("button", { name: "A1, selected" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "B2, selected" })).toBeTruthy();
  });
});
