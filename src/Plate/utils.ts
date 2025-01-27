import { PlateSize, WellAnnotation, WellAnnotationCSVRow } from "./schemas";

export const plateSizeToRowsCols = (plateSize: PlateSize) => {
  switch (plateSize) {
    case 24:
      return { rows: 4, cols: 6 };
    case 48:
      return { rows: 6, cols: 8 };
    case 96:
      return { rows: 8, cols: 12 };
    case 384:
      return { rows: 16, cols: 24 };
    case 1536:
      return { rows: 32, cols: 48 };
    default:
      throw new Error(`Invalid number of wells ${plateSize}`);
  }
};

export const indexToExcelCell = (index: number, plateSize: PlateSize) => {
  const { cols } = plateSizeToRowsCols(plateSize);
  const row = Math.floor(index / cols);
  const col = index % cols;
  return `${getRowLabel(row)}${col + 1}`;
};

// Function to convert Excel cell reference to index
export const excelCellToIndex = (
  cell: string,
  plateSize: PlateSize,
): number | null => {
  const { rows, cols } = plateSizeToRowsCols(plateSize);
  const match = cell.match(/([A-Z]+)(\d+)/);

  if (!match) {
    throw new Error(`Invalid cell reference: ${cell}`);
  }

  const colPart = parseInt(match[2], 10) - 1;

  const rowPart =
    match[1]
      .split("")
      .reduce((acc, char) => acc * 26 + char.charCodeAt(0) - 64, 0) - 1;
  if (rowPart >= rows || colPart >= cols) {
    console.debug(
      `Invalid cell reference ${cell} for plate with ${plateSize} wells`,
    );
    return null;
  }

  const wellIndex = rowPart * cols + colPart;
  return wellIndex;
};

// Given the total number of wells and a list of row numbers, return the indices of the wells in those rows
export const rowsToWells = ({
  plateSize,
  rows,
}: {
  plateSize: PlateSize;
  rows: number[];
}) => {
  const { cols } = plateSizeToRowsCols(plateSize);
  const wellIndices: number[] = [];

  for (const row of rows) {
    if (row < 0 || row > cols) {
      console.debug(
        `Row number ${row} is out of bounds for plate with ${cols} columns`,
      );
      // skip this row, but attempt to process the rest
      continue;
    }

    Array.from({ length: cols }).forEach((_, colIdx) => {
      const wellIndex = row * cols + colIdx;
      wellIndices.push(wellIndex);
    });
  }

  return wellIndices;
};

// Given the total number of wells and a list of column numbers, return the indices of the wells in those columns
export const columnsToWells = ({
  plateSize,
  columns,
}: {
  plateSize: PlateSize;
  columns: number[];
}) => {
  const { rows, cols } = plateSizeToRowsCols(plateSize);
  const wellIndices: number[] = [];

  for (const col of columns) {
    if (col < 0 || col >= cols) {
      console.debug(
        `Column number ${col} is out of bounds for plate with ${cols} columns`,
      );
      // skip this column, but attempt to process the rest
      continue;
    }

    Array.from({ length: rows }).forEach((_, rowIdx) => {
      const wellIndex = rowIdx * cols + col;
      wellIndices.push(wellIndex);
    });
  }

  return wellIndices;
};

// Given the total number of wells return the indices of all the wells on the perimeter of the plate
export const getEdgeWells = (plateSize: PlateSize) => {
  const { rows, cols } = plateSizeToRowsCols(plateSize);
  const perimeterWells: number[] = [];

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (row === 0 || row === rows - 1 || col === 0 || col === cols - 1) {
        perimeterWells.push(row * cols + col);
      }
    }
  }

  return perimeterWells;
};

export const randomizeWellAnnotations = <
  WellMetaT extends Record<string, string>,
>({
  plateSize,
  excludedWells,
  wellAnnotations,
}: {
  plateSize: number;
  excludedWells: number[];
  wellAnnotations: WellAnnotation<WellMetaT>[];
}): WellAnnotation<WellMetaT>[] => {
  const availableWells = Array.from({ length: plateSize }, (_, i) => i).filter(
    (well) => !excludedWells.includes(well),
  );
  const shuffledWells = availableWells.sort(() => Math.random() - 0.5);
  const shuffledWellMap = new Map<number, number>();
  const currentWells = new Set(
    wellAnnotations
      .flatMap((annotation) => annotation.wells)
      .filter((well) => !excludedWells.includes(well) || well >= plateSize),
  );
  currentWells.forEach((well) => {
    const destinationWell = shuffledWells.pop();
    if (destinationWell === undefined) {
      throw new Error(
        `Failed to map well ${well} to a destination well. This is likely due to an invalid well index or excluded wells.`,
      );
    }
    shuffledWellMap.set(well, destinationWell);
  });

  return wellAnnotations.map((annotation) => ({
    ...annotation,
    wells: annotation.wells.map((well) => {
      if (excludedWells.includes(well)) {
        return well;
      }
      const destinationWell = shuffledWellMap.get(well);
      if (destinationWell === undefined) {
        throw new Error(
          `Failed to map well ${well} to a destination well. This is likely due to an invalid well index or excluded wells.`,
        );
      }
      return destinationWell;
    }),
  }));
};
export const getExcelLabelForWells = (
  wells: number[],
  plateSize: PlateSize,
): string => {
  const sortedWells = [...wells].sort((a, b) => a - b);
  const labels: string[] = [];
  let start = sortedWells[0];
  let prev = start;

  for (let i = 1; i <= sortedWells.length; i++) {
    if (i === sortedWells.length || sortedWells[i] !== prev + 1) {
      const startLabel = indexToExcelCell(start, plateSize);
      const endLabel = indexToExcelCell(prev, plateSize);
      labels.push(start === prev ? startLabel : `${startLabel}:${endLabel}`);
      start = sortedWells[i];
    }
    prev = sortedWells[i];
  }

  return labels.join(", ");
};
export const getColLabel = (col: number) => `${col + 1}`;
export const getRowLabel = (row: number) => {
  if (row <= 25) {
    return String.fromCharCode(65 + row);
  } else {
    const firstChar = String.fromCharCode(64 + Math.floor(row / 26));
    const secondChar = String.fromCharCode(65 + (row % 26));
    return `${firstChar}${secondChar}`;
  }
};

export const csvCellToIndex = (cell: string, plateSize: PlateSize) => {
  const { cols } = plateSizeToRowsCols(plateSize);
  const row = cell.charCodeAt(0) - 65;
  const col = parseInt(cell.slice(1)) - 1;
  return row * cols + col;
};

export const wellAnnotationsToList = (
  wellAnnotations: WellAnnotation<Record<string, string>>[],
  plateSize: PlateSize,
): WellAnnotationCSVRow[] => {
  const annotationMap = new Map<number, WellAnnotationCSVRow>();

  // Initialize the map with empty arrays for all wells
  for (let i = 0; i < plateSize; i++) {
    annotationMap.set(i, {
      Well: indexToExcelCell(i, plateSize),
      Annotations: "",
    });
  }

  // Populate the map with annotations
  wellAnnotations.map((annotation) => {
    annotation.wells.forEach((wellIndex) => {
      const prevAnnotations = annotationMap.get(wellIndex)?.Annotations
        ? `${annotationMap.get(wellIndex)?.Annotations} |`
        : "";
      const update = {
        ...annotationMap.get(wellIndex),
        Well: indexToExcelCell(wellIndex, plateSize),
        Annotations: `${prevAnnotations} ${annotation.label}`,
        ...annotation.metadata,
      };

      annotationMap.set(wellIndex, update);
    });
  });

  // Convert to the desired output format
  return Array.from(annotationMap, ([, record]) => {
    return record;
  });
};

export const wellAnnotationsToCSV = (
  wellAnnotations: WellAnnotation<Record<string, string>>[],
  plateSize: PlateSize,
) => {
  const { rows, cols } = plateSizeToRowsCols(plateSize);
  const plateMap: string[][] = Array(rows)
    .fill(null)
    .map(() => Array(cols).fill(""));
  Array.from({ length: rows }).forEach((_, i) => {
    Array.from({ length: cols }).forEach((_, j) => {
      const index = i * cols + j;
      const annotationsForWell = wellAnnotations.filter((ann) =>
        ann.wells.includes(index),
      );
      const annotationString = annotationsForWell.map((ann) => {
        const metadataString = Object.entries(ann.metadata ?? {})
          .map(([key, value]) => `${key}: ${value}`)
          .join("; ");
        const annStr = `${ann.label} (${metadataString})`;
        return annStr;
      });

      plateMap[i][j] = annotationString.join(" | ");
    });
  });

  const headerRow = Array(cols + 1)
    .fill(0)
    .map((_, i) => {
      if (i === 0) {
        return "idx";
      }
      return i;
    });
  const csvRows = [
    headerRow,
    ...plateMap.map((row, i) => [getRowLabel(i), ...row]),
  ];

  return csvRows.map((row) => row.join(",")).join("\n");
};

// Return a list of row labels for the given plate size
// e.g. for a 96-well plate, the row labels would be A-H
// and for a 384-well plate, the row labels would be A-P
export const getRowLabels = (plateSize: PlateSize) => {
  const { rows } = plateSizeToRowsCols(plateSize);
  return Array.from({ length: rows }, (_, i) => String.fromCharCode(65 + i));
};
