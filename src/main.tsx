import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import { Plate } from "./Plate/Plate";
import { usePlateReducer } from "./Plate/hooks/usePlateReducer";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Failed to find the root element");

const root = ReactDOM.createRoot(rootElement);

type AnnotationMeta = Record<string, string>;

const App = () => {
  const [isShiftPressed, setIsShiftPressed] = React.useState(false);

  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Shift") {
        setIsShiftPressed(true);
      }
    };

    const handleKeyUp = (e) => {
      if (e.key === "Shift") {
        setIsShiftPressed(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

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
    initialPlateSize: 96,
  });

  return (
    <div className="text-4xl">
      <h1>My App</h1>
      <Plate
        className="mr-2 pb-8"
        plateSize={plateSize}
        excludedWells={excludedWells}
        selection={selection}
        setSelection={setSelectionWithExcluded}
        wellAnnotations={wellAnnotations}
        setWellAnnotations={setWellAnnotations}
        activeWellAnnotation={activeWellAnnotation}
        setActiveWellAnnotation={setActiveWellAnnotation}
        buildUpSelection={isShiftPressed}
      />
    </div>
  );
};

root.render(<App />);
