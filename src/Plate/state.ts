import type {
  AnnotationMetadata,
  PlateSelection,
  PlateSize,
  WellAnnotation,
} from "./schemas";

export interface PlateState<WellMetaT extends AnnotationMetadata> {
  plateSize: PlateSize;
  wellAnnotations: WellAnnotation<WellMetaT>[];
  selection: PlateSelection | null;
  activeWellAnnotation: WellAnnotation<WellMetaT> | null;
  excludedWells: number[];
}

export type PlateAction<WellMetaT extends AnnotationMetadata> =
  | { type: "SET_PLATE_SIZE"; payload: PlateSize }
  | { type: "SET_WELL_ANNOTATIONS"; payload: WellAnnotation<WellMetaT>[] }
  | {
      type: "SET_ACTIVE_WELL_ANNOTATION";
      payload: WellAnnotation<WellMetaT> | null;
    }
  | {
      type: "SET_SELECTION_WITH_EXCLUDED";
      payload: { selection: PlateSelection | null; excludedWells: number[] };
    }
  | { type: "SET_EXCLUDED_WELLS"; payload: number[] }
  | { type: "SET_PLATE_STATE"; payload: PlateState<WellMetaT> };

const validWell = (well: number, plateSize: PlateSize): boolean =>
  Number.isInteger(well) && well >= 0 && well < plateSize;

const assertWells = (
  wells: number[],
  plateSize: PlateSize,
  description: string,
): void => {
  if (new Set(wells).size !== wells.length) {
    throw new RangeError(`${description} must be unique`);
  }
  if (wells.some((well) => !validWell(well, plateSize))) {
    throw new RangeError(`${description} contain a well outside the plate`);
  }
};

export const validatePlateState = <WellMetaT extends AnnotationMetadata>(
  state: PlateState<WellMetaT>,
): PlateState<WellMetaT> => {
  assertWells(state.excludedWells, state.plateSize, "Excluded wells");
  const annotationIds = state.wellAnnotations.map(
    (annotation) => annotation.id,
  );
  if (new Set(annotationIds).size !== annotationIds.length) {
    throw new Error("Annotation IDs must be unique");
  }
  for (const annotation of state.wellAnnotations) {
    if (!annotation.label.trim()) {
      throw new Error("Annotation labels cannot be empty");
    }
    assertWells(annotation.wells, state.plateSize, "Annotation wells");
    for (const value of Object.values(annotation.metadata ?? {})) {
      if (
        value !== null &&
        typeof value !== "string" &&
        typeof value !== "number" &&
        typeof value !== "boolean"
      ) {
        throw new TypeError("Annotation metadata values must be scalar");
      }
    }
  }
  if (state.selection) {
    assertWells(state.selection.wells, state.plateSize, "Selected wells");
  }
  return state;
};

export const resizePlateState = <WellMetaT extends AnnotationMetadata>(
  state: PlateState<WellMetaT>,
  plateSize: PlateSize,
  strategy: "reject" | "remove-out-of-range" = "reject",
): PlateState<WellMetaT> => {
  const hasOutOfRangeContent =
    state.excludedWells.some((well) => !validWell(well, plateSize)) ||
    state.wellAnnotations.some((annotation) =>
      annotation.wells.some((well) => !validWell(well, plateSize)),
    );
  if (hasOutOfRangeContent && strategy === "reject") {
    throw new RangeError("Plate resize would remove placed content");
  }
  const selectionWells = state.selection?.wells.filter((well) =>
    validWell(well, plateSize),
  );
  return validatePlateState({
    ...state,
    plateSize,
    excludedWells: state.excludedWells.filter((well) =>
      validWell(well, plateSize),
    ),
    wellAnnotations: state.wellAnnotations.map((annotation) => ({
      ...annotation,
      wells: annotation.wells.filter((well) => validWell(well, plateSize)),
    })),
    selection:
      state.selection && selectionWells?.length
        ? { ...state.selection, wells: selectionWells }
        : null,
  });
};

export const plateReducer = <WellMetaT extends AnnotationMetadata>(
  state: PlateState<WellMetaT>,
  action: PlateAction<WellMetaT>,
): PlateState<WellMetaT> => {
  switch (action.type) {
    case "SET_PLATE_SIZE":
      return resizePlateState(state, action.payload);
    case "SET_WELL_ANNOTATIONS":
      return validatePlateState({ ...state, wellAnnotations: action.payload });
    case "SET_ACTIVE_WELL_ANNOTATION":
      return { ...state, activeWellAnnotation: action.payload };
    case "SET_SELECTION_WITH_EXCLUDED": {
      const { selection, excludedWells } = action.payload;
      const allowed = selection?.wells.filter(
        (well) => !excludedWells.includes(well),
      );
      return validatePlateState({
        ...state,
        selection: allowed?.length ? { ...selection, wells: allowed } : null,
        excludedWells,
      });
    }
    case "SET_EXCLUDED_WELLS": {
      const allowed = state.selection?.wells.filter(
        (well) => !action.payload.includes(well),
      );
      return validatePlateState({
        ...state,
        selection:
          state.selection && allowed?.length
            ? { ...state.selection, wells: allowed }
            : null,
        excludedWells: action.payload,
      });
    }
    case "SET_PLATE_STATE":
      return validatePlateState(action.payload);
  }
};
