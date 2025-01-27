import { parse } from "papaparse";
import { PlateSize, WellAnnotation, ANNOTATION_STYLES } from "./schemas";
import {
  excelCellToIndex,
  plateSizeToRowsCols,
  getRowLabels,
  getRowLabel,
} from "./utils";

// Type definitions
export interface CsvRow {
  idx: string;
  [key: string]: string | undefined;
}

// Function to check the plate format
export const checkPlateFormat = (
  data: CsvRow[],
  plateSize: PlateSize,
): boolean => {
  const { rows } = plateSizeToRowsCols(plateSize);
  // Check for the correct number of rows
  if (data.length !== rows) {
    return false;
  }

  // Check for valid row labels
  const validRowLabels = getRowLabels(plateSize);
  for (const row of data) {
    if (!validRowLabels.includes(row.idx)) {
      return false;
    }
  }

  return true;
};

export const parseCSV = <WellMetaT extends Record<string, string>>(
  csvString: string,
  plateSize: PlateSize,
): WellAnnotation<WellMetaT>[] => {
  const parsedResults = parse<CsvRow>(csvString, {
    header: true,
    skipEmptyLines: true,
  });
  const data = parsedResults.data;
  if (!checkPlateFormat(data, plateSize)) {
    console.debug(`Invalid plate format, expected ${plateSize} wells and got:`);
    console.debug(data);
  }

  const annMap: Record<string, WellAnnotation<WellMetaT>> = {};
  let unAssignedStyles = [...ANNOTATION_STYLES];
  data.forEach((row, i) => {
    const rowLabel = getRowLabel(i);
    Object.entries(row)
      .filter(([col, value]) => col !== "idx" && value)
      .forEach(([col, value]) => {
        const excelId = `${rowLabel}${col}`;
        const wellIndex = excelCellToIndex(excelId, plateSize);
        if (wellIndex === null) {
          console.debug(
            `Skipping well ${excelId} because it's outside of plate of size ${plateSize}`,
          );
        } else {
          const annLabels = (value ?? "").split(" | ");
          annLabels.forEach((annLabel) => {
            if (!annMap[annLabel]) {
              if (unAssignedStyles.length === 0) {
                unAssignedStyles = [...ANNOTATION_STYLES];
              }
              const style = unAssignedStyles.pop();
              annMap[annLabel] = {
                id: annLabel,
                label: annLabel,
                annotationStyle: style!,
                wells: [wellIndex],
              };
            } else {
              annMap[annLabel].wells.push(wellIndex);
            }
          });
        }
      });
  });

  return Object.values(annMap);
};
