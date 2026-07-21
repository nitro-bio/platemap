import React from "react";
import ReactDOM from "react-dom/client";

import "./index.css";
import { usePlateReducer } from "./Plate/hooks/usePlateReducer";
import { Plate } from "./Plate/Plate";
import { PlateControls } from "./Plate/PlateControls";

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
  const reducer = usePlateReducer({ initialPlateSize: 96 });
  return (
    <main className="mx-auto max-w-6xl space-y-8 p-8">
      <h1 className="text-3xl font-bold">Nitro Platemap layers</h1>
      <Plate {...reducer} buildUpSelection={isShiftPressed} />
      <PlateControls {...reducer} />
    </main>
  );
};

ReactDOM.createRoot(rootElement).render(<App />);
