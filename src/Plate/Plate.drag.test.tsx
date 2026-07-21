import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, describe, expect, test, vi } from "vitest";

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

import { usePlateReducer } from "./hooks/usePlateReducer";
import { Plate } from "./Plate";

afterEach(cleanup);

describe("Plate drag selection", () => {
  test("accepts the wells reported by the selection layer", () => {
    function Harness() {
      const reducer = usePlateReducer({
        initialPlateSize: 96,
        initialLayers: [
          {
            id: "00000000-0000-4000-8000-000000000001",
            name: "Layer 1",
            annotations: [],
          },
        ],
      });
      return <Plate {...reducer} />;
    }
    render(<Harness />);
    fireEvent.click(
      screen.getByRole("button", { name: "Simulate drag selection" }),
    );
    expect(screen.getByRole("button", { name: "A1, selected" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "B2, selected" })).toBeTruthy();
  });
});
