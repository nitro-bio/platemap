import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Failed to find the root element");

const root = ReactDOM.createRoot(rootElement);

const App = () => {
  return (
    <div className="text-4xl">
      <h1>My App</h1>
      <p>My app is working!</p>
    </div>
  );
};

root.render(<App />);
