import type { ClientAnimal } from "./types";

export type CanvasSize = {
  cssWidth: number;
  cssHeight: number;
  dpr: number;
};

export type AnimalBounds = {
  center: {
    x: number;
    y: number;
  };
  width: number;
  height: number;
};

export const resizeCanvas = (
  canvas: HTMLCanvasElement | undefined,
  cssWidth: number,
  cssHeight: number,
  dpr: number,
) => {
  if (!canvas) return;
  canvas.width = Math.round(cssWidth * dpr);
  canvas.height = Math.round(cssHeight * dpr);
  canvas.style.width = `${cssWidth}px`;
  canvas.style.height = `${cssHeight}px`;
};

export const drawBackground = (context: CanvasRenderingContext2D, size: CanvasSize) => {
  context.fillStyle = "#edf4db";
  context.fillRect(0, 0, size.cssWidth, size.cssHeight);
  context.fillStyle = "rgba(255,255,255,.54)";
  context.beginPath();
  context.arc(
    size.cssWidth * 0.18,
    size.cssHeight * 0.18,
    Math.min(size.cssWidth, size.cssHeight) * 0.13,
    0,
    Math.PI * 2,
  );
  context.fill();
  context.fillStyle = "rgba(255,197,61,.28)";
  context.beginPath();
  context.arc(
    size.cssWidth * 0.82,
    size.cssHeight * 0.14,
    Math.min(size.cssWidth, size.cssHeight) * 0.11,
    0,
    Math.PI * 2,
  );
  context.fill();
};

export const drawSoftPlate = (
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
) => {
  context.fillStyle = "rgba(255, 248, 219, .62)";
  context.fillRect(-width / 2, -height / 2, width, height);
};

export const drawPlaceholder = (
  context: CanvasRenderingContext2D,
  animal: ClientAnimal,
  width: number,
  height: number,
) => {
  context.fillStyle = "rgba(255,255,255,.58)";
  context.fillRect(-width / 2, -height / 2, width, height);
  context.fillStyle = "rgba(245,158,11,.24)";
  context.beginPath();
  context.arc(0, -height * 0.04, Math.min(width, height) * 0.28, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "rgba(87, 83, 78, .72)";
  context.font = "800 18px system-ui, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(animal.name.slice(0, 1).toUpperCase(), 0, 0);
};

export const drawEmptyState = (context: CanvasRenderingContext2D, size: CanvasSize) => {
  context.fillStyle = "#1f2937";
  context.font = "800 24px system-ui, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText("The zoo is ready.", size.cssWidth / 2, size.cssHeight / 2 - 18);
  context.fillStyle = "#6b7280";
  context.font = "600 16px system-ui, sans-serif";
  context.fillText(
    "Add the first stuffed animal photo to start the pile.",
    size.cssWidth / 2,
    size.cssHeight / 2 + 18,
  );
};

export const drawAnimalOutline = (
  context: CanvasRenderingContext2D,
  bounds: AnimalBounds,
  rotation: number,
  color: string,
) => {
  context.save();
  context.translate(bounds.center.x, bounds.center.y);
  context.rotate(degreesToRadians(rotation));
  context.strokeStyle = color;
  context.lineWidth = 3;
  context.strokeRect(
    -bounds.width / 2 - 4,
    -bounds.height / 2 - 4,
    bounds.width + 8,
    bounds.height + 8,
  );
  context.restore();
};

export const drawAnimalLabel = (
  context: CanvasRenderingContext2D,
  animal: ClientAnimal,
  bounds: AnimalBounds,
) => {
  context.font = "800 16px system-ui, sans-serif";
  const paddingX = 12;
  const textWidth = Math.min(context.measureText(animal.name).width, 190);
  const labelWidth = textWidth + paddingX * 2;
  const labelHeight = 30;
  const x = bounds.center.x - labelWidth / 2;
  const y = bounds.center.y + bounds.height / 2 + 8;
  context.fillStyle = "#ea580c";
  roundRect(context, x, y, labelWidth, labelHeight, 15);
  context.fill();
  context.fillStyle = "#fff";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(animal.name, bounds.center.x, y + labelHeight / 2, labelWidth - paddingX * 2);
};

export const degreesToRadians = (value: number) => (value / 180) * Math.PI;

const roundRect = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) => {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.lineTo(x + width - radius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + radius);
  context.lineTo(x + width, y + height - radius);
  context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  context.lineTo(x + radius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - radius);
  context.lineTo(x, y + radius);
  context.quadraticCurveTo(x, y, x + radius, y);
};
