import {
  ANNOTATION_STYLES,
  type AnnotationMetadata,
  type PlateLayer,
  type PlateSize,
  type WellAnnotation,
} from "./schemas";
import { excelCellToIndex, indexToExcelCell } from "./utils";
import {
  annotationStyleForColor,
  defaultGenerateId,
  type GenerateId,
  generateValidId,
} from "./validation";

const REQUIRED_HEADERS = ["Well", "Annotation"] as const;
const RESERVED_HEADERS = new Set([
  ...REQUIRED_HEADERS,
  "Annotation Key",
  "Color",
]);

function parseCSVRows(csv: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < csv.length; index += 1) {
    const character = csv[index];
    if (quoted) {
      if (character === '"' && csv[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        cell += character;
      }
    } else if (character === '"') {
      if (cell.length > 0)
        throw new Error(`CSV row ${rows.length + 1} has an unexpected quote`);
      quoted = true;
    } else if (character === ",") {
      row.push(cell);
      cell = "";
    } else if (character === "\n" || character === "\r") {
      if (character === "\r" && csv[index + 1] === "\n") index += 1;
      row.push(cell);
      if (row.some((value) => value.length > 0)) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += character;
    }
  }
  if (quoted) throw new Error("CSV contains an unterminated quoted value");
  row.push(cell);
  if (row.some((value) => value.length > 0)) rows.push(row);
  return rows;
}

function inferMetadataValue(value: string): string | number | boolean {
  const trimmed = value.trim();
  if (/^(true|false)$/i.test(trimmed)) return trimmed.toLowerCase() === "true";
  if (/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(trimmed)) {
    const number = Number(trimmed);
    if (Number.isFinite(number)) return number;
  }
  return value;
}

function stableMetadata(metadata: AnnotationMetadata): string {
  return JSON.stringify(
    Object.entries(metadata).sort(([left], [right]) =>
      left.localeCompare(right),
    ),
  );
}

export function parseLayerCSV<
  WellMetaT extends Record<string, unknown> = AnnotationMetadata,
>(
  csv: string,
  options: { plateSize: PlateSize; generateId?: GenerateId },
): WellAnnotation<WellMetaT>[] {
  const rows = parseCSVRows(csv);
  if (rows.length === 0) throw new Error("CSV is empty");
  const headers = rows[0].map((header) => header.trim());
  if (new Set(headers).size !== headers.length)
    throw new Error("CSV contains duplicate columns");
  for (const required of REQUIRED_HEADERS) {
    if (!headers.includes(required))
      throw new Error(`CSV is missing required column ${required}`);
  }
  const headerIndex = new Map(headers.map((header, index) => [header, index]));
  const metadataHeaders = headers.filter(
    (header) => !RESERVED_HEADERS.has(header),
  );
  const generateId = options.generateId ?? defaultGenerateId;
  type Group = {
    id: string;
    label: string;
    color: string | null;
    metadata: AnnotationMetadata;
    wells: Set<number>;
    firstRow: number;
  };
  const groups = new Map<string, Group>();

  rows.slice(1).forEach((values, rowOffset) => {
    const rowNumber = rowOffset + 2;
    if (values.length > headers.length)
      throw new Error(`CSV row ${rowNumber} has too many columns`);
    const get = (header: string) => values[headerIndex.get(header) ?? -1] ?? "";
    const wellText = get("Well").trim();
    const label = get("Annotation").trim();
    if (!wellText) throw new Error(`CSV row ${rowNumber}, Well is required`);
    if (!label) throw new Error(`CSV row ${rowNumber}, Annotation is required`);
    let well: number | null;
    try {
      well = excelCellToIndex(wellText, options.plateSize);
    } catch {
      throw new Error(
        `CSV row ${rowNumber}, Well contains invalid coordinate ${wellText}`,
      );
    }
    if (well === null)
      throw new Error(
        `CSV row ${rowNumber}, Well ${wellText} is outside the plate`,
      );
    const colorText = get("Color").trim().toLowerCase();
    if (colorText && !annotationStyleForColor(colorText)) {
      throw new Error(`CSV row ${rowNumber}, Color ${colorText} is invalid`);
    }
    const metadata: AnnotationMetadata = {};
    for (const header of metadataHeaders) {
      const value = get(header);
      if (value !== "") metadata[header] = inferMetadataValue(value);
    }
    const explicitKey = get("Annotation Key").trim();
    const groupKey = explicitKey
      ? `key:${explicitKey}`
      : `implicit:${label}\u0000${colorText}\u0000${stableMetadata(metadata)}`;
    const existing = groups.get(groupKey);
    if (existing) {
      if (
        existing.label !== label ||
        existing.color !== (colorText || null) ||
        stableMetadata(existing.metadata) !== stableMetadata(metadata)
      ) {
        throw new Error(
          `CSV row ${rowNumber} conflicts with Annotation Key ${explicitKey}`,
        );
      }
      existing.wells.add(well);
    } else {
      groups.set(groupKey, {
        id: generateValidId(generateId),
        label,
        color: colorText || null,
        metadata,
        wells: new Set([well]),
        firstRow: rowNumber,
      });
    }
  });

  let omittedColorIndex = 0;
  return [...groups.values()]
    .sort((left, right) => left.firstRow - right.firstRow)
    .map((group) => {
      const explicitStyle = group.color
        ? annotationStyleForColor(group.color)
        : null;
      if (group.color && !explicitStyle) {
        throw new Error(`CSV contains invalid color ${group.color}`);
      }
      const annotationStyle =
        explicitStyle ??
        ANNOTATION_STYLES[omittedColorIndex++ % ANNOTATION_STYLES.length];
      return {
        id: group.id,
        label: group.label,
        wells: [...group.wells],
        annotationStyle,
        metadata: group.metadata,
      };
    }) as WellAnnotation<WellMetaT>[];
}

function csvCell(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function layerToCSV<
  WellMetaT extends Record<string, unknown> = AnnotationMetadata,
>(
  layer: PlateLayer<WellMetaT> | WellAnnotation<WellMetaT>[],
  plateSize: PlateSize,
): string {
  const annotations = Array.isArray(layer) ? layer : layer.annotations;
  const metadataHeaders = [
    ...new Set(
      annotations.flatMap((annotation) =>
        Object.keys(annotation.metadata ?? {}),
      ),
    ),
  ];
  const rows: unknown[][] = [
    ["Well", "Annotation", "Annotation Key", "Color", ...metadataHeaders],
  ];
  for (const annotation of annotations) {
    for (const well of annotation.wells) {
      rows.push([
        indexToExcelCell(well, plateSize),
        annotation.label,
        annotation.id,
        annotation.annotationStyle.color,
        ...metadataHeaders.map((header) => annotation.metadata?.[header] ?? ""),
      ]);
    }
  }
  return rows.map((row) => row.map(csvCell).join(",")).join("\n");
}
