import { z } from "zod";

import type { PlateState } from "./hooks/usePlateReducer";
import {
  ANNOTATION_STYLES,
  type AnnotationMetadata,
  type AnnotationStyle,
  type PlateLayer,
  type PlateSize,
  type WellAnnotation,
} from "./schemas";

export type GenerateId = () => string;

export interface PlateDocumentV1<
  WellMetaT extends Record<string, unknown> = AnnotationMetadata,
> {
  schemaVersion: 1;
  plateSize: PlateSize;
  excludedWells: number[];
  layers: PlateLayer<WellMetaT>[];
}

const plateSizeSchema = z.union([
  z.literal(24),
  z.literal(48),
  z.literal(96),
  z.literal(384),
  z.literal(1536),
]);
const metadataValueSchema = z.union([
  z.string(),
  z.number().finite(),
  z.boolean(),
  z.null(),
]);
const metadataSchema = z.record(z.string(), metadataValueSchema);
const annotationStyleSchema = z
  .object({
    id: z.string(),
    color: z.enum([
      "blue",
      "cyan",
      "gray",
      "green",
      "orange",
      "purple",
      "red",
      "yellow",
    ]),
  })
  .superRefine((style, context) => {
    const known = ANNOTATION_STYLES.find((item) => item.id === style.id);
    if (!known || known.color !== style.color) {
      context.addIssue({
        code: "custom",
        message: `Unknown annotation style ${style.id}`,
      });
    }
  });

const annotationSchema = z.object({
  id: z.string().uuid(),
  wells: z
    .array(z.number().int())
    .refine((items) => new Set(items).size === items.length, {
      message: "Annotation wells must be unique",
    }),
  label: z.string().trim().min(1),
  annotationStyle: annotationStyleSchema,
  className: z.string().optional(),
  metadata: metadataSchema.optional(),
});

const layerSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1, "Layer name cannot be blank"),
  annotations: z.array(annotationSchema),
});

const documentBaseSchema = z.object({
  schemaVersion: z.literal(1),
  plateSize: plateSizeSchema,
  excludedWells: z
    .array(z.number().int())
    .refine(
      (items) => new Set(items).size === items.length,
      "Excluded wells must be unique",
    ),
  layers: z
    .array(layerSchema)
    .min(1, "A plate must contain at least one layer"),
});

function validateDurableState(
  value: z.infer<typeof documentBaseSchema>,
  context: z.RefinementCtx,
): void {
  const ids = new Set<string>();
  const checkId = (id: string, path: (string | number)[]) => {
    if (ids.has(id)) {
      context.addIssue({
        code: "custom",
        path,
        message: `Duplicate UUID ${id}`,
      });
    }
    ids.add(id);
  };
  for (const well of value.excludedWells) {
    if (well < 0 || well >= value.plateSize) {
      context.addIssue({
        code: "custom",
        path: ["excludedWells"],
        message: `Excluded well ${well} is outside the plate`,
      });
    }
  }
  value.layers.forEach((layer, layerIndex) => {
    checkId(layer.id, ["layers", layerIndex, "id"]);
    layer.annotations.forEach((annotation, annotationIndex) => {
      checkId(annotation.id, [
        "layers",
        layerIndex,
        "annotations",
        annotationIndex,
        "id",
      ]);
      for (const well of annotation.wells) {
        if (well < 0 || well >= value.plateSize) {
          context.addIssue({
            code: "custom",
            path: [
              "layers",
              layerIndex,
              "annotations",
              annotationIndex,
              "wells",
            ],
            message: `Annotation well ${well} is outside the plate`,
          });
        }
      }
    });
  });
}

export const plateDocumentSchema =
  documentBaseSchema.superRefine(validateDurableState);

const selectionSchema = z.object({
  wells: z
    .array(z.number().int())
    .refine((items) => new Set(items).size === items.length, {
      message: "Selected wells must be unique",
    }),
  className: z.string().optional(),
});

const runtimeStateSchema = documentBaseSchema
  .omit({ schemaVersion: true })
  .extend({
    activeLayerId: z.string().uuid(),
    activeWellAnnotationId: z.string().uuid().nullable(),
    selection: selectionSchema.nullable(),
    viewMode: z.enum(["flat", "layers"]),
  })
  .superRefine((value, context) => {
    validateDurableState({ ...value, schemaVersion: 1 }, context);
    const activeLayer = value.layers.find(
      (layer) => layer.id === value.activeLayerId,
    );
    if (!activeLayer) {
      context.addIssue({
        code: "custom",
        path: ["activeLayerId"],
        message: "Active layer does not exist",
      });
    }
    if (
      value.activeWellAnnotationId &&
      !activeLayer?.annotations.some(
        (annotation) => annotation.id === value.activeWellAnnotationId,
      )
    ) {
      context.addIssue({
        code: "custom",
        path: ["activeWellAnnotationId"],
        message: "Active annotation does not belong to the active layer",
      });
    }
    for (const well of value.selection?.wells ?? []) {
      if (well < 0 || well >= value.plateSize) {
        context.addIssue({
          code: "custom",
          path: ["selection", "wells"],
          message: `Selected well ${well} is outside the plate`,
        });
      }
    }
  });

const legacyAnnotationSchema = annotationSchema.extend({ id: z.string() });
const legacyStateSchema = z
  .object({
    plateSize: plateSizeSchema,
    wellAnnotations: z.array(legacyAnnotationSchema),
    selection: selectionSchema.nullable().optional(),
    activeWellAnnotation: z.unknown().nullable().optional(),
    excludedWells: z.array(z.number().int()),
  })
  .superRefine((value, context) => {
    if (new Set(value.excludedWells).size !== value.excludedWells.length) {
      context.addIssue({
        code: "custom",
        path: ["excludedWells"],
        message: "Excluded wells must be unique",
      });
    }
    const allWells = [
      ...value.excludedWells,
      ...(value.selection?.wells ?? []),
      ...value.wellAnnotations.flatMap((annotation) => annotation.wells),
    ];
    if (allWells.some((well) => well < 0 || well >= value.plateSize)) {
      context.addIssue({
        code: "custom",
        message: "Legacy state contains a well outside the plate",
      });
    }
  });

export function defaultGenerateId(): string {
  return crypto.randomUUID();
}

export function generateValidId(generateId: GenerateId): string {
  const id = generateId();
  if (!z.string().uuid().safeParse(id).success) {
    throw new Error(`ID factory returned an invalid UUID: ${id}`);
  }
  return id;
}

export function parsePlateDocument(input: unknown): PlateDocumentV1 {
  return plateDocumentSchema.parse(input) as PlateDocumentV1;
}

export function parseRuntimePlateState<
  WellMetaT extends Record<string, unknown> = AnnotationMetadata,
>(input: unknown): PlateState<WellMetaT> {
  return runtimeStateSchema.parse(input) as PlateState<WellMetaT>;
}

export function plateStateToDocument<
  WellMetaT extends Record<string, unknown> = AnnotationMetadata,
>(state: PlateState<WellMetaT>): PlateDocumentV1<WellMetaT> {
  parseRuntimePlateState(state);
  return {
    schemaVersion: 1,
    plateSize: state.plateSize,
    excludedWells: state.excludedWells,
    layers: state.layers,
  };
}

export function plateDocumentToJSON<
  WellMetaT extends Record<string, unknown> = AnnotationMetadata,
>(
  document: PlateDocumentV1<WellMetaT> | PlateState<WellMetaT>,
  space = 2,
): string {
  const durable =
    "schemaVersion" in document
      ? parsePlateDocument(document)
      : plateStateToDocument(document);
  return JSON.stringify(durable, null, space);
}

export function documentToPlateState<
  WellMetaT extends Record<string, unknown> = AnnotationMetadata,
>(document: PlateDocumentV1<WellMetaT>): PlateState<WellMetaT> {
  const parsed = parsePlateDocument(document) as PlateDocumentV1<WellMetaT>;
  return parseRuntimePlateState({
    plateSize: parsed.plateSize,
    excludedWells: parsed.excludedWells,
    layers: parsed.layers,
    activeLayerId: parsed.layers[0].id,
    activeWellAnnotationId: null,
    selection: null,
    viewMode: "flat",
  });
}

export function migrateLegacyPlateState<
  WellMetaT extends Record<string, unknown> = AnnotationMetadata,
>(
  input: unknown,
  options: { generateId?: GenerateId } = {},
): PlateState<WellMetaT> {
  const legacy = legacyStateSchema.parse(input);
  const generateId = options.generateId ?? defaultGenerateId;
  const layerId = generateValidId(generateId);
  const annotations = legacy.wellAnnotations.map((annotation) => ({
    ...annotation,
    id: generateValidId(generateId),
  })) as WellAnnotation<WellMetaT>[];
  return parseRuntimePlateState({
    plateSize: legacy.plateSize,
    layers: [{ id: layerId, name: "Layer 1", annotations }],
    activeLayerId: layerId,
    activeWellAnnotationId: null,
    selection: legacy.selection ?? null,
    excludedWells: legacy.excludedWells,
    viewMode: "flat",
  });
}

export function parsePlateState<
  WellMetaT extends Record<string, unknown> = AnnotationMetadata,
>(
  input: unknown,
  options: { generateId?: GenerateId } = {},
): PlateState<WellMetaT> {
  if (input !== null && typeof input === "object" && "schemaVersion" in input) {
    return documentToPlateState(
      parsePlateDocument(input) as PlateDocumentV1<WellMetaT>,
    );
  }
  return migrateLegacyPlateState<WellMetaT>(input, options);
}

export function annotationStyleForColor(color: string): AnnotationStyle | null {
  return (
    ANNOTATION_STYLES.find((style) => style.color === color.toLowerCase()) ??
    null
  );
}
