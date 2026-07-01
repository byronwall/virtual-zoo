import type { Point, ViewportState } from "./ZooCanvas.types";

export const eventPoint = (event: PointerEvent): Point => {
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
  return { x: event.clientX - rect.left, y: event.clientY - rect.top };
};

export const roundPosition = (value: number) => Math.round(value * 10) / 10;
export const clampScale = (value: number) => Math.max(0.42, Math.min(2.4, value));
export const distance = (first: Point, second: Point) =>
  Math.hypot(second.x - first.x, second.y - first.y);
export const midpoint = (first: Point, second: Point) => ({
  x: (first.x + second.x) / 2,
  y: (first.y + second.y) / 2,
});

export const zoomAtPoint = (
  current: ViewportState,
  focalPoint: Point,
  factor: number,
): ViewportState => {
  const nextScale = clampScale(current.scale * factor);
  const originWorldX = (focalPoint.x - current.x) / current.scale;
  const originWorldY = (focalPoint.y - current.y) / current.scale;
  return {
    scale: nextScale,
    x: focalPoint.x - originWorldX * nextScale,
    y: focalPoint.y - originWorldY * nextScale,
  };
};
