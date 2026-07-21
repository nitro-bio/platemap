import { describe, expect, test } from "vitest";
import { BLUE_STYLE, ORANGE_STYLE, type PlateSize } from "./schemas";
import {
  columnsToWells,
  csvCellToIndex,
  excelCellToIndex,
  getEdgeWells,
  getRowLabel,
  indexToExcelCell,
  plateSizeToRowsCols,
  randomizeWellAnnotations,
  rowsToWells,
  wellAnnotationsToCSV,
  wellAnnotationsToList,
} from "./utils";

const plateSizes: PlateSize[] = [24, 48, 96, 384, 1536];

describe("plate coordinates", () => {
  test.each(plateSizes)(
    "round trips every coordinate for %i wells",
    (plateSize) => {
      for (let index = 0; index < plateSize; index += 1) {
        expect(
          excelCellToIndex(indexToExcelCell(index, plateSize), plateSize),
        ).toBe(index);
      }
    },
  );

  test("accepts lowercase and multi-letter rows but rejects partial input", () => {
    expect(excelCellToIndex(" af48 ", 1536)).toBe(1535);
    expect(csvCellToIndex("AA1", 1536)).toBe(1248);
    expect(() => excelCellToIndex("A1 trailing", 96)).toThrow(
      "Invalid cell reference",
    );
    expect(excelCellToIndex("A13", 96)).toBeNull();
  });

  test("labels rows beyond Z", () => {
    expect(getRowLabel(25)).toBe("Z");
    expect(getRowLabel(26)).toBe("AA");
    expect(getRowLabel(31)).toBe("AF");
  });
});

describe("row, column, and edge helpers", () => {
  test.each(plateSizes)(
    "keeps all generated wells in range for %i",
    (plateSize) => {
      const { rows, cols } = plateSizeToRowsCols(plateSize);
      expect(
        rowsToWells({ plateSize, rows: [0, rows - 1, rows] }),
      ).toHaveLength(cols * 2);
      expect(
        columnsToWells({ plateSize, columns: [0, cols - 1, cols] }),
      ).toHaveLength(rows * 2);
      expect(
        getEdgeWells(plateSize).every((well) => well >= 0 && well < plateSize),
      ).toBe(true);
    },
  );

  test("validates rows against row count rather than column count", () => {
    expect(rowsToWells({ plateSize: 96, rows: [8] })).toEqual([]);
  });
});

describe("annotation randomization", () => {
  test("uses one deterministic mapping for shared wells", () => {
    const annotations = [
      { id: "1", wells: [1, 2, 3], label: "A", annotationStyle: ORANGE_STYLE },
      { id: "2", wells: [2, 3, 4], label: "B", annotationStyle: BLUE_STYLE },
    ];
    const result = randomizeWellAnnotations({
      plateSize: 96,
      excludedWells: [0],
      wellAnnotations: annotations,
      random: () => 0.25,
    });
    const mapping = new Map(
      result[0].wells.map((well, index) => [annotations[0].wells[index], well]),
    );
    expect(result[1].wells[0]).toBe(mapping.get(2));
    expect(result[1].wells[1]).toBe(mapping.get(3));
    expect(
      new Set(result.flatMap((annotation) => annotation.wells)).has(0),
    ).toBe(false);
  });

  test("rejects invalid source wells", () => {
    expect(() =>
      randomizeWellAnnotations({
        plateSize: 24,
        excludedWells: [],
        wellAnnotations: [
          { id: "1", wells: [24], label: "bad", annotationStyle: BLUE_STYLE },
        ],
      }),
    ).toThrow("outside the plate");
  });
});

describe("exports", () => {
  const annotations = [
    {
      id: "1",
      wells: [0],
      label: 'Control, "primary"',
      annotationStyle: BLUE_STYLE,
      metadata: { concentration: "5,000", active: true },
    },
  ];

  test("preserves typed metadata in well-wise rows", () => {
    expect(wellAnnotationsToList(annotations, 24)[0]).toMatchObject({
      Well: "A1",
      Annotations: 'Control, "primary"',
      concentration: "5,000",
      active: true,
    });
  });

  test("quotes commas and quotes in CSV", () => {
    expect(wellAnnotationsToCSV(annotations, 24)).toContain(
      '"Control, ""primary"" (concentration: 5,000; active: true)"',
    );
  });
});
