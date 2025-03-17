import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import { Plate } from "./Plate/Plate";
import { usePlateReducer } from "./Plate/hooks/usePlateReducer";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Failed to find the root element");

const root = ReactDOM.createRoot(rootElement);

type AnnotationMeta = Record<string, string>;

// eslint-disable-next-line react-refresh/only-export-components
const App = () => {
  const {
    plateState: {
      plateSize,
      wellAnnotations,
      activeWellAnnotation,
      selection,
      excludedWells,
    },
    plateActions: {
      setSelectionWithExcluded,
      setActiveWellAnnotation,
      // setExcludedWells,
      setWellAnnotations,
    },
  } = usePlateReducer<AnnotationMeta>({
    initialPlateSize: 48,
  });
  return (
    <div className="h-screen overflow-hidden text-4xl">
      <Plate
        className="h-full"
        plateSize={plateSize}
        excludedWells={excludedWells}
        selection={selection}
        setSelection={setSelectionWithExcluded}
        wellAnnotations={wellAnnotations}
        setWellAnnotations={setWellAnnotations}
        activeWellAnnotation={activeWellAnnotation}
        setActiveWellAnnotation={setActiveWellAnnotation}
      />
    </div>
  );
};

root.render(<App />);
