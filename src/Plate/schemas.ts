import { ReactNode } from "react";

export type PlateSelection = {
  wells: number[];
  className?: string;
};

export interface AnnotationStyle {
  id: string;
  buttonClassName: string;
  wellClassName: string;
  rowClassName: string;
  colClassName: string;
}

export const BLUE_STYLE: AnnotationStyle = {
  id: "BLUE_STYLE",
  buttonClassName:
    "dark:border-blue-500 border-blue-600 dark:text-blue-50 text-blue-900 font-semibold",
  wellClassName: "dark:bg-blue-500 bg-blue-400",
  rowClassName: "dark:bg-blue-400 bg-blue-600",
  colClassName: "dark:bg-blue-400 bg-blue-600",
};
export const RED_STYLE: AnnotationStyle = {
  id: "RED_STYLE",
  buttonClassName:
    "dark:bg-border-500 border-red-600 dark:text-red-50 text-red-900 font-semibold",
  wellClassName: "dark:bg-red-500 bg-red-400",
  rowClassName: "dark:bg-red-400 bg-red-600",
  colClassName: "dark:bg-red-400 bg-red-600",
};
export const GREEN_STYLE: AnnotationStyle = {
  id: "GREEN_STYLE",
  buttonClassName:
    "dark:border-green-500 border-green-600 dark:text-green-50 text-green-900 font-semibold",
  wellClassName: "dark:bg-green-500 bg-green-400",
  rowClassName: "dark:bg-green-400 bg-green-600",
  colClassName: "dark:bg-green-400 bg-green-600",
};
export const PURPLE_STYLE: AnnotationStyle = {
  id: "PURPLE_STYLE",
  buttonClassName:
    "dark:border-purple-500 border-purple-600 dark:text-purple-50 text-purple-900 font-semibold",
  wellClassName: "dark:bg-purple-500 bg-purple-400",
  rowClassName: "dark:bg-purple-400 bg-purple-600",
  colClassName: "dark:bg-purple-400 bg-purple-600",
};
export const CYAN_STYLE: AnnotationStyle = {
  id: "CYAN_STYLE",
  buttonClassName:
    "dark:border-cyan-500 border-cyan-600 dark:text-cyan-50 text-cyan-900 font-semibold",
  wellClassName: "dark:bg-cyan-500 bg-cyan-400",
  rowClassName: "dark:bg-cyan-400 bg-cyan-600",
  colClassName: "dark:bg-cyan-400 bg-cyan-600",
};
export const ORANGE_STYLE: AnnotationStyle = {
  id: "ORANGE_STYLE",
  buttonClassName:
    "dark:border-orange-500 border-orange-600 dark:text-orange-50 text-orange-900 font-semibold",
  wellClassName: "dark:bg-orange-500 bg-orange-400",
  rowClassName: "dark:bg-orange-400 bg-orange-600",
  colClassName: "dark:bg-orange-400 bg-orange-600",
};
export const GRAY_STYLE: AnnotationStyle = {
  id: "GRAY_STYLE",
  buttonClassName:
    "dark:border-gray-500 border-gray-600 dark:text-gray-50 text-gray-900 font-semibold",
  wellClassName: "dark:bg-gray-500 bg-gray-400",
  rowClassName: "dark:bg-gray-400 bg-gray-600",
  colClassName: "dark:bg-gray-400 bg-gray-600",
};

export const ANNOTATION_STYLES = [
  GRAY_STYLE,
  ORANGE_STYLE,
  PURPLE_STYLE,
  CYAN_STYLE,
  GREEN_STYLE,
  BLUE_STYLE,
  RED_STYLE,
];

export interface WellAnnotation<T extends Record<string, string>> {
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
  [key: string]: ReactNode;
};

export type PlateSize = 24 | 48 | 96 | 384 | 1536;
