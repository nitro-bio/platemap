import {
  type AnnotationMetadata,
  BLUE_STYLE,
  Plate,
  type PlateState,
  plateReducer,
  rangeToWells,
} from "@nitro-bio/platemap";
import "@nitro-bio/platemap/dist/nitro-platemap.css";

type Metadata = AnnotationMetadata & { concentration: number };

const state: PlateState<Metadata> = {
  plateSize: 24,
  excludedWells: [],
  selection: null,
  activeWellAnnotation: null,
  wellAnnotations: [
    {
      id: "control",
      label: "Control",
      wells: rangeToWells({ plateSize: 24, start: 0, end: 1 }),
      annotationStyle: BLUE_STYLE,
      metadata: { concentration: 5 },
    },
  ],
};

plateReducer(state, { type: "SET_EXCLUDED_WELLS", payload: [23] });

export const consumer = (
  <Plate
    plateSize={state.plateSize}
    excludedWells={state.excludedWells}
    selection={state.selection}
    setSelection={() => undefined}
    wellAnnotations={state.wellAnnotations}
    activeWellAnnotation={state.activeWellAnnotation}
    setWellAnnotations={() => undefined}
    setActiveWellAnnotation={() => undefined}
  />
);
