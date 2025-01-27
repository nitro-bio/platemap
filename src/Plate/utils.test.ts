import { expect, test } from "vitest";
import {
  rowsToWells,
  columnsToWells,
  getEdgeWells,
  randomizeWellAnnotations,
} from "./utils";
import { BLUE_STYLE, ORANGE_STYLE, WellAnnotation } from "./schemas";

test("rowsToWells - 96 well plate - single row", () => {
  expect(rowsToWells({ plateSize: 96, rows: [0] })).toEqual([
    0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11,
  ]);
});

test("rowsToWells - 96 well plate - multiple rows", () => {
  expect(rowsToWells({ plateSize: 96, rows: [0, 2, 4] })).toEqual([
    0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 24, 25, 26, 27, 28, 29, 30, 31, 32,
    33, 34, 35, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59,
  ]);
});

test("rowsToWells - 384 well plate - single row", () => {
  expect(rowsToWells({ plateSize: 384, rows: [0] })).toEqual([
    0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
    21, 22, 23,
  ]);
});

test("rowsToWells - 384 well plate - multiple rows", () => {
  expect(rowsToWells({ plateSize: 384, rows: [0, 1] })).toEqual([
    0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
    21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39,
    40, 41, 42, 43, 44, 45, 46, 47,
  ]);
});

test("rowsToWells - unsupported plate size", () => {
  // @ts-expect-error expect 100 to be invalid
  expect(() => rowsToWells({ plateSize: 100, rows: [1] })).toThrow(
    "Invalid number of wells",
  );
});

test("columnsToWells - 96 well plate - single column", () => {
  expect(columnsToWells({ plateSize: 96, columns: [0] })).toEqual([
    0, 12, 24, 36, 48, 60, 72, 84,
  ]);
});

test("columnsToWells - 96 well plate - multiple columns", () => {
  expect(columnsToWells({ plateSize: 96, columns: [0, 2, 4] })).toEqual([
    0, 12, 24, 36, 48, 60, 72, 84, 2, 14, 26, 38, 50, 62, 74, 86, 4, 16, 28, 40,
    52, 64, 76, 88,
  ]);
});

test("columnsToWells - 384 well plate - single column", () => {
  expect(columnsToWells({ plateSize: 384, columns: [0] })).toEqual([
    0, 24, 48, 72, 96, 120, 144, 168, 192, 216, 240, 264, 288, 312, 336, 360,
  ]);
});

test("columnsToWells - 384 well plate - multiple columns", () => {
  expect(columnsToWells({ plateSize: 384, columns: [0, 1] })).toEqual([
    0, 24, 48, 72, 96, 120, 144, 168, 192, 216, 240, 264, 288, 312, 336, 360, 1,
    25, 49, 73, 97, 121, 145, 169, 193, 217, 241, 265, 289, 313, 337, 361,
  ]);
});

test("columnsToWells - unsupported plate size", () => {
  // @ts-expect-error expect 100 to be invalid
  expect(() => columnsToWells({ plateSize: 100, columns: [0] })).toThrow(
    "Invalid number of wells",
  );
});

test("getEdgeWells - 24 well plate", () => {
  expect(getEdgeWells(24)).toEqual([
    0, 1, 2, 3, 4, 5, 6, 11, 12, 17, 18, 19, 20, 21, 22, 23,
  ]);
});

test("getEdgeWells - 48 well plate", () => {
  expect(getEdgeWells(48)).toEqual([
    0, 1, 2, 3, 4, 5, 6, 7, 8, 15, 16, 23, 24, 31, 32, 39, 40, 41, 42, 43, 44,
    45, 46, 47,
  ]);
});

test("getEdgeWells - 96 well plate", () => {
  expect(getEdgeWells(96)).toEqual([
    0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 23, 24, 35, 36, 47, 48, 59, 60,
    71, 72, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95,
  ]);
});

test("getEdgeWells - unsupported plate size", () => {
  // @ts-expect-error expect 100 to be invalid
  expect(() => getEdgeWells(100)).toThrow("Invalid number of wells");
});

test("randomizeWellAnnotations shuffles consistently", () => {
  const plateSize = 96;
  const wellAnnotations: WellAnnotation<Record<string, never>>[] = [
    { id: "1", wells: [1, 2, 3], label: "A", annotationStyle: ORANGE_STYLE },
    { id: "2", wells: [2, 3, 4], label: "B", annotationStyle: BLUE_STYLE },
  ];

  let result = randomizeWellAnnotations({
    plateSize,
    excludedWells: [],
    wellAnnotations,
  });

  expect(result).toHaveLength(2);
  expect(result[0].wells).not.toEqual([1, 2, 3]);
  expect(result[1].wells).not.toEqual([2, 3, 4]);

  // Check for consistent mapping
  let map = new Map(
    result[0].wells.map((w, i) => [wellAnnotations[0].wells[i], w]),
  );
  expect(result[1].wells[0]).toBe(map.get(2));
  expect(result[1].wells[1]).toBe(map.get(3));
  result = randomizeWellAnnotations({
    plateSize,
    excludedWells: [],
    wellAnnotations,
  });

  expect(result).toHaveLength(2);
  expect(result[0].wells).not.toEqual([1, 2, 3]);
  expect(result[1].wells).not.toEqual([2, 3, 4]);

  // Check for consistent mapping
  map = new Map(
    result[0].wells.map((w, i) => [wellAnnotations[0].wells[i], w]),
  );
  expect(result[1].wells[0]).toBe(map.get(2));
  expect(result[1].wells[1]).toBe(map.get(3));
  result = randomizeWellAnnotations({
    plateSize,
    excludedWells: [],
    wellAnnotations,
  });

  expect(result).toHaveLength(2);
  expect(result[0].wells).not.toEqual([1, 2, 3]);
  expect(result[1].wells).not.toEqual([2, 3, 4]);

  // Check for consistent mapping
  map = new Map(
    result[0].wells.map((w, i) => [wellAnnotations[0].wells[i], w]),
  );
  expect(result[1].wells[0]).toBe(map.get(2));
  expect(result[1].wells[1]).toBe(map.get(3));
  // expect none of the wells to be null
  expect(result[0].wells).not.toContain(null);
});
