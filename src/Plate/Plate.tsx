import { useRef, useState } from "react";
import Selecto from "react-selecto";
import { cn } from "../utils";
import { PlateSelection, PlateSize, WellAnnotation } from "./schemas";
import { getRowLabel, indexToExcelCell, plateSizeToRowsCols } from "./utils";

export interface PlateProps<WellMetaT extends Record<string, string>> {
  plateSize: PlateSize;
  wellAnnotations: WellAnnotation<WellMetaT>[];
  activeWellAnnotation: WellAnnotation<WellMetaT> | null;
  setWellAnnotations: (annotations: WellAnnotation<WellMetaT>[]) => void;
  setActiveWellAnnotation: (
    annotation: WellAnnotation<WellMetaT> | null,
  ) => void;

  selection: PlateSelection | null;
  setSelection: ({
    selection,
    excludedWells,
  }: {
    selection: PlateSelection | null;
    excludedWells: number[];
  }) => void;
  excludedWells: number[];
  className?: string;
  selectionTolerance?: number;
  buildUpSelection?: boolean;
}

export const Plate = <WellMetaT extends Record<string, string>>({
  plateSize,
  excludedWells,
  className,
  wellAnnotations,
  selection,
  setSelection,
  buildUpSelection,
  selectionTolerance = 20,
}: PlateProps<WellMetaT>) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { rows, cols } = plateSizeToRowsCols(plateSize);
  const rowLabels: string[] = Array.from({ length: rows }, (_, i) =>
    getRowLabel(i),
  );

  const colLabels: string[] = Array.from({ length: cols }, (_, i) =>
    (i + 1).toString(),
  );

  // Track hovered wells coming from Selecto
  const [hoveredWells, setHoveredWells] = useState<number[]>([]);

  // Add the number of columns for the wells
  let gridClass: string;
  switch (plateSize) {
    case 24:
      gridClass = "grid-cols-7 gap-2 ";
      break;
    case 48:
      gridClass = "grid-cols-9 gap-2";
      break;
    case 96:
      gridClass = "grid-cols-13 gap-2 ";
      break;
    case 384:
      gridClass = "grid-cols-25 gap-2 ";
      break;
    case 1536:
      gridClass = "grid-cols-51 gap-2 ";
      break;
    default:
      throw new Error("Invalid number of wells");
  }

  const handleSelection = (selectedKeys: (string | number)[]) => {
    const selectedSet = new Set(
      selectedKeys
        .map((k) => Number(k))
        .filter((k) => !excludedWells.includes(k)),
    );

    if (!buildUpSelection) {
      setSelection({
        selection: { wells: Array.from(selectedSet) },
        excludedWells,
      });
      return;
    }

    const currentSelection = new Set(selection?.wells ?? []);
    if (
      selectedSet.size &&
      Array.from(selectedSet).every((k) => currentSelection.has(k))
    ) {
      selectedSet.forEach((k) => currentSelection.delete(k));
    } else {
      selectedSet.forEach((k) => currentSelection.add(k));
    }

    setSelection({
      selection: { wells: Array.from(currentSelection) },
      excludedWells,
    });
  };
  const toggleWellInSelection = (well: number) => {
    handleSelection([well]);
  };

  const toggleColumnInSelection = (col: number) => {
    const indices = Array.from({ length: rows }, (_, row) => row * cols + col);
    handleSelection(indices);
  };

  const toggleRowInSelection = (row: number) => {
    const indices = Array.from({ length: cols }, (_, col) => row * cols + col);
    handleSelection(indices);
  };

  return (
    <>
      <div
        className={cn(
          "plate-container",
          "grid gap-2",
          "select-none",
          "text-xs md:text-sm lg:text-base",
          plateSize > 96 && "px-4",
          gridClass,
          className,
        )}
        ref={containerRef}
      >
        <div className={cn("col-span-full col-start-2 grid grid-cols-subgrid")}>
          {colLabels.map((colLabel) => (
            <button
              key={`col-${colLabel}`}
              className={cn(
                "flex items-end justify-center",
                plateSize > 96 && "px-1 text-[0.6rem] break-all",
                "border-r border-b border-l border-[var(--color-header-border)] pb-1 text-[var(--color-header-text)]",
                "hover:bg-[var(--color-header-hover-bg)] hover:text-[var(--color-header-hover-text)]",
              )}
              onClick={() => {
                toggleColumnInSelection(colLabels.indexOf(colLabel));
              }}
            >
              {colLabel}
            </button>
          ))}
        </div>
        <div
          className={cn(
            "col-span-1 grid grid-cols-subgrid gap-2",

            "text-[var(--color-well-foreground)]",
          )}
        >
          {rowLabels.map((rowLabel) => (
            <button
              key={`row-${rowLabel}`}
              onClick={() => {
                toggleRowInSelection(rowLabels.indexOf(rowLabel));
              }}
              className={cn(
                "ml-auto px-1",
                plateSize > 96 && "text-[0.6rem]",
                "border-t border-r border-b border-[var(--color-header-border)] pr-1 text-[var(--color-header-text)]",
                "hover:bg-[var(--color-header-hover-bg)] hover:text-[var(--color-header-hover-text)]",
              )}
            >
              {rowLabel}
            </button>
          ))}
        </div>

        <div className="well-container col-span-full col-start-2 grid grid-cols-subgrid gap-2">
          {Array.from({ length: plateSize }).map((_, i) => {
            const isSelected = selection?.wells.includes(i) ?? false;
            const isHovered = hoveredWells.includes(i);
            const anns: WellAnnotation<WellMetaT>[] =
              wellAnnotations?.filter((ann) => ann.wells.includes(i)) ?? [];
            return (
              <Well
                key={`well-${i}`}
                index={i}
                plateSize={plateSize}
                isSelected={isSelected}
                isHovered={isHovered}
                toggleSelection={toggleWellInSelection}
                annotations={anns}
                isExcluded={excludedWells.includes(i)}
              />
            );
          })}
        </div>
        <Selecto
          container={containerRef.current}
          selectableTargets={[".well-selectable", ".well-container"]}
          selectFromInside={true}
          hitRate={selectionTolerance / 100}
          onSelect={(e) => {
            // Update hovered wells live while dragging
            const indices = e.selected
              .map((el) =>
                parseInt(el.getAttribute("data-well-index") ?? "-1", 10),
              )
              .filter((idx) => idx !== -1);
            setHoveredWells(indices);
          }}
          onSelectEnd={(e) => {
            // Clear hover state once drag ends and commit the selection
            const indices = e.selected
              .map((el) =>
                parseInt(el.getAttribute("data-well-index") ?? "-1", 10),
              )
              .filter((idx) => idx !== -1);
            setHoveredWells([]);
            handleSelection(indices);
          }}
        />
      </div>
    </>
  );
};

interface WellProps<WellMetaT extends Record<string, string>> {
  index: number;
  plateSize: PlateSize;
  isSelected: boolean;
  isExcluded: boolean;
  isHovered: boolean;
  toggleSelection: (well: number) => void;
  annotations: WellAnnotation<WellMetaT>[];
}

const Well = <WellMetaT extends Record<string, string>>({
  index,
  plateSize,
  isSelected,
  isExcluded,
  isHovered,
  toggleSelection,
  annotations,
}: WellProps<WellMetaT>) => {
  return (
    <div className="relative isolate h-full">
      <div
        className={cn(
          "absolute -inset-1",
          isSelected && "bg-[var(--color-well-selected)]/[0.8]",
          isExcluded && "bg-[var(--color-well-excluded)]",
          isHovered &&
            !isSelected &&
            !isExcluded &&
            "bg-[var(--color-well-hovered)]/[0.3]",
        )}
      />
      <button
        data-well-index={index}
        className={cn(
          isExcluded ? "well-excluded" : "well-selectable",
          "group my-auto flex h-full w-full cursor-pointer items-center justify-center bg-[var(--color-well-background)]",
          "aspect-square max-h-full min-h-px max-w-full min-w-px rounded-full",
          "transition-all duration-300 ease-in-out",
          "border border-[var(--color-plate-foreground)]",
          isExcluded ? "" : "hover:scale-110",
          isHovered && !isExcluded && "scale-105", // subtle scale on hover provided by Selecto
          "relative overflow-hidden",
        )}
        onClick={() => {
          toggleSelection(index);
        }}
      >
        <span
          className={cn(
            plateSize === 24 && "text-2xl",
            plateSize === 48 && "text-xl",
            plateSize === 96 && "text-sm",
            plateSize === 384 && "hidden",
            plateSize === 1536 && "hidden",
            isSelected
              ? "text-black dark:text-white"
              : "text-[var(--color-well-foreground)]",
          )}
        >
          {indexToExcelCell(index, plateSize)}
        </span>
        {annotations.map((ann, index) => (
          <span
            key={ann.id}
            className={cn(
              isExcluded ? "" : ann.annotationStyle.wellClassName,
              isExcluded ? "" : "group-hover:opacity-50",
              "opacity-40 dark:opacity-40",
              "transition-all duration-300 ease-in-out",
              "absolute inset-0",
              "flex items-center justify-center",
              index === 0 && "rounded-l-full",
              index === annotations.length - 1 && "rounded-r-full",
            )}
            style={{
              width: (1 / annotations.length) * 100 + "%",
              left: (annotations.indexOf(ann) / annotations.length) * 100 + "%",
            }}
          />
        ))}
      </button>
    </div>
  );
};
