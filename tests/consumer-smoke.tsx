import {
  type AnnotationMetadata,
  BLUE_STYLE,
  Plate,
  type PlateState,
  rangeToWells,
  transitionPlateState,
  usePlateReducer,
} from "@nitro-bio/platemap";
import "@nitro-bio/platemap/dist/nitro-platemap.css";

type Metadata = AnnotationMetadata & { concentration: number };

const LAYER_ID = "00000000-0000-4000-8000-000000000001";
const ANNOTATION_ID = "00000000-0000-4000-8000-000000000002";
const GENERATED_ID = "00000000-0000-4000-8000-000000000003";

const state: PlateState<Metadata> = {
  plateSize: 24,
  layers: [
    {
      id: LAYER_ID,
      name: "Layer 1",
      annotations: [
        {
          id: ANNOTATION_ID,
          label: "Control",
          wells: rangeToWells({ plateSize: 24, start: 0, end: 1 }),
          annotationStyle: BLUE_STYLE,
          metadata: { concentration: 5 },
        },
      ],
    },
  ],
  activeLayerId: LAYER_ID,
  activeWellAnnotationId: null,
  excludedWells: [],
  selection: null,
  viewMode: "flat",
};

transitionPlateState(
  state,
  { type: "SET_EXCLUDED_WELLS", wells: [23] },
  () => GENERATED_ID,
);

export const Consumer = () => {
  const reducer = usePlateReducer<Metadata>({
    initialPlateSize: state.plateSize,
    initialLayers: state.layers,
    initialActiveLayerId: state.activeLayerId,
  });
  return <Plate {...reducer} />;
};
