import { useEffect, useRef, useState } from "react";

import { cn } from "../utils";
import { layerToCSV, parseLayerCSV } from "./csv";
import type { PlateActions, PlateState } from "./hooks/usePlateReducer";
import { parsePlateState, plateDocumentToJSON } from "./validation";

export interface PlateControlsProps<WellMetaT extends Record<string, unknown>> {
  plateState: PlateState<WellMetaT>;
  plateActions: PlateActions<WellMetaT>;
  className?: string;
  showViewControls?: boolean;
}

function downloadText(contents: string, filename: string, type: string): void {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function safeFilename(name: string): string {
  return (
    name
      .trim()
      .replace(/[^a-z0-9._-]+/gi, "-")
      .replace(/^-+|-+$/g, "") || "layer"
  );
}

export const PlateControls = <WellMetaT extends Record<string, unknown>>({
  plateState,
  plateActions,
  className,
  showViewControls = true,
}: PlateControlsProps<WellMetaT>) => {
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [pendingImport, setPendingImport] =
    useState<PlateState<WellMetaT> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [focusLayerId, setFocusLayerId] = useState<string | null>(null);
  const rootRef = useRef<HTMLElement>(null);
  const csvInput = useRef<HTMLInputElement>(null);
  const jsonInput = useRef<HTMLInputElement>(null);
  const activeIndex = plateState.layers.findIndex(
    (layer) => layer.id === plateState.activeLayerId,
  );
  const activeLayer = plateState.layers[activeIndex];
  const activateRelativeLayer = (offset: number): void => {
    const count = plateState.layers.length;
    if (count < 2) return;
    const nextIndex = (activeIndex + offset + count) % count;
    plateActions.setActiveLayer(plateState.layers[nextIndex].id);
  };
  useEffect(() => {
    if (!focusLayerId) return;
    const button = rootRef.current?.querySelector<HTMLButtonElement>(
      `[data-layer-activate="${focusLayerId}"]`,
    );
    if (button) {
      button.focus();
      setFocusLayerId(null);
    }
  }, [focusLayerId, plateState.layers]);

  const readFile = async (file: File | undefined, kind: "csv" | "json") => {
    if (!file) return;
    setError(null);
    try {
      const text = await file.text();
      if (kind === "csv") {
        const annotations = parseLayerCSV<WellMetaT>(text, {
          plateSize: plateState.plateSize,
        });
        const baseName = file.name.replace(/\.[^.]*$/, "").trim();
        plateActions.addLayerWithAnnotations(
          annotations,
          baseName || undefined,
        );
      } else {
        setPendingImport(parsePlateState<WellMetaT>(JSON.parse(text)));
      }
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : String(caught);
      setError(`${kind.toUpperCase()} import failed: ${message}`);
    }
  };

  return (
    <section
      ref={rootRef}
      aria-label="Plate controls"
      className={cn("platemap-controls", className)}
    >
      <div className="platemap-controls-section">
        <h2>Layers</h2>
        <div className="platemap-layer-list">
          {plateState.layers.map((layer, index) => (
            <div
              key={layer.id}
              className="platemap-layer-row"
              data-active={layer.id === plateState.activeLayerId || undefined}
            >
              {renamingId === layer.id ? (
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    const name = renameValue.trim();
                    if (!name) return setError("Layer name cannot be blank");
                    plateActions.renameLayer(layer.id, name);
                    setRenamingId(null);
                    setFocusLayerId(layer.id);
                    setError(null);
                  }}
                >
                  <label>
                    Layer name
                    <input
                      autoFocus
                      value={renameValue}
                      onChange={(event) => setRenameValue(event.target.value)}
                    />
                  </label>
                  <button type="submit">Save layer name</button>
                  <button
                    type="button"
                    onClick={() => {
                      setRenamingId(null);
                      setFocusLayerId(layer.id);
                    }}
                  >
                    Cancel rename
                  </button>
                </form>
              ) : (
                <>
                  <button
                    type="button"
                    data-layer-activate={layer.id}
                    aria-current={
                      layer.id === plateState.activeLayerId ? "true" : undefined
                    }
                    onClick={() => plateActions.setActiveLayer(layer.id)}
                  >
                    {layer.name}
                  </button>
                  <button
                    type="button"
                    aria-label={`Select ${layer.name}`}
                    onClick={() => {
                      plateActions.setActiveLayer(layer.id);
                      plateActions.setViewMode("flat");
                    }}
                  >
                    Select
                  </button>
                  <button
                    type="button"
                    aria-label={`Rename ${layer.name}`}
                    onClick={() => {
                      setRenamingId(layer.id);
                      setRenameValue(layer.name);
                    }}
                  >
                    Rename
                  </button>
                  <button
                    type="button"
                    aria-label={`Move ${layer.name} up`}
                    disabled={index === 0}
                    onClick={() => plateActions.moveLayer(layer.id, "up")}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    aria-label={`Move ${layer.name} down`}
                    disabled={index === plateState.layers.length - 1}
                    onClick={() => plateActions.moveLayer(layer.id, "down")}
                  >
                    ↓
                  </button>
                  {confirmDeleteId === layer.id ? (
                    <span className="platemap-delete-confirm">
                      Delete {layer.name}?
                      <button
                        type="button"
                        onClick={() => {
                          const next =
                            plateState.layers[index + 1] ??
                            plateState.layers[index - 1];
                          plateActions.deleteLayer(layer.id);
                          setConfirmDeleteId(null);
                          setFocusLayerId(next?.id ?? null);
                        }}
                      >
                        Confirm delete
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setConfirmDeleteId(null);
                          setFocusLayerId(layer.id);
                        }}
                      >
                        Cancel delete
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      aria-label={`Delete ${layer.name}`}
                      disabled={plateState.layers.length === 1}
                      onClick={() => {
                        if (layer.annotations.length) {
                          setConfirmDeleteId(layer.id);
                          return;
                        }
                        const next =
                          plateState.layers[index + 1] ??
                          plateState.layers[index - 1];
                        plateActions.deleteLayer(layer.id);
                        setFocusLayerId(next?.id ?? null);
                      }}
                    >
                      Delete
                    </button>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
        <button type="button" onClick={() => plateActions.addLayer()}>
          Add layer
        </button>
      </div>

      {showViewControls && (
        <div className="platemap-controls-section">
          <h2>View</h2>
          <button
            type="button"
            aria-pressed={plateState.viewMode === "flat"}
            onClick={() => plateActions.setViewMode("flat")}
          >
            Flat view
          </button>
          <button
            type="button"
            aria-pressed={plateState.viewMode === "isometric"}
            onClick={() => plateActions.setViewMode("isometric")}
          >
            Isometric view
          </button>
          {plateState.viewMode === "isometric" && (
            <>
              <div
                className="platemap-layer-navigation"
                role="group"
                aria-label="Active layer navigation"
              >
                <button
                  type="button"
                  aria-label="Previous layer"
                  disabled={plateState.layers.length < 2}
                  onClick={() => activateRelativeLayer(-1)}
                >
                  Previous
                </button>
                <output
                  className="platemap-layer-position"
                  role="status"
                  aria-label="Active layer"
                >
                  {activeLayer.name} · {activeIndex + 1} of{" "}
                  {plateState.layers.length}
                </output>
                <button
                  type="button"
                  aria-label="Next layer"
                  disabled={plateState.layers.length < 2}
                  onClick={() => activateRelativeLayer(1)}
                >
                  Next
                </button>
              </div>
              <span className="platemap-navigation-hint">
                Swipe the stack or use left and right arrow keys
              </span>
            </>
          )}
        </div>
      )}

      <div className="platemap-controls-section">
        <h2>Files</h2>
        <input
          ref={csvInput}
          hidden
          type="file"
          accept=".csv,text/csv"
          onChange={(event) => void readFile(event.target.files?.[0], "csv")}
        />
        <button type="button" onClick={() => csvInput.current?.click()}>
          Import CSV
        </button>
        <button
          type="button"
          onClick={() =>
            downloadText(
              layerToCSV(activeLayer, plateState.plateSize),
              `${safeFilename(activeLayer.name)}.csv`,
              "text/csv",
            )
          }
        >
          Export active layer CSV
        </button>
        <input
          ref={jsonInput}
          hidden
          type="file"
          accept=".json,application/json"
          onChange={(event) => void readFile(event.target.files?.[0], "json")}
        />
        <button type="button" onClick={() => jsonInput.current?.click()}>
          Import JSON
        </button>
        <button
          type="button"
          onClick={() =>
            downloadText(
              plateDocumentToJSON(plateState),
              "plate-map.json",
              "application/json",
            )
          }
        >
          Export plate JSON
        </button>
        {pendingImport && (
          <div className="platemap-import-confirm">
            Replace the current plate?
            <button
              type="button"
              onClick={() => {
                plateActions.replacePlateState(pendingImport);
                setPendingImport(null);
              }}
            >
              Confirm JSON import
            </button>
            <button type="button" onClick={() => setPendingImport(null)}>
              Cancel JSON import
            </button>
          </div>
        )}
        {error && <p role="alert">{error}</p>}
      </div>
    </section>
  );
};
