import { useMemo, useReducer } from "react";

import type {
  AnnotationMetadata,
  PlateSelection,
  PlateSize,
  WellAnnotation,
} from "../schemas";
import { type PlateState, plateReducer, validatePlateState } from "../state";

export type { PlateAction, PlateState } from "../state";

export interface PlateActions<WellMetaT extends AnnotationMetadata> {
  setPlateSize: (size: PlateSize) => void;
  setWellAnnotations: (annotations: WellAnnotation<WellMetaT>[]) => void;
  setActiveWellAnnotation: (
    annotation: WellAnnotation<WellMetaT> | null,
  ) => void;
  setSelectionWithExcluded: (args: {
    selection: PlateSelection | null;
    excludedWells: number[];
  }) => void;
  setExcludedWells: (wells: number[]) => void;
  setPlateState: (newState: PlateState<WellMetaT>) => void;
}

export interface UsePlateParams<WellMetaT extends AnnotationMetadata> {
  initialPlateSize: PlateSize;
  initialWellAnnotations?: WellAnnotation<WellMetaT>[];
  initialSelection?: PlateSelection;
  initialExcludedWells?: number[];
}

export const usePlateReducer = <WellMetaT extends AnnotationMetadata>({
  initialPlateSize,
  initialWellAnnotations,
  initialSelection,
  initialExcludedWells,
}: UsePlateParams<WellMetaT>): {
  plateState: PlateState<WellMetaT>;
  plateActions: PlateActions<WellMetaT>;
} => {
  const initialState = useMemo(
    () =>
      validatePlateState<WellMetaT>({
        plateSize: initialPlateSize,
        wellAnnotations: initialWellAnnotations ?? [],
        activeWellAnnotation: null,
        selection: initialSelection ?? null,
        excludedWells: initialExcludedWells ?? [],
      }),
    [
      initialExcludedWells,
      initialPlateSize,
      initialSelection,
      initialWellAnnotations,
    ],
  );

  const [state, dispatch] = useReducer(plateReducer<WellMetaT>, initialState);
  return {
    plateState: state,
    plateActions: {
      setPlateSize: (size) =>
        dispatch({ type: "SET_PLATE_SIZE", payload: size }),
      setWellAnnotations: (annotations) =>
        dispatch({ type: "SET_WELL_ANNOTATIONS", payload: annotations }),
      setActiveWellAnnotation: (annotation) =>
        dispatch({ type: "SET_ACTIVE_WELL_ANNOTATION", payload: annotation }),
      setSelectionWithExcluded: (args) =>
        dispatch({ type: "SET_SELECTION_WITH_EXCLUDED", payload: args }),
      setExcludedWells: (wells) =>
        dispatch({ type: "SET_EXCLUDED_WELLS", payload: wells }),
      setPlateState: (newState) =>
        dispatch({ type: "SET_PLATE_STATE", payload: newState }),
    },
  };
};
