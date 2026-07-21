import {
  type CSSProperties,
  type KeyboardEvent,
  useMemo,
  useRef,
  useState,
  type WheelEvent,
} from "react";
import Selecto from "react-selecto";

import { cn } from "../utils";
import type { PlateActions, PlateState } from "./hooks/usePlateReducer";
import type { PlateLayer, PlateSize, WellAnnotation } from "./schemas";
import { getRowLabel, indexToExcelCell, plateSizeToRowsCols } from "./utils";

export interface PlateProps<WellMetaT extends Record<string, unknown>> {
  plateState: PlateState<WellMetaT>;
  plateActions: PlateActions<WellMetaT>;
  className?: string;
  selectionTolerance?: number;
  buildUpSelection?: boolean;
  ariaLabel?: string;
}

export const Plate = <WellMetaT extends Record<string, unknown>>({
  plateState,
  plateActions,
  className,
  selectionTolerance = 20,
  buildUpSelection,
  ariaLabel = `${plateState.plateSize}-well plate`,
}: PlateProps<WellMetaT>) => {
  const activeLayer = plateState.layers.find(
    (layer) => layer.id === plateState.activeLayerId,
  );
  if (!activeLayer) throw new Error("Active layer does not exist");
  const activeIndex = plateState.layers.findIndex(
    (layer) => layer.id === plateState.activeLayerId,
  );
  const lastCarouselScrollAt = useRef(0);
  const activateRelativeLayer = (offset: number): void => {
    const count = plateState.layers.length;
    if (count < 2) return;
    const nextIndex = (activeIndex + offset + count) % count;
    plateActions.setActiveLayer(plateState.layers[nextIndex].id);
  };
  const handleCarouselKeyDown = (event: KeyboardEvent<HTMLElement>): void => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    activateRelativeLayer(event.key === "ArrowRight" ? 1 : -1);
  };
  const handleCarouselWheel = (event: WheelEvent<HTMLElement>): void => {
    if (
      Math.abs(event.deltaX) <= Math.abs(event.deltaY) ||
      Math.abs(event.deltaX) < 16
    ) {
      return;
    }
    event.preventDefault();
    const now = Date.now();
    if (now - lastCarouselScrollAt.current < 250) return;
    lastCarouselScrollAt.current = now;
    activateRelativeLayer(event.deltaX > 0 ? 1 : -1);
  };
  if (plateState.viewMode === "flat") {
    return (
      <PlatePlane
        plateSize={plateState.plateSize}
        layer={activeLayer}
        selection={plateState.selection?.wells ?? []}
        excludedWells={plateState.excludedWells}
        onSelection={(wells) =>
          plateActions.setSelectionWithExcluded({
            selection: wells.length ? { ...plateState.selection, wells } : null,
            excludedWells: plateState.excludedWells,
          })
        }
        interactive
        buildUpSelection={buildUpSelection}
        selectionTolerance={selectionTolerance}
        ariaLabel={ariaLabel}
        className={className}
        showHeaders
      />
    );
  }
  return (
    <section
      aria-label="Isometric plate stack"
      aria-roledescription="circular layer carousel"
      className={cn("platemap-isometric-stack", className)}
      tabIndex={0}
      onKeyDown={handleCarouselKeyDown}
      onWheel={handleCarouselWheel}
      style={
        { "--platemap-layer-count": plateState.layers.length } as CSSProperties
      }
    >
      {plateState.layers.map((layer, index) => {
        const carouselIndex =
          (index - activeIndex + plateState.layers.length) %
          plateState.layers.length;
        const cascadeSpan = Math.max(1, plateState.layers.length - 1);
        const cascadePosition = carouselIndex * Math.min(1, 3.5 / cascadeSpan);
        return (
          <button
            key={layer.id}
            type="button"
            aria-label={`View layer ${layer.name}`}
            aria-current={
              layer.id === plateState.activeLayerId ? "true" : undefined
            }
            className="platemap-isometric-plane"
            style={
              {
                "--platemap-layer-index": carouselIndex,
                "--platemap-layer-distance": carouselIndex,
                "--platemap-layer-position": cascadePosition,
                "--platemap-layer-z": plateState.layers.length - carouselIndex,
              } as CSSProperties
            }
            onClick={() => plateActions.setActiveLayer(layer.id)}
          >
            <span className="platemap-plane-label">{layer.name}</span>
            <PlatePlane
              plateSize={plateState.plateSize}
              layer={layer}
              selection={plateState.selection?.wells ?? []}
              excludedWells={plateState.excludedWells}
              interactive={false}
              showHeaders={false}
              ariaLabel={`${layer.name}, ${plateState.plateSize}-well plate`}
            />
          </button>
        );
      })}
    </section>
  );
};

interface PlatePlaneProps<WellMetaT extends Record<string, unknown>> {
  plateSize: PlateSize;
  layer: PlateLayer<WellMetaT>;
  selection: number[];
  excludedWells: number[];
  interactive: boolean;
  showHeaders: boolean;
  ariaLabel: string;
  className?: string;
  selectionTolerance?: number;
  buildUpSelection?: boolean;
  onSelection?: (wells: number[]) => void;
}

const PlatePlane = <WellMetaT extends Record<string, unknown>>({
  plateSize,
  layer,
  selection,
  excludedWells,
  interactive,
  showHeaders,
  ariaLabel,
  className,
  selectionTolerance = 20,
  buildUpSelection,
  onSelection,
}: PlatePlaneProps<WellMetaT>) => {
  const containerRef = useRef<HTMLFieldSetElement>(null);
  const { rows, cols } = plateSizeToRowsCols(plateSize);
  const [hoveredWells, setHoveredWells] = useState<number[]>([]);
  const excluded = useMemo(() => new Set(excludedWells), [excludedWells]);
  const selected = useMemo(() => new Set(selection), [selection]);
  const annotationsByWell = useMemo(() => {
    const result = new Map<number, WellAnnotation<WellMetaT>[]>();
    for (const annotation of layer.annotations) {
      for (const well of annotation.wells) {
        const annotations = result.get(well) ?? [];
        annotations.push(annotation);
        result.set(well, annotations);
      }
    }
    return result;
  }, [layer.annotations]);
  const handleSelection = (keys: Array<string | number>) => {
    if (!interactive || !onSelection) return;
    const incoming = new Set(
      keys
        .map(Number)
        .filter(
          (well) =>
            Number.isInteger(well) &&
            well >= 0 &&
            well < plateSize &&
            !excluded.has(well),
        ),
    );
    if (!buildUpSelection) return onSelection([...incoming]);
    const current = new Set(selection);
    const removing =
      incoming.size > 0 && [...incoming].every((well) => current.has(well));
    for (const well of incoming)
      removing ? current.delete(well) : current.add(well);
    onSelection([...current]);
  };
  return (
    <fieldset
      ref={containerRef}
      className={cn(
        "plate-container grid select-none gap-2 text-xs md:text-sm lg:text-base",
        plateSize > 96 && "px-4",
        className,
      )}
      style={{
        gridTemplateColumns: showHeaders
          ? `max-content repeat(${cols}, minmax(0, 1fr))`
          : "minmax(0, 1fr)",
      }}
      aria-label={ariaLabel}
    >
      {showHeaders && (
        <div
          className="col-start-2 grid grid-cols-subgrid"
          style={{ gridColumnEnd: `span ${cols}` }}
        >
          {Array.from({ length: cols }, (_, column) => {
            const label = String(column + 1);
            const wells = Array.from(
              { length: rows },
              (_, row) => row * cols + column,
            ).filter((well) => !excluded.has(well));
            return (
              <button
                key={label}
                type="button"
                aria-label={`Select column ${label}`}
                aria-pressed={
                  wells.length > 0 && wells.every((well) => selected.has(well))
                }
                className="platemap-header"
                onClick={() => handleSelection(wells)}
              >
                {label}
              </button>
            );
          })}
        </div>
      )}
      {showHeaders && (
        <div className="col-span-1 grid gap-2 text-[var(--color-well-foreground)]">
          {Array.from({ length: rows }, (_, row) => {
            const label = getRowLabel(row);
            const wells = Array.from(
              { length: cols },
              (_, column) => row * cols + column,
            ).filter((well) => !excluded.has(well));
            return (
              <button
                key={label}
                type="button"
                aria-label={`Select row ${label}`}
                aria-pressed={
                  wells.length > 0 && wells.every((well) => selected.has(well))
                }
                className="platemap-row-header"
                onClick={() => handleSelection(wells)}
              >
                {label}
              </button>
            );
          })}
        </div>
      )}
      <div
        className={cn(
          "well-container grid gap-2",
          showHeaders && "col-start-2 grid-cols-subgrid",
        )}
        style={
          showHeaders
            ? { gridColumnEnd: `span ${cols}` }
            : {
                gridColumn: "1 / -1",
                gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
              }
        }
      >
        {Array.from({ length: plateSize }, (_, index) => (
          <Well
            key={index}
            index={index}
            plateSize={plateSize}
            isSelected={selected.has(index)}
            isExcluded={excluded.has(index)}
            isHovered={hoveredWells.includes(index)}
            interactive={interactive}
            toggleSelection={() => handleSelection([index])}
            annotations={annotationsByWell.get(index) ?? []}
          />
        ))}
      </div>
      {interactive && (
        <Selecto
          container={containerRef.current}
          selectableTargets={[".well-selectable"]}
          selectFromInside
          hitRate={Math.min(1, Math.max(0, selectionTolerance / 100))}
          onSelect={(event) =>
            setHoveredWells(
              event.selected
                .map((element) =>
                  Number(element.getAttribute("data-well-index")),
                )
                .filter(Number.isInteger),
            )
          }
          onSelectEnd={(event) => {
            setHoveredWells([]);
            handleSelection(
              event.selected
                .map((element) =>
                  Number(element.getAttribute("data-well-index")),
                )
                .filter(Number.isInteger),
            );
          }}
        />
      )}
    </fieldset>
  );
};

interface WellProps<WellMetaT extends Record<string, unknown>> {
  index: number;
  plateSize: PlateSize;
  isSelected: boolean;
  isExcluded: boolean;
  isHovered: boolean;
  interactive: boolean;
  toggleSelection: () => void;
  annotations: WellAnnotation<WellMetaT>[];
}

const Well = <WellMetaT extends Record<string, unknown>>({
  index,
  plateSize,
  isSelected,
  isExcluded,
  isHovered,
  interactive,
  toggleSelection,
  annotations,
}: WellProps<WellMetaT>) => {
  const label = indexToExcelCell(index, plateSize);
  const overflow = Math.max(0, annotations.length - 3);
  const visible = overflow > 0 ? annotations.slice(0, 3) : annotations;
  const accessibleLabel = [
    label,
    isExcluded ? "excluded" : null,
    isSelected ? "selected" : null,
    annotations.length
      ? `annotations: ${annotations.map((annotation) => annotation.label).join(", ")}`
      : null,
    overflow ? `${overflow} additional annotations` : null,
  ]
    .filter(Boolean)
    .join(", ");
  const content = (
    <>
      <span
        aria-hidden="true"
        className={cn(
          "absolute -inset-1",
          isSelected && "bg-[var(--color-well-selected)]/80",
          isExcluded && "bg-[var(--color-well-excluded)]",
          isHovered &&
            !isSelected &&
            !isExcluded &&
            "bg-[var(--color-well-hovered)]/30",
        )}
      />
      <span
        className={cn(
          plateSize === 24 && "text-2xl",
          plateSize === 48 && "text-xl",
          plateSize === 96 && "text-sm",
          plateSize > 96 && "sr-only",
          isSelected
            ? "text-black dark:text-white"
            : "text-[var(--color-well-foreground)]",
        )}
      >
        {label}
      </span>
      {visible.map((annotation, annotationIndex) => (
        <span
          key={annotation.id}
          aria-hidden="true"
          className={cn(
            !isExcluded &&
              `platemap-annotation-${annotation.annotationStyle.color}`,
            "absolute inset-y-0 opacity-40 transition-opacity duration-200",
          )}
          style={{
            width: `${100 / (overflow ? 4 : visible.length)}%`,
            left: `${(annotationIndex / (overflow ? 4 : visible.length)) * 100}%`,
          }}
        />
      ))}
      {overflow > 0 && (
        <span
          aria-hidden="true"
          className="platemap-annotation-overflow"
          style={{ width: "25%", left: "75%" }}
        >
          +{overflow}
        </span>
      )}
    </>
  );
  const classes = cn(
    "group relative my-auto flex aspect-square h-full max-h-full min-h-px w-full min-w-px max-w-full items-center justify-center overflow-hidden rounded-full border border-[var(--color-plate-foreground)] bg-[var(--color-well-background)]",
    interactive &&
      !isExcluded &&
      "well-selectable cursor-pointer hover:scale-110",
    isExcluded && "well-excluded",
  );
  return (
    <div className="relative isolate h-full">
      {interactive ? (
        <button
          type="button"
          data-well-index={index}
          aria-label={accessibleLabel}
          aria-pressed={isSelected}
          disabled={isExcluded}
          className={classes}
          onClick={toggleSelection}
        >
          {content}
        </button>
      ) : (
        <div
          data-well-index={index}
          aria-label={accessibleLabel}
          className={classes}
        >
          {content}
        </div>
      )}
    </div>
  );
};
