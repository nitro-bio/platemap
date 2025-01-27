import { parse } from "papaparse";
import { expect, test } from "vitest";
import { parseCSV, checkPlateFormat, CsvRow } from "./utilsCsv";

// Sample CSV strings
const validCsvString = `
idx,1,2,3,4,5,6,7,8,9,10,11,12
A,Treatment 1,Positive Control,Treatment 1,Positive Control,Treatment 1,Positive Control
B,Treatment 1,Positive Control,Treatment 1,Positive Control,Treatment 1,Positive Control
C,,,,,,,,,,,,
D,Treatment 1,Positive Control,Treatment 1,Positive Control,Treatment 1,Positive Control
E,Treatment 1,Positive Control,Treatment 1,Positive Control,Treatment 1,Positive Control
F,,,,,,,,,,,,
G,Treatment 1,Positive Control,Treatment 1,Positive Control,Treatment 1,Positive Control
H,Treatment 1,Positive Control,Treatment 1,Positive Control,Treatment 1,Positive Control
`.trim();

const invalidRowCsvString = `
idx,1,2,3,4,5,6,7,8,9,10,11,12
A,Treatment 1,Positive Control,Treatment 1,Positive Control,Treatment 1,Positive Control
B,Treatment 1,Positive Control,Treatment 1,Positive Control,Treatment 1,Positive Control
`.trim();

const invalidColCsvString = `
idx,1,2,3,4,5,6,7,8,9,10,11
A,Treatment 1,Positive Control,Treatment 1,Positive Control,Treatment 1,Positive Control
B,Treatment 1,Positive Control,Treatment 1,Positive Control,Treatment 1,Positive Control
`.trim();

test("checkPlateFormat returns true for valid format", () => {
  const parsedResults = parse<CsvRow>(validCsvString, {
    header: true,
    skipEmptyLines: true,
  });
  const data = parsedResults.data;
  expect(checkPlateFormat(data, 96)).toBe(true);
});

test("checkPlateFormat returns false for invalid row count", () => {
  const parsedResults = parse<CsvRow>(invalidRowCsvString, {
    header: true,
    skipEmptyLines: true,
  });
  const data = parsedResults.data;
  expect(checkPlateFormat(data, 96)).toBe(false);
});

test("checkPlateFormat returns false for invalid column count", () => {
  const parsedResults = parse<CsvRow>(invalidColCsvString, {
    header: true,
    skipEmptyLines: true,
  });
  const data = parsedResults.data;
  expect(checkPlateFormat(data, 96)).toBe(false);
});

test("parseCSV returns expected output for valid input", () => {
  const result = parseCSV(validCsvString, 96);
  expect(result).toEqual([
    {
      annotationStyle: {
        buttonClassName:
          "dark:bg-border-500 border-red-600 dark:text-red-50 text-red-900 font-semibold",
        colClassName: "dark:bg-red-400 bg-red-600",
        rowClassName: "dark:bg-red-400 bg-red-600",
        wellClassName: "dark:bg-red-500 bg-red-400",
      },
      id: "Treatment 1",
      label: "Treatment 1",
      wells: [
        0, 2, 4, 12, 14, 16, 36, 38, 40, 48, 50, 52, 72, 74, 76, 84, 86, 88,
      ],
    },
    {
      annotationStyle: {
        buttonClassName:
          "dark:border-blue-500 border-blue-600 dark:text-blue-50 text-blue-900 font-semibold",
        colClassName: "dark:bg-blue-400 bg-blue-600",
        rowClassName: "dark:bg-blue-400 bg-blue-600",
        wellClassName: "dark:bg-blue-500 bg-blue-400",
      },
      id: "Positive Control",
      label: "Positive Control",
      wells: [
        1, 3, 5, 13, 15, 17, 37, 39, 41, 49, 51, 53, 73, 75, 77, 85, 87, 89,
      ],
    },
  ]);
});

test("parseCSV returns expected output for valid input with 24 well plate", () => {
  const result = parseCSV(validCsvString, 24);
  expect(result).toEqual([
    {
      id: "Treatment 1",
      label: "Treatment 1",
      wells: [0, 2, 4, 6, 8, 10, 18, 20, 22],
      annotationStyle: {
        buttonClassName:
          "dark:bg-border-500 border-red-600 dark:text-red-50 text-red-900 font-semibold",
        colClassName: "dark:bg-red-400 bg-red-600",
        rowClassName: "dark:bg-red-400 bg-red-600",
        wellClassName: "dark:bg-red-500 bg-red-400",
      },
    },
    {
      id: "Positive Control",
      label: "Positive Control",
      wells: [1, 3, 5, 7, 9, 11, 19, 21, 23],
      annotationStyle: {
        buttonClassName:
          "dark:border-blue-500 border-blue-600 dark:text-blue-50 text-blue-900 font-semibold",
        colClassName: "dark:bg-blue-400 bg-blue-600",
        rowClassName: "dark:bg-blue-400 bg-blue-600",
        wellClassName: "dark:bg-blue-500 bg-blue-400",
      },
    },
  ]);
});
