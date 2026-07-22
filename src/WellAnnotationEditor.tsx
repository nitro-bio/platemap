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

  const startNewAnnotation = () => {
    plateActions.setActiveWellAnnotation(null);
  };

  return (
    <section
      className="annotation-editor"
      aria-labelledby="annotation-editor-title"
    >
      <div>
        <p className="annotation-editor-eyebrow">Active layer</p>
        <h2 id="annotation-editor-title">Well annotations</h2>
        <p className="annotation-editor-help">
          Select wells on the plate, then create an annotation or choose one to
          update it.
        </p>
      </div>

      <div className="annotation-list" aria-label="Annotations on active layer">
        {activeLayer.annotations.map((annotation) => (
          <button
            key={annotation.id}
            type="button"
            aria-pressed={annotation.id === activeAnnotation?.id}
            className="annotation-chip"
            onClick={() => plateActions.setActiveWellAnnotation(annotation.id)}
          >
            <span
              className={`annotation-chip-swatch platemap-annotation-${annotation.annotationStyle.color}`}
              aria-hidden="true"
            />
            <span>{annotation.label}</span>
            <span className="annotation-chip-count">
              {annotation.wells.length} wells
            </span>
          </button>
        ))}
        <button
          type="button"
          className="annotation-chip annotation-chip-new"
          aria-pressed={!activeAnnotation}
          onClick={startNewAnnotation}
        >
          + New annotation
        </button>
      </div>

      <form className="annotation-form" onSubmit={saveAnnotation}>
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
        <div className="annotation-form-action">
          <p aria-live="polite">
            {selectedWells.length
              ? `${selectedWells.length} selected wells will be saved.`
              : activeAnnotation
                ? `${activeAnnotation.wells.length} existing wells will be kept.`
                : "Select at least one well to create an annotation."}
          </p>
          <button
            type="submit"
            disabled={
              !label.trim() || (!activeAnnotation && !selectedWells.length)
            }
          >
            {activeAnnotation ? "Update annotation" : "Create annotation"}
          </button>
        </div>
      </form>
    </section>
  );
};
