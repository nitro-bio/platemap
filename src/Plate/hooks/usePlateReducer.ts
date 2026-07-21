import { useReducer, useRef } from "react";

import type {
  AnnotationMetadata,
  PlateLayer,
  PlateSelection,
  PlateSize,
  PlateViewMode,
  WellAnnotation,
} from "../schemas";
import {
  defaultGenerateId,
  generateValidId,
  parseRuntimePlateState,
  type GenerateId,
} from "../validation";

export interface PlateState<
  WellMetaT extends Record<string, unknown> = AnnotationMetadata,
> {
  plateSize: PlateSize;
  layers: PlateLayer<WellMetaT>[];
  activeLayerId: string;
  activeWellAnnotationId: string | null;
  selection: PlateSelection | null;
  excludedWells: number[];
  viewMode: PlateViewMode;
}

export type LayerMove = "up" | "down" | number;

export interface PlateActions<
  WellMetaT extends Record<string, unknown> = AnnotationMetadata,
> {
  addLayer: (name?: string) => void;
  addLayerWithAnnotations: (
    annotations: WellAnnotation<WellMetaT>[],
    name?: string,
  ) => void;
  renameLayer: (layerId: string, name: string) => void;
  deleteLayer: (layerId: string) => void;
  moveLayer: (layerId: string, direction: LayerMove) => void;
  setActiveLayer: (layerId: string) => void;
  setLayerAnnotations: (
    layerId: string,
    annotations: WellAnnotation<WellMetaT>[],
  ) => void;
  setActiveWellAnnotation: (annotationId: string | null) => void;
  setPlateSize: (size: PlateSize) => void;
  setSelectionWithExcluded: (args: {
    selection: PlateSelection | null;
    excludedWells: number[];
  }) => void;
  setExcludedWells: (wells: number[]) => void;
  setViewMode: (mode: PlateViewMode) => void;
  replacePlateState: (newState: PlateState<WellMetaT>) => void;
}

export interface UsePlateParams<
  WellMetaT extends Record<string, unknown> = AnnotationMetadata,
> {
  initialPlateSize: PlateSize;
  initialLayers?: PlateLayer<WellMetaT>[];
  initialSelection?: PlateSelection;
  initialExcludedWells?: number[];
  initialViewMode?: PlateViewMode;
  initialActiveLayerId?: string;
  generateId?: GenerateId;
}

type Action<WellMetaT extends Record<string, unknown>> =
  | { type: "ADD_LAYER"; name?: string; annotations?: WellAnnotation<WellMetaT>[] }
  | { type: "RENAME_LAYER"; layerId: string; name: string }
  | { type: "DELETE_LAYER"; layerId: string }
  | { type: "MOVE_LAYER"; layerId: string; direction: LayerMove }
  | { type: "SET_ACTIVE_LAYER"; layerId: string }
  | { type: "SET_LAYER_ANNOTATIONS"; layerId: string; annotations: WellAnnotation<WellMetaT>[] }
  | { type: "SET_ACTIVE_WELL_ANNOTATION"; annotationId: string | null }
  | { type: "SET_PLATE_SIZE"; size: PlateSize }
  | { type: "SET_SELECTION_WITH_EXCLUDED"; selection: PlateSelection | null; excludedWells: number[] }
  | { type: "SET_EXCLUDED_WELLS"; wells: number[] }
  | { type: "SET_VIEW_MODE"; mode: PlateViewMode }
  | { type: "REPLACE_PLATE_STATE"; state: PlateState<WellMetaT> };

function nextDefaultLayerName(layers: Array<{ name: string }>): string {
  const names = new Set(layers.map((layer) => layer.name));
  let index = 1;
  while (names.has(`Layer ${index}`)) index += 1;
  return `Layer ${index}`;
}

function findLayerIndex(layers: Array<{ id: string }>, layerId: string): number {
  const index = layers.findIndex((layer) => layer.id === layerId);
  if (index < 0) throw new Error(`Unknown layer ID ${layerId}`);
  return index;
}

export function transitionPlateState<
  WellMetaT extends Record<string, unknown>,
>(
  state: PlateState<WellMetaT>,
  action: Action<WellMetaT>,
  generateId: GenerateId,
): PlateState<WellMetaT> {
  let next: PlateState<WellMetaT>;
  switch (action.type) {
    case "ADD_LAYER": {
      const id = generateValidId(generateId);
      const name = action.name ?? nextDefaultLayerName(state.layers);
      next = {
        ...state,
        layers: [{ id, name, annotations: action.annotations ?? [] }, ...state.layers],
        activeLayerId: id,
        activeWellAnnotationId: null,
      };
      break;
    }
    case "RENAME_LAYER": {
      const index = findLayerIndex(state.layers, action.layerId);
      const layers = [...state.layers];
      layers[index] = { ...layers[index], name: action.name };
      next = { ...state, layers };
      break;
    }
    case "DELETE_LAYER": {
      if (state.layers.length === 1) throw new Error("Cannot delete the final layer");
      const index = findLayerIndex(state.layers, action.layerId);
      const layers = state.layers.filter((layer) => layer.id !== action.layerId);
      const deletingActive = state.activeLayerId === action.layerId;
      next = {
        ...state,
        layers,
        activeLayerId: deletingActive
          ? layers[Math.min(index, layers.length - 1)].id
          : state.activeLayerId,
        activeWellAnnotationId: deletingActive ? null : state.activeWellAnnotationId,
      };
      break;
    }
    case "MOVE_LAYER": {
      const index = findLayerIndex(state.layers, action.layerId);
      const target =
        typeof action.direction === "number"
          ? action.direction
          : index + (action.direction === "up" ? -1 : 1);
      if (!Number.isInteger(target) || target < 0 || target >= state.layers.length) {
        throw new Error(`Invalid layer target index ${target}`);
      }
      const layers = [...state.layers];
      const [layer] = layers.splice(index, 1);
      layers.splice(target, 0, layer);
      next = { ...state, layers };
      break;
    }
    case "SET_ACTIVE_LAYER":
      findLayerIndex(state.layers, action.layerId);
      next = action.layerId === state.activeLayerId
        ? state
        : { ...state, activeLayerId: action.layerId, activeWellAnnotationId: null };
      break;
    case "SET_LAYER_ANNOTATIONS": {
      const index = findLayerIndex(state.layers, action.layerId);
      const layers = [...state.layers];
      layers[index] = { ...layers[index], annotations: action.annotations };
      const activeStillExists =
        action.layerId !== state.activeLayerId ||
        !state.activeWellAnnotationId ||
        action.annotations.some((annotation) => annotation.id === state.activeWellAnnotationId);
      next = { ...state, layers, activeWellAnnotationId: activeStillExists ? state.activeWellAnnotationId : null };
      break;
    }
    case "SET_ACTIVE_WELL_ANNOTATION": {
      if (
        action.annotationId &&
        !state.layers
          .find((layer) => layer.id === state.activeLayerId)
          ?.annotations.some((annotation) => annotation.id === action.annotationId)
      ) {
        throw new Error("Active annotation does not belong to the active layer");
      }
      next = { ...state, activeWellAnnotationId: action.annotationId };
      break;
    }
    case "SET_PLATE_SIZE":
      next = {
        ...state,
        plateSize: action.size,
        layers: state.layers.map((layer) => ({
          ...layer,
          annotations: layer.annotations.map((annotation) => ({
            ...annotation,
            wells: annotation.wells.filter((well) => well < action.size),
          })),
        })),
        excludedWells: state.excludedWells.filter((well) => well < action.size),
        selection: state.selection
          ? { ...state.selection, wells: state.selection.wells.filter((well) => well < action.size) }
          : null,
      };
      break;
    case "SET_SELECTION_WITH_EXCLUDED": {
      const excluded = new Set(action.excludedWells);
      const wells = action.selection?.wells.filter((well) => !excluded.has(well)) ?? [];
      next = {
        ...state,
        selection: action.selection && wells.length ? { ...action.selection, wells } : null,
        excludedWells: action.excludedWells,
      };
      break;
    }
    case "SET_EXCLUDED_WELLS": {
      const excluded = new Set(action.wells);
      const wells = state.selection?.wells.filter((well) => !excluded.has(well)) ?? [];
      next = {
        ...state,
        excludedWells: action.wells,
        selection: state.selection && wells.length ? { ...state.selection, wells } : null,
      };
      break;
    }
    case "SET_VIEW_MODE":
      next = { ...state, viewMode: action.mode };
      break;
    case "REPLACE_PLATE_STATE":
      next = action.state;
      break;
  }
  return parseRuntimePlateState<WellMetaT>(next);
}

export function createInitialPlateState<
  WellMetaT extends Record<string, unknown> = AnnotationMetadata,
>(params: UsePlateParams<WellMetaT>): PlateState<WellMetaT> {
  const generateId = params.generateId ?? defaultGenerateId;
  const layers = params.initialLayers === undefined
    ? [{ id: generateValidId(generateId), name: "Layer 1", annotations: [] }]
    : params.initialLayers;
  const activeLayerId = params.initialActiveLayerId ?? layers[0]?.id;
  return parseRuntimePlateState<WellMetaT>({
    plateSize: params.initialPlateSize,
    layers,
    activeLayerId,
    activeWellAnnotationId: null,
    selection: params.initialSelection ?? null,
    excludedWells: params.initialExcludedWells ?? [],
    viewMode: params.initialViewMode ?? "flat",
  });
}

export const usePlateReducer = <
  WellMetaT extends Record<string, unknown> = AnnotationMetadata,
>(params: UsePlateParams<WellMetaT>): {
  plateState: PlateState<WellMetaT>;
  plateActions: PlateActions<WellMetaT>;
} => {
  const idFactory = useRef(params.generateId ?? defaultGenerateId);
  const [state, dispatch] = useReducer(
    (current: PlateState<WellMetaT>, action: Action<WellMetaT>) =>
      transitionPlateState(current, action, idFactory.current),
    params,
    createInitialPlateState,
  );
  return {
    plateState: state,
    plateActions: {
      addLayer: (name) => dispatch({ type: "ADD_LAYER", name }),
      addLayerWithAnnotations: (annotations, name) =>
        dispatch({ type: "ADD_LAYER", annotations, name }),
      renameLayer: (layerId, name) => dispatch({ type: "RENAME_LAYER", layerId, name }),
      deleteLayer: (layerId) => dispatch({ type: "DELETE_LAYER", layerId }),
      moveLayer: (layerId, direction) => dispatch({ type: "MOVE_LAYER", layerId, direction }),
      setActiveLayer: (layerId) => dispatch({ type: "SET_ACTIVE_LAYER", layerId }),
      setLayerAnnotations: (layerId, annotations) =>
        dispatch({ type: "SET_LAYER_ANNOTATIONS", layerId, annotations }),
      setActiveWellAnnotation: (annotationId) =>
        dispatch({ type: "SET_ACTIVE_WELL_ANNOTATION", annotationId }),
      setPlateSize: (size) => dispatch({ type: "SET_PLATE_SIZE", size }),
      setSelectionWithExcluded: ({ selection, excludedWells }) =>
        dispatch({ type: "SET_SELECTION_WITH_EXCLUDED", selection, excludedWells }),
      setExcludedWells: (wells) => dispatch({ type: "SET_EXCLUDED_WELLS", wells }),
      setViewMode: (mode) => dispatch({ type: "SET_VIEW_MODE", mode }),
      replacePlateState: (newState) =>
        dispatch({ type: "REPLACE_PLATE_STATE", state: parseRuntimePlateState<WellMetaT>(newState) }),
    },
  };
};
