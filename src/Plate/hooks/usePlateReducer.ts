import { useMemo, useReducer } from "react";

import { PlateSelection, PlateSize, WellAnnotation } from "../schemas";

import { parseCSV } from "../utilsCsv";

export interface PlateState<WellMetaT extends Record<string, string>> {
  plateSize: PlateSize;
  wellAnnotations: WellAnnotation<WellMetaT>[];
  selection: PlateSelection | null;
  activeWellAnnotation: WellAnnotation<WellMetaT> | null;
  excludedWells: number[];
}

export interface PlateActions<WellMetaT extends Record<string, string>> {
  setPlateSize: (size: PlateSize) => void;
  setWellAnnotations: (anns: WellAnnotation<WellMetaT>[]) => void;
  setActiveWellAnnotation: (ann: WellAnnotation<WellMetaT> | null) => void;
  setSelectionWithExcluded: (args: {
    selection: PlateSelection | null;
    excludedWells: number[];
  }) => void;
  setExcludedWells: (wells: number[]) => void;
  setPlateState: (newState: PlateState<WellMetaT>) => void;
}

export interface UsePlateParams<WellMetaT extends Record<string, string>> {
  initialPlateSize: PlateSize;
  initialCSV?: string | null;
  initialWellAnnotations?: WellAnnotation<WellMetaT>[];
  initialSelection?: PlateSelection;
  initialExcludedWells?: number[];
}

type Action<WellMetaT extends Record<string, string>> =
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

function plateReducer<WellMetaT extends Record<string, string>>(
  state: PlateState<WellMetaT>,
  action: Action<WellMetaT>,
): PlateState<WellMetaT> {
  switch (action.type) {
    case "SET_PLATE_SIZE":
      return { ...state, plateSize: action.payload };
    case "SET_WELL_ANNOTATIONS":
      return { ...state, wellAnnotations: action.payload };
    case "SET_ACTIVE_WELL_ANNOTATION":
      return { ...state, activeWellAnnotation: action.payload };
    case "SET_SELECTION_WITH_EXCLUDED": {
      const { selection, excludedWells } = action.payload;
      const removed = selection?.wells.filter(
        (well) => !excludedWells.includes(well),
      );
      const newSelection = removed ? { ...selection, wells: removed } : null;
      return { ...state, selection: newSelection, excludedWells };
    }
    case "SET_EXCLUDED_WELLS":
      return { ...state, excludedWells: action.payload };
    case "SET_PLATE_STATE":
      return action.payload;
    default:
      return state;
  }
}

export const usePlateReducer = <WellMetaT extends Record<string, string>>({
  initialPlateSize,
  initialCSV,
  initialWellAnnotations,
  initialSelection,
  initialExcludedWells,
}: UsePlateParams<WellMetaT>): {
  plateState: PlateState<WellMetaT>;
  plateActions: PlateActions<WellMetaT>;
} => {
  const newWellAnnotations = useMemo(() => {
    if (initialWellAnnotations && initialCSV) {
      throw Error("Both initialWellAnnotations and initialCSV were provided.");
    }

    if (initialWellAnnotations) {
      return initialWellAnnotations;
    }

    if (initialCSV) {
      return parseCSV<WellMetaT>(initialCSV, initialPlateSize);
    }
    return [];
  }, []);

  const initialState: PlateState<WellMetaT> = {
    plateSize: initialPlateSize,
    wellAnnotations: newWellAnnotations,
    activeWellAnnotation: null,
    selection: initialSelection || null,
    excludedWells: initialExcludedWells || [],
  };

  const [state, dispatch] = useReducer(plateReducer<WellMetaT>, initialState);
  return {
    plateState: state,
    plateActions: {
      setPlateSize: (size: PlateSize) =>
        dispatch({ type: "SET_PLATE_SIZE", payload: size }),
      setWellAnnotations: (anns: WellAnnotation<WellMetaT>[]) =>
        dispatch({ type: "SET_WELL_ANNOTATIONS", payload: anns }),
      setActiveWellAnnotation: (ann: WellAnnotation<WellMetaT> | null) =>
        dispatch({ type: "SET_ACTIVE_WELL_ANNOTATION", payload: ann }),
      setSelectionWithExcluded: (args: {
        selection: PlateSelection | null;
        excludedWells: number[];
      }) => dispatch({ type: "SET_SELECTION_WITH_EXCLUDED", payload: args }),
      setExcludedWells: (wells: number[]) =>
        dispatch({ type: "SET_EXCLUDED_WELLS", payload: wells }),
      setPlateState: (newState: PlateState<WellMetaT>) =>
        dispatch({ type: "SET_PLATE_STATE", payload: newState }),
    },
  };
};
