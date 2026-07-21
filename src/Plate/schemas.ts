export type PlateSelection = {
  wells: number[];
  className?: string;
};

export type AnnotationColor =
  | "blue"
  | "cyan"
  | "gray"
  | "green"
  | "orange"
  | "purple"
  | "red"
  | "yellow";

/** Semantic styling contract. Visual classes are owned by the component CSS. */
export interface AnnotationStyle {
  id: string;
  color: AnnotationColor;
}

export const BLUE_STYLE: AnnotationStyle = { id: "BLUE_STYLE", color: "blue" };
export const CYAN_STYLE: AnnotationStyle = { id: "CYAN_STYLE", color: "cyan" };
export const GRAY_STYLE: AnnotationStyle = { id: "GRAY_STYLE", color: "gray" };
export const GREEN_STYLE: AnnotationStyle = {
  id: "GREEN_STYLE",
  color: "green",
};
export const ORANGE_STYLE: AnnotationStyle = {
  id: "ORANGE_STYLE",
  color: "orange",
};
export const PURPLE_STYLE: AnnotationStyle = {
  id: "PURPLE_STYLE",
  color: "purple",
};
export const RED_STYLE: AnnotationStyle = { id: "RED_STYLE", color: "red" };
export const YELLOW_STYLE: AnnotationStyle = {
  id: "YELLOW_STYLE",
  color: "yellow",
};

export const ANNOTATION_STYLES = [
  GRAY_STYLE,
  ORANGE_STYLE,
  YELLOW_STYLE,
  PURPLE_STYLE,
  CYAN_STYLE,
  GREEN_STYLE,
  BLUE_STYLE,
  RED_STYLE,
] as const;

export type AnnotationMetadataValue = string | number | boolean | null;
export type AnnotationMetadata = Record<string, AnnotationMetadataValue>;

export interface WellAnnotation<
  T extends Record<string, unknown> = AnnotationMetadata,
> {
  id: string;
  wells: number[];
  label: string;
  annotationStyle: AnnotationStyle;
  className?: string;
  metadata?: T;
}

export type WellAnnotationCSVRow = {
  Well: string;
  Annotations: string;
  [key: string]: string | number | boolean | null;
};

export type PlateSize = 24 | 48 | 96 | 384 | 1536;

export type PlateViewMode = "flat" | "isometric";

export interface PlateLayer<
  T extends Record<string, unknown> = AnnotationMetadata,
> {
  id: string;
  name: string;
  annotations: WellAnnotation<T>[];
}
