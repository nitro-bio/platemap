import type {
  AnnotationMetadata,
  PlateSize,
  WellAnnotation,
  WellAnnotationCSVRow,
} from "./schemas";

const PLATE_DIMENSIONS: Record<PlateSize, { rows: number; cols: number }> = {
  24: { rows: 4, cols: 6 },
  48: { rows: 6, cols: 8 },
  96: { rows: 8, cols: 12 },
  384: { rows: 16, cols: 24 },
  1536: { rows: 32, cols: 48 },
};

export const plateSizeToRowsCols = (plateSize: PlateSize) => {
  const dimensions = PLATE_DIMENSIONS[plateSize];
  if (!dimensions) throw new Error(`Invalid number of wells ${plateSize}`);
  return dimensions;
};

export const getRowLabel = (row: number): string => {
  if (!Number.isInteger(row) || row < 0)
    throw new RangeError("Row must be non-negative");
  let value = row + 1;
  let label = "";
  while (value > 0) {
    value -= 1;
    label = String.fromCharCode(65 + (value % 26)) + label;
    value = Math.floor(value / 26);
  }
  return label;
};

export const getColLabel = (column: number): string => `${column + 1}`;

export const indexToExcelCell = (
  index: number,
  plateSize: PlateSize,
): string => {
  if (!Number.isInteger(index) || index < 0 || index >= plateSize) {
    throw new RangeError(
      `Well index ${index} is outside a ${plateSize}-well plate`,
    );
  }
  const { cols } = plateSizeToRowsCols(plateSize);
  return `${getRowLabel(Math.floor(index / cols))}${(index % cols) + 1}`;
};

export const excelCellToIndex = (
  cell: string,
  plateSize: PlateSize,
): number | null => {
  const match = /^([A-Za-z]+)([1-9]\d*)$/.exec(cell.trim());
  if (!match) throw new Error(`Invalid cell reference: ${cell}`);
  const { rows, cols } = plateSizeToRowsCols(plateSize);
  const row =
    match[1]
      .toUpperCase()
      .split("")
      .reduce(
        (value, character) => value * 26 + character.charCodeAt(0) - 64,
        0,
      ) - 1;
  const column = Number.parseInt(match[2], 10) - 1;
  if (row < 0 || row >= rows || column < 0 || column >= cols) return null;
  return row * cols + column;
};

export const csvCellToIndex = excelCellToIndex;

export const rowsToWells = ({
  plateSize,
  rows,
}: {
  plateSize: PlateSize;
  rows: number[];
}): number[] => {
  const { rows: rowCount, cols } = plateSizeToRowsCols(plateSize);
  return rows.flatMap((row) =>
    Number.isInteger(row) && row >= 0 && row < rowCount
      ? Array.from({ length: cols }, (_, column) => row * cols + column)
      : [],
  );
};

export const columnsToWells = ({
  plateSize,
  columns,
}: {
  plateSize: PlateSize;
  columns: number[];
}): number[] => {
  const { rows, cols } = plateSizeToRowsCols(plateSize);
  return columns.flatMap((column) =>
    Number.isInteger(column) && column >= 0 && column < cols
      ? Array.from({ length: rows }, (_, row) => row * cols + column)
      : [],
  );
};

/** Return the inclusive rectangular range between two zero-based wells. */
export const rangeToWells = ({
  plateSize,
  start,
  end,
}: {
  plateSize: PlateSize;
  start: number;
  end: number;
}): number[] => {
  if (
    !Number.isInteger(start) ||
    !Number.isInteger(end) ||
    start < 0 ||
    end < 0 ||
    start >= plateSize ||
    end >= plateSize
  ) {
    throw new RangeError("Range endpoint is outside the plate");
  }
  const { cols } = plateSizeToRowsCols(plateSize);
  const startRow = Math.floor(start / cols);
  const endRow = Math.floor(end / cols);
  const startColumn = start % cols;
  const endColumn = end % cols;
  const firstRow = Math.min(startRow, endRow);
  const lastRow = Math.max(startRow, endRow);
  const firstColumn = Math.min(startColumn, endColumn);
  const lastColumn = Math.max(startColumn, endColumn);
  const wells: number[] = [];
  for (let row = firstRow; row <= lastRow; row += 1) {
    for (let column = firstColumn; column <= lastColumn; column += 1) {
      wells.push(row * cols + column);
    }
  }
  return wells;
};

export const getEdgeWells = (plateSize: PlateSize): number[] => {
  const { rows, cols } = plateSizeToRowsCols(plateSize);
  return Array.from({ length: plateSize }, (_, index) => index).filter(
    (index) => {
      const row = Math.floor(index / cols);
      const column = index % cols;
      return (
        row === 0 || row === rows - 1 || column === 0 || column === cols - 1
      );
    },
  );
};

const shuffled = (values: number[], random: () => number): number[] => {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
};

export const randomizeWellAnnotations = <WellMetaT extends AnnotationMetadata>({
  plateSize,
  excludedWells,
  wellAnnotations,
  random = Math.random,
}: {
  plateSize: PlateSize;
  excludedWells: number[];
  wellAnnotations: WellAnnotation<WellMetaT>[];
  random?: () => number;
}): WellAnnotation<WellMetaT>[] => {
  const excluded = new Set(excludedWells);
  const sourceWells = [
    ...new Set(wellAnnotations.flatMap((annotation) => annotation.wells)),
  ];
  if (
    sourceWells.some(
      (well) => !Number.isInteger(well) || well < 0 || well >= plateSize,
    )
  ) {
    throw new RangeError("Annotations contain a well outside the plate");
  }
  const movableSources = sourceWells.filter((well) => !excluded.has(well));
  const destinations = shuffled(
    Array.from({ length: plateSize }, (_, index) => index).filter(
      (well) => !excluded.has(well),
    ),
    random,
  ).slice(0, movableSources.length);
  const destinationBySource = new Map(
    movableSources.map((source, index) => [source, destinations[index]]),
  );
  return wellAnnotations.map((annotation) => ({
    ...annotation,
    wells: annotation.wells.map(
      (well) => destinationBySource.get(well) ?? well,
    ),
  }));
};

export const getExcelLabelForWells = (
  wells: number[],
  plateSize: PlateSize,
): string => {
  if (wells.length === 0) return "";
  const sorted = [...new Set(wells)].sort((left, right) => left - right);
  const labels: string[] = [];
  let start = sorted[0];
  let previous = start;
  for (let index = 1; index <= sorted.length; index += 1) {
    const current = sorted[index];
    if (current !== previous + 1) {
      const startLabel = indexToExcelCell(start, plateSize);
      const endLabel = indexToExcelCell(previous, plateSize);
      labels.push(
        start === previous ? startLabel : `${startLabel}:${endLabel}`,
      );
      start = current;
    }
    previous = current;
  }
  return labels.join(", ");
};

export const wellAnnotationsToList = (
  wellAnnotations: WellAnnotation[],
  plateSize: PlateSize,
): WellAnnotationCSVRow[] => {
  const rows = Array.from({ length: plateSize }, (_, index) => ({
    Well: indexToExcelCell(index, plateSize),
    Annotations: "",
  }));
  for (const annotation of wellAnnotations) {
    for (const well of annotation.wells) {
      if (well < 0 || well >= plateSize) continue;
      const current = rows[well];
      current.Annotations = [current.Annotations, annotation.label]
        .filter(Boolean)
        .join(" | ");
      Object.assign(current, annotation.metadata ?? {});
    }
  }
  return rows;
};

const csvCell = (value: string | number): string => {
  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export const wellAnnotationsToCSV = (
  wellAnnotations: WellAnnotation[],
  plateSize: PlateSize,
): string => {
  const { rows, cols } = plateSizeToRowsCols(plateSize);
  const annotationsByWell = new Map<number, WellAnnotation[]>();
  for (const annotation of wellAnnotations) {
    for (const well of annotation.wells) {
      const current = annotationsByWell.get(well) ?? [];
      annotationsByWell.set(well, [...current, annotation]);
    }
  }
  const csvRows: Array<Array<string | number>> = [
    ["idx", ...Array.from({ length: cols }, (_, index) => index + 1)],
  ];
  for (let row = 0; row < rows; row += 1) {
    const cells = Array.from({ length: cols }, (_, column) => {
      const annotations = annotationsByWell.get(row * cols + column) ?? [];
      return annotations
        .map((annotation) => {
          const metadata = Object.entries(annotation.metadata ?? {})
            .map(([key, value]) => `${key}: ${value ?? ""}`)
            .join("; ");
          return metadata
            ? `${annotation.label} (${metadata})`
            : annotation.label;
        })
        .join(" | ");
    });
    csvRows.push([getRowLabel(row), ...cells]);
  }
  return csvRows.map((row) => row.map(csvCell).join(",")).join("\n");
};

export const getRowLabels = (plateSize: PlateSize): string[] => {
  const { rows } = plateSizeToRowsCols(plateSize);
  return Array.from({ length: rows }, (_, index) => getRowLabel(index));
};
