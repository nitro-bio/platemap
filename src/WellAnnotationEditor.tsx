import { type FormEvent, useEffect, useMemo, useState } from "react";

import type {
  AnnotationColor,
  AnnotationMetadata,
  PlateActions,
  PlateState,
  WellAnnotation,
} from "./index";
import { ANNOTATION_STYLES } from "./index";

interface WellAnnotationEditorProps {
  plateState: PlateState<AnnotationMetadata>;
  plateActions: PlateActions<AnnotationMetadata>;
}

export const WellAnnotationEditor = ({
  plateState,
  plateActions,
}: WellAnnotationEditorProps) => {
  const activeLayer = plateState.layers.find(
    (layer) => layer.id === plateState.activeLayerId,
  );
  if (!activeLayer) throw new Error("Active layer does not exist");

  const activeAnnotation = activeLayer.annotations.find(
    (annotation) => annotation.id === plateState.activeWellAnnotationId,
  );
  const [label, setLabel] = useState("");
  const [color, setColor] = useState<AnnotationColor>("blue");
  const selectedWells = plateState.selection?.wells ?? [];

  useEffect(() => {
    setLabel(activeAnnotation?.label ?? "");
    setColor(activeAnnotation?.annotationStyle.color ?? "blue");
  }, [activeAnnotation]);

  const style = useMemo(
    () =>
      ANNOTATION_STYLES.find((candidate) => candidate.color === color) ??
      ANNOTATION_STYLES[0],
    [color],
  );

  const saveAnnotation = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedLabel = label.trim();
    if (!trimmedLabel) return;

    let annotationId = activeAnnotation?.id;
    let annotations: WellAnnotation<AnnotationMetadata>[];
    if (activeAnnotation) {
      annotations = activeLayer.annotations.map((annotation) =>
        annotation.id === activeAnnotation.id
          ? {
              ...annotation,
              label: trimmedLabel,
              annotationStyle: style,
              wells: selectedWells.length
                ? selectedWells
                : activeAnnotation.wells,
            }
          : annotation,
      );
    } else {
      annotationId = crypto.randomUUID();
      annotations = [
        ...activeLayer.annotations,
        {
          id: annotationId,
          label: trimmedLabel,
          annotationStyle: style,
          wells: selectedWells,
        },
      ];
    }

    plateActions.setLayerAnnotations(activeLayer.id, annotations);
    plateActions.setActiveWellAnnotation(annotationId ?? null);
  };

  return (
    <section
      className="annotation-editor"
      aria-labelledby="annotation-editor-title"
    >
      <div className="annotation-editor-heading">
        <h2 id="annotation-editor-title">Annotations</h2>
        <p aria-live="polite">
          {activeLayer.name} · {selectedWells.length} wells selected
        </p>
      </div>

      <form className="annotation-form" onSubmit={saveAnnotation}>
        <label>
          <span>Annotation</span>
          <select
            value={activeAnnotation?.id ?? ""}
            onChange={(event) =>
              plateActions.setActiveWellAnnotation(event.target.value || null)
            }
          >
            <option value="">New annotation</option>
            {activeLayer.annotations.map((annotation) => (
              <option key={annotation.id} value={annotation.id}>
                {annotation.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Label</span>
          <input
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            placeholder="e.g. Positive control"
          />
        </label>
        <label>
          <span>Color</span>
          <select
            value={color}
            onChange={(event) =>
              setColor(event.target.value as AnnotationColor)
            }
          >
            {ANNOTATION_STYLES.map((candidate) => (
              <option key={candidate.id} value={candidate.color}>
                {candidate.color[0].toUpperCase() + candidate.color.slice(1)}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          disabled={
            !label.trim() || (!activeAnnotation && !selectedWells.length)
          }
        >
          {activeAnnotation ? "Update" : "Create"}
        </button>
      </form>
    </section>
  );
};
