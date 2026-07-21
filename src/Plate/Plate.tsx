import { useRef, useState } from "react";
import Selecto from "react-selecto";
import { cn } from "../utils";
import type {
  AnnotationMetadata,
  PlateSelection,
  PlateSize,
  WellAnnotation,
} from "./schemas";
import { getRowLabel, indexToExcelCell, plateSizeToRowsCols } from "./utils";

export interface PlateProps<WellMetaT extends AnnotationMetadata> {
  plateSize: PlateSize;
  wellAnnotations: WellAnnotation<WellMetaT>[];
  activeWellAnnotation: WellAnnotation<WellMetaT> | null;
  setWellAnnotations: (annotations: WellAnnotation<WellMetaT>[]) => void;
  setActiveWellAnnotation: (
    annotation: WellAnnotation<WellMetaT> | null,
  ) => void;
  selection: PlateSelection | null;
  setSelection: (value: {
    selection: PlateSelection | null;
    excludedWells: number[];
  }) => void;
  excludedWells: number[];
  className?: string;
  selectionTolerance?: number;
  buildUpSelection?: boolean;
  ariaLabel?: string;
}

export const Plate = <WellMetaT extends AnnotationMetadata>({
  plateSize,
  excludedWells,
  className,
  wellAnnotations,
  selection,
  setSelection,
  buildUpSelection,
  selectionTolerance = 20,
  ariaLabel = `${plateSize}-well plate`,
}: PlateProps<WellMetaT>) => {
  const containerRef = useRef<HTMLFieldSetElement>(null);
  const { rows, cols } = plateSizeToRowsCols(plateSize);
  const rowLabels = Array.from({ length: rows }, (_, index) =>
    getRowLabel(index),
  );
  const columnLabels = Array.from({ length: cols }, (_, index) =>
    String(index + 1),
  );
  const [hoveredWells, setHoveredWells] = useState<number[]>([]);

  const handleSelection = (selectedKeys: Array<string | number>) => {
    const selected = new Set(
      selectedKeys
        .map(Number)
        .filter(
          (well) =>
            Number.isInteger(well) &&
            well >= 0 &&
            well < plateSize &&
            !excludedWells.includes(well),
        ),
    );
    if (!buildUpSelection) {
      setSelection({
        selection: selected.size ? { wells: [...selected] } : null,
        excludedWells,
      });
      return;
    }
    const current = new Set(selection?.wells ?? []);
    const removesSelection =
      selected.size > 0 && [...selected].every((well) => current.has(well));
    for (const well of selected) {
      if (removesSelection) current.delete(well);
      else current.add(well);
    }
    setSelection({
      selection: current.size ? { wells: [...current] } : null,
      excludedWells,
    });
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
        gridTemplateColumns: `max-content repeat(${cols}, minmax(0, 1fr))`,
      }}
      aria-label={ariaLabel}
    >
      <div
        className="col-start-2 grid grid-cols-subgrid"
        style={{ gridColumnEnd: `span ${cols}` }}
      >
        {columnLabels.map((label, column) => {
          const wells = Array.from(
            { length: rows },
            (_, row) => row * cols + column,
          ).filter((well) => !excludedWells.includes(well));
          const pressed =
            wells.length > 0 &&
            wells.every((well) => selection?.wells.includes(well));
          return (
            <button
              key={`column-${label}`}
              type="button"
              aria-label={`Select column ${label}`}
              aria-pressed={pressed}
              className={cn(
                "flex items-end justify-center border-r border-b border-l border-[var(--color-header-border)] pb-1 text-[var(--color-header-text)]",
                "hover:bg-[var(--color-header-hover-bg)] hover:text-[var(--color-header-hover-text)]",
                plateSize > 96 && "break-all px-1 text-[0.6rem]",
              )}
              onClick={() => handleSelection(wells)}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div className="col-span-1 grid gap-2 text-[var(--color-well-foreground)]">
        {rowLabels.map((label, row) => {
          const wells = Array.from(
            { length: cols },
            (_, column) => row * cols + column,
          ).filter((well) => !excludedWells.includes(well));
          const pressed =
            wells.length > 0 &&
            wells.every((well) => selection?.wells.includes(well));
          return (
            <button
              key={`row-${label}`}
              type="button"
              aria-label={`Select row ${label}`}
              aria-pressed={pressed}
              className={cn(
                "ml-auto border-t border-r border-b border-[var(--color-header-border)] px-1 pr-1 text-[var(--color-header-text)]",
                "hover:bg-[var(--color-header-hover-bg)] hover:text-[var(--color-header-hover-text)]",
                plateSize > 96 && "text-[0.6rem]",
              )}
              onClick={() => handleSelection(wells)}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div
        className="well-container col-start-2 grid grid-cols-subgrid gap-2"
        style={{ gridColumnEnd: `span ${cols}` }}
      >
        {Array.from({ length: plateSize }, (_, index) => {
          const annotations = wellAnnotations.filter((annotation) =>
            annotation.wells.includes(index),
          );
          return (
            <Well
              key={`well-${index}`}
              index={index}
              plateSize={plateSize}
              isSelected={selection?.wells.includes(index) ?? false}
              isHovered={hoveredWells.includes(index)}
              toggleSelection={(well) => handleSelection([well])}
              annotations={annotations}
              isExcluded={excludedWells.includes(index)}
            />
          );
        })}
      </div>
      <Selecto
        container={containerRef.current}
        selectableTargets={[".well-selectable"]}
        selectFromInside={true}
        hitRate={Math.min(1, Math.max(0, selectionTolerance / 100))}
        onSelect={(event) => {
          setHoveredWells(
            event.selected
              .map((element) => Number(element.getAttribute("data-well-index")))
              .filter(Number.isInteger),
          );
        }}
        onSelectEnd={(event) => {
          setHoveredWells([]);
          handleSelection(
            event.selected
              .map((element) => Number(element.getAttribute("data-well-index")))
              .filter(Number.isInteger),
          );
        }}
      />
    </fieldset>
  );
};

interface WellProps<WellMetaT extends AnnotationMetadata> {
  index: number;
  plateSize: PlateSize;
  isSelected: boolean;
  isExcluded: boolean;
  isHovered: boolean;
  toggleSelection: (well: number) => void;
  annotations: WellAnnotation<WellMetaT>[];
}

const Well = <WellMetaT extends AnnotationMetadata>({
  index,
  plateSize,
  isSelected,
  isExcluded,
  isHovered,
  toggleSelection,
  annotations,
}: WellProps<WellMetaT>) => {
  const wellLabel = indexToExcelCell(index, plateSize);
  const annotationLabels = annotations.map((annotation) => annotation.label);
  const accessibleLabel = [
    wellLabel,
    isExcluded ? "excluded" : null,
    isSelected ? "selected" : null,
    annotationLabels.length
      ? `annotations: ${annotationLabels.join(", ")}`
      : null,
  ]
    .filter(Boolean)
    .join(", ");
  return (
    <div className="relative isolate h-full">
      <div
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
      <button
        type="button"
        data-well-index={index}
        aria-label={accessibleLabel}
        aria-pressed={isSelected}
        disabled={isExcluded}
        className={cn(
          isExcluded ? "well-excluded" : "well-selectable",
          "group relative my-auto flex aspect-square h-full max-h-full min-h-px w-full min-w-px max-w-full cursor-pointer items-center justify-center overflow-hidden rounded-full",
          "border border-[var(--color-plate-foreground)] bg-[var(--color-well-background)] transition-all duration-200",
          !isExcluded &&
            "hover:scale-110 focus-visible:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2",
          isHovered && !isExcluded && "scale-105",
        )}
        onClick={() => toggleSelection(index)}
      >
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
          {wellLabel}
        </span>
        {annotations.map((annotation, annotationIndex) => (
          <span
            key={annotation.id}
            aria-hidden="true"
            className={cn(
              !isExcluded &&
                `platemap-annotation-${annotation.annotationStyle.color}`,
              !isExcluded && "group-hover:opacity-50",
              "absolute inset-y-0 opacity-40 transition-opacity duration-200",
              annotationIndex === 0 && "rounded-l-full",
              annotationIndex === annotations.length - 1 && "rounded-r-full",
            )}
            style={{
              width: `${100 / annotations.length}%`,
              left: `${(annotationIndex / annotations.length) * 100}%`,
            }}
          />
        ))}
      </button>
    </div>
  );
};
