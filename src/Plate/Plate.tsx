import React from "react";
import { SelectableGroup, createSelectable } from "react-selectable";
import { PlateSelection, PlateSize, WellAnnotation } from "./schemas";
import { getRowLabel, indexToExcelCell, plateSizeToRowsCols } from "./utils";
import { cn } from "../utils";

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
  hideWellLabels?: boolean;
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
  hideWellLabels,
}: PlateProps<WellMetaT>) => {
  const { rows, cols } = plateSizeToRowsCols(plateSize);
  const rowLabels: string[] = Array.from({ length: rows }, (_, i) =>
    getRowLabel(i),
  );

  const colLabels: string[] = Array.from({ length: cols }, (_, i) =>
    (i + 1).toString(),
  );

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
    <SelectableGroup
      onEndSelection={handleSelection}
      tolerance={selectionTolerance}
      className={cn(className, "aspect-[4/3] max-w-full")}
    >
      <div
        className={cn(
          "grid gap-2",
          "select-none",
          "text-xs md:text-sm lg:text-base",
          gridClass,
        )}
      >
        <div className={cn("col-span-full col-start-2 grid grid-cols-subgrid")}>
          {colLabels.map((colLabel) => (
            <button
              key={`col-${colLabel}`}
              className={cn(
                "flex items-end justify-center",
                plateSize > 96 && "break-all px-1 text-[0.6rem]",
                "border-noir-300 text-noir-400 dark:border-noir-500 dark:text-noir-300 border-b border-l border-r pb-1",
                "hover:bg-brand-200 hover:text-noir-800 dark:text-noir-600 hover:dark:bg-brand-600 hover:dark:text-noir-200",
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
            "col-span-1 grid gap-2 ",
            "text-noir-600 dark:text-noir-300",
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
                "border-noir-300 text-noir-400 dark:border-noir-500 dark:text-noir-300 border-b border-r border-t pr-1",
                "hover:bg-brand-200 hover:text-noir-800 dark:text-noir-600 hover:dark:bg-brand-600 hover:dark:text-noir-200",
              )}
            >
              {rowLabel}
            </button>
          ))}
        </div>

        <div className="col-span-full col-start-2 grid grid-cols-subgrid gap-2 ">
          {Array.from({ length: plateSize }).map((_, i) => {
            const isSelected = selection?.wells.includes(i) ?? false;
            const anns: WellAnnotation<WellMetaT>[] =
              wellAnnotations?.filter((ann) => ann.wellData?.[i]) ?? [];
            return (
              <Well
                key={`well-${i}`}
                index={i}
                plateSize={plateSize}
                selectableKey={i}
                isSelected={isSelected}
                toggleSelection={toggleWellInSelection}
                annotations={anns}
                isExcluded={excludedWells.includes(i)}
                hideWellLabels={hideWellLabels}
              />
            );
          })}
        </div>
      </div>
    </SelectableGroup>
  );
};
const Well = createSelectable(
  <WellMetaT extends Record<string, string>>({
    index,
    plateSize,
    selectableRef,
    isSelected,
    isExcluded,
    toggleSelection,
    annotations,
    hideWellLabels,
  }: {
    index: number;
    plateSize: PlateSize;
    selectableRef?: React.RefObject<HTMLButtonElement>;
    selectableKey: number;
    isSelected: boolean;
    isExcluded: boolean;
    toggleSelection: (well: number) => void;
    annotations: WellAnnotation<WellMetaT>[];
    hideWellLabels?: boolean;
  }) => {
    return (
      <div className="relative isolate h-full ">
        <div
          className={cn(
            "absolute -inset-1",
            isSelected && "bg-brand-200/80 dark:bg-brand-600/40 ",
            isExcluded && "bg-noir-300 dark:bg-noir-700",
          )}
        />
        <button
          ref={isExcluded ? undefined : selectableRef}
          onClick={() => {
            toggleSelection(index);
          }}
          className={cn(
            "bg-noir-100 dark:bg-noir-800 group my-auto flex h-full w-full cursor-pointer items-center justify-center",
            "aspect-square max-h-full min-h-px min-w-px max-w-full rounded-full",
            "transition-all duration-300 ease-in-out",
            "border-noir-800 dark:border-noir-200 border",
            isExcluded ? "" : "hover:scale-110",
            "relative overflow-hidden",
          )}
        >
          <span
            className={cn(
              plateSize === 24 && "text-2xl",
              plateSize === 48 && "text-xl",
              plateSize === 96 && "text-sm",
              plateSize === 384 && "text-xs",
              plateSize === 1536 && "text-[0.6rem]",
              hideWellLabels && "hidden",
              isSelected
                ? "text-black dark:text-white"
                : "text-noir-600 dark:text-noir-300",
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
                "flex items-center justify-center ",
                index === 0 && "rounded-l-full",
                index === annotations.length - 1 && "rounded-r-full",
              )}
              style={{
                width: (1 / annotations.length) * 100 + "%",
                left:
                  (annotations.indexOf(ann) / annotations.length) * 100 + "%",
              }}
            />
          ))}
        </button>
      </div>
    );
  },
);
