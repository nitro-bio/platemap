import React from "react";
import ReactDOM from "react-dom/client";

import "./index.css";
import "./demo.css";
import { usePlateReducer } from "./Plate/hooks/usePlateReducer";
import { Plate } from "./Plate/Plate";
import { PlateControls } from "./Plate/PlateControls";
import {
  BLUE_STYLE,
  GREEN_STYLE,
  ORANGE_STYLE,
  PURPLE_STYLE,
} from "./Plate/schemas";
import { WellAnnotationEditor } from "./WellAnnotationEditor";

const DEMO_LAYERS = [
  {
    id: "00000000-0000-4000-8000-000000000001",
    name: "Treatment",
    annotations: [
      {
        id: "00000000-0000-4000-8000-000000000002",
        label: "Vehicle control",
        wells: [0, 12, 24, 36, 48, 60, 72, 84],
        annotationStyle: GREEN_STYLE,
      },
      {
        id: "00000000-0000-4000-8000-000000000003",
        label: "Compound A",
        wells: [1, 2, 13, 14, 25, 26],
        annotationStyle: BLUE_STYLE,
      },
      {
        id: "00000000-0000-4000-8000-000000000004",
        label: "Compound B",
        wells: [4, 5, 16, 17, 28, 29],
        annotationStyle: ORANGE_STYLE,
      },
    ],
  },
  {
    id: "00000000-0000-4000-8000-000000000005",
    name: "Sample groups",
    annotations: [
      {
        id: "00000000-0000-4000-8000-000000000006",
        label: "Cohort 1",
        wells: [1, 4, 13, 16, 25, 28],
        annotationStyle: PURPLE_STYLE,
      },
    ],
  },
];

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Failed to find the root element");

const App = () => {
  const [isShiftPressed, setIsShiftPressed] = React.useState(false);
  React.useEffect(() => {
    const down = (event: KeyboardEvent) =>
      event.key === "Shift" && setIsShiftPressed(true);
    const up = (event: KeyboardEvent) =>
      event.key === "Shift" && setIsShiftPressed(false);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);
  const reducer = usePlateReducer({
    initialPlateSize: 96,
    initialLayers: DEMO_LAYERS,
    initialActiveLayerId: DEMO_LAYERS[0].id,
    initialSelection: { wells: [1, 2, 13, 14, 25, 26] },
  });
  return (
    <main className="mx-auto max-w-6xl space-y-8 p-8">
      <header className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-widest text-zinc-900">
          Interactive example
        </p>
        <h1 className="text-3xl font-bold">Build a layered plate map</h1>
        <p className="max-w-3xl text-zinc-600">
          Select wells, describe an experimental group, and compose multiple
          annotation layers without losing the plate context.
        </p>
      </header>
      <Plate {...reducer} buildUpSelection={isShiftPressed} />
      {reducer.plateState.viewMode === "flat" && (
        <WellAnnotationEditor {...reducer} />
      )}
      <PlateControls {...reducer} />
    </main>
  );
};

ReactDOM.createRoot(rootElement).render(<App />);
