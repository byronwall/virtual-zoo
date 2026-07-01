import { createEffect, createMemo, createSignal, onCleanup, onMount } from "solid-js";
import { createStore } from "solid-js/store";
import { Box } from "styled-system/jsx";
import type { ClientAnimal } from "./types";
import {
  degreesToRadians,
  drawAnimalLabel,
  drawAnimalOutline,
  drawBackground,
  drawEmptyState,
  drawPlaceholder,
  drawSoftPlate,
  resizeCanvas,
  type CanvasSize,
} from "./ZooCanvas.drawing";
import { clampScale, distance, eventPoint, midpoint, roundPosition, zoomAtPoint } from "./ZooCanvas.math";
import { canvasClass, canvasLayerClass, canvasShellClass } from "./ZooCanvas.styles";
import type { Point, ViewportState } from "./ZooCanvas.types";
import { ZooCanvasControls } from "./ZooCanvasControls";

type ZooCanvasProps = {
  animals: ClientAnimal[];
  selectedAnimalId: string | null;
  onSelectAnimal: (id: string | null) => void;
  onMoveAnimal: (id: string, x: number, y: number, zIndex: number) => void;
};

type DragState = {
  id: string;
  pointerId: number;
  startX: number;
  startY: number;
  originX: number;
  originY: number;
  zIndex: number;
};

type GestureState = {
  pointerIds: [number, number];
  startDistance: number;
  startMidpoint: Point;
  startViewport: ViewportState;
};

type ImageRecord = {
  status: "loading" | "loaded" | "failed";
  image: HTMLImageElement;
};

const DEFAULT_VIEWPORT: ViewportState = { scale: 1, x: 0, y: 0 };
const VIEWPORT_PAN_STEP = 80;
const VIEWPORT_ZOOM_STEP = 1.18;
const INITIAL_IMAGE_LOAD_COUNT = 8;
const STAGED_IMAGE_DELAY_MS = 90;
const MAX_CANVAS_DPR = 1.5;

export function ZooCanvas(props: ZooCanvasProps) {
  let shellRef: HTMLDivElement | undefined;
  let mainCanvasRef: HTMLCanvasElement | undefined;
  let overlayCanvasRef: HTMLCanvasElement | undefined;
  let mainContext: CanvasRenderingContext2D | null = null;
  let overlayContext: CanvasRenderingContext2D | null = null;
  let frameId: number | null = null;

  const activePointers = new Map<number, Point>();
  const imageCache = new Map<string, ImageRecord>();
  let gesture: GestureState | null = null;
  const [drag, setDrag] = createSignal<DragState | null>(null);
  const [hoveredAnimalId, setHoveredAnimalId] = createSignal<string | null>(null);
  const [imageVersion, setImageVersion] = createSignal(0);
  const [positions, setPositions] = createStore<Record<string, Point>>({});
  const [zIndexes, setZIndexes] = createStore<Record<string, number>>({});
  const [viewport, setViewport] = createSignal(DEFAULT_VIEWPORT);
  const [canvasSize, setCanvasSize] = createSignal<CanvasSize>({
    cssWidth: 0,
    cssHeight: 0,
    dpr: 1,
  });

  const orderedAnimals = createMemo(() => {
    const selectedId = props.selectedAnimalId;
    const localZIndexes = { ...zIndexes };
    return [...props.animals].sort((first, second) => {
      const firstSelected = selectedId === first.id ? 1 : 0;
      const secondSelected = selectedId === second.id ? 1 : 0;
      if (firstSelected !== secondSelected) return firstSelected - secondSelected;
      const backgroundWeight =
        Number(first.image.backgroundRemoved) - Number(second.image.backgroundRemoved);
      if (backgroundWeight !== 0) return backgroundWeight;
      return (
        (localZIndexes[first.id] ?? first.canvas.zIndex) -
        (localZIndexes[second.id] ?? second.canvas.zIndex)
      );
    });
  });

  const positionFor = (animal: ClientAnimal): Point => positions[animal.id] ?? animal.canvas;
  const zIndexFor = (animal: ClientAnimal) => zIndexes[animal.id] ?? animal.canvas.zIndex;

  onMount(() => {
    mainContext = mainCanvasRef?.getContext("2d", { alpha: false }) ?? null;
    overlayContext = overlayCanvasRef?.getContext("2d", { alpha: true }) ?? null;

    const resize = () => {
      const rect = shellRef?.getBoundingClientRect();
      const cssWidth = Math.max(1, Math.round(rect?.width ?? 1));
      const cssHeight = Math.max(1, Math.round(rect?.height ?? 1));
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_CANVAS_DPR);
      resizeCanvas(mainCanvasRef, cssWidth, cssHeight, dpr);
      resizeCanvas(overlayCanvasRef, cssWidth, cssHeight, dpr);
      setCanvasSize({ cssWidth, cssHeight, dpr });
    };

    const observer = new ResizeObserver(resize);
    if (shellRef) observer.observe(shellRef);
    resize();
    onCleanup(() => {
      observer.disconnect();
      if (frameId !== null) cancelAnimationFrame(frameId);
    });
  });

  createEffect(() => {
    const sources = orderedAnimals()
      .slice()
      .reverse()
      .map((animal) => animal.image.thumbnailUrl);
    if (typeof window === "undefined") return;
    let cancelled = false;
    const timers: number[] = [];

    const loadSource = (src: string) => {
      if (!src) return;
      if (imageCache.has(src)) return;
      const image = new Image();
      image.decoding = "async";
      image.onload = () => {
        imageCache.set(src, { status: "loaded", image });
        setImageVersion((version) => version + 1);
      };
      image.onerror = () => {
        imageCache.set(src, { status: "failed", image });
        setImageVersion((version) => version + 1);
      };
      imageCache.set(src, { status: "loading", image });
      image.src = src;
    };

    sources.slice(0, INITIAL_IMAGE_LOAD_COUNT).forEach(loadSource);
    const loadNext = (index: number) => {
      if (cancelled || index >= sources.length) return;
      loadSource(sources[index] ?? "");
      timers.push(window.setTimeout(() => loadNext(index + 1), STAGED_IMAGE_DELAY_MS));
    };
    timers.push(window.setTimeout(() => loadNext(INITIAL_IMAGE_LOAD_COUNT), STAGED_IMAGE_DELAY_MS));

    onCleanup(() => {
      cancelled = true;
      timers.forEach((timer) => clearTimeout(timer));
    });
  });

  createEffect(() => {
    imageVersion();
    canvasSize();
    viewport();
    drag();
    hoveredAnimalId();
    props.selectedAnimalId;
    orderedAnimals();
    scheduleDraw();
  });

  const scheduleDraw = () => {
    if (frameId !== null || typeof window === "undefined") return;
    frameId = requestAnimationFrame(() => {
      frameId = null;
      drawCanvas();
    });
  };

  const drawCanvas = () => {
    const size = canvasSize();
    if (!mainContext || !overlayContext || size.cssWidth <= 0 || size.cssHeight <= 0) return;
    drawMainLayer(mainContext, size);
    drawOverlayLayer(overlayContext, size);
  };

  const drawMainLayer = (context: CanvasRenderingContext2D, size: CanvasSize) => {
    context.save();
    context.scale(size.dpr, size.dpr);
    context.clearRect(0, 0, size.cssWidth, size.cssHeight);
    drawBackground(context, size);
    for (const animal of orderedAnimals()) drawAnimal(context, animal, size);
    if (props.animals.length === 0) drawEmptyState(context, size);
    context.restore();
  };

  const drawOverlayLayer = (context: CanvasRenderingContext2D, size: CanvasSize) => {
    context.save();
    context.scale(size.dpr, size.dpr);
    context.clearRect(0, 0, size.cssWidth, size.cssHeight);
    const selected = animalById(props.selectedAnimalId);
    const hovered = animalById(hoveredAnimalId());
    if (hovered && hovered.id !== selected?.id) {
      drawAnimalOutline(context, animalBounds(hovered, size), hovered.canvas.rotation, "#f97316");
    }
    if (selected) {
      drawAnimalOutline(context, animalBounds(selected, size), selected.canvas.rotation, "#f59e0b");
      drawAnimalLabel(context, selected, animalBounds(selected, size));
    }
    context.restore();
  };

  const drawAnimal = (context: CanvasRenderingContext2D, animal: ClientAnimal, size: CanvasSize) => {
    const bounds = animalBounds(animal, size);
    const record = imageCache.get(animal.image.thumbnailUrl);
    context.save();
    context.translate(bounds.center.x, bounds.center.y);
    context.rotate(degreesToRadians(animal.canvas.rotation));
    drawSoftPlate(context, bounds.width, bounds.height);
    if (record?.status === "loaded") {
      context.drawImage(record.image, -bounds.width / 2, -bounds.height / 2, bounds.width, bounds.height);
    } else {
      drawPlaceholder(context, animal, bounds.width, bounds.height);
    }
    context.restore();
  };

  const trackPointer = (event: PointerEvent) => {
    const point = eventPoint(event);
    activePointers.set(event.pointerId, point);
    return point;
  };

  const beginGesture = () => {
    if (activePointers.size < 2) return false;
    const pointerIds = Array.from(activePointers.keys());
    const firstId = pointerIds[0];
    const secondId = pointerIds[1];
    if (firstId === undefined || secondId === undefined) return false;
    const first = activePointers.get(firstId);
    const second = activePointers.get(secondId);
    if (!first || !second) return false;
    const currentDrag = drag();
    if (currentDrag) {
      setPositions(currentDrag.id, { x: currentDrag.originX, y: currentDrag.originY });
      scheduleDraw();
    }
    setDrag(null);
    gesture = {
      pointerIds: [firstId, secondId],
      startDistance: distance(first, second),
      startMidpoint: midpoint(first, second),
      startViewport: viewport(),
    };
    return true;
  };

  const updateGesture = () => {
    if (!gesture) return false;
    const [firstId, secondId] = gesture.pointerIds;
    const first = activePointers.get(firstId);
    const second = activePointers.get(secondId);
    if (!first || !second) return false;

    const nextMidpoint = midpoint(first, second);
    const nextDistance = distance(first, second);
    const nextScale = clampScale(
      gesture.startViewport.scale * (nextDistance / gesture.startDistance),
    );
    const originWorldX =
      (gesture.startMidpoint.x - gesture.startViewport.x) / gesture.startViewport.scale;
    const originWorldY =
      (gesture.startMidpoint.y - gesture.startViewport.y) / gesture.startViewport.scale;

    setViewport({
      scale: nextScale,
      x: nextMidpoint.x - originWorldX * nextScale,
      y: nextMidpoint.y - originWorldY * nextScale,
    });
    return true;
  };

  const stopPointer = (event: PointerEvent) => {
    activePointers.delete(event.pointerId);
    if (gesture?.pointerIds.includes(event.pointerId)) gesture = null;
    const target = event.currentTarget as HTMLElement;
    if (target.hasPointerCapture(event.pointerId)) target.releasePointerCapture(event.pointerId);
  };

  const handlePointerDown = (event: PointerEvent) => {
    event.preventDefault();
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    const point = trackPointer(event);
    if (activePointers.size >= 2 && beginGesture()) return;

    const animal = hitTest(point);
    if (!animal) {
      props.onSelectAnimal(null);
      setHoveredAnimalId(null);
      return;
    }

    props.onSelectAnimal(animal.id);
    setHoveredAnimalId(animal.id);
    const position = positionFor(animal);
    const zIndex = Math.max(0, ...props.animals.map((candidate) => zIndexFor(candidate))) + 1;
    setZIndexes(animal.id, zIndex);
    setDrag({
      id: animal.id,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: position.x,
      originY: position.y,
      zIndex,
    });
  };

  const handlePointerMove = (event: PointerEvent) => {
    const point = event.buttons === 0 ? eventPoint(event) : trackPointer(event);
    if (updateGesture()) {
      event.preventDefault();
      return;
    }

    const current = drag();
    if (current && current.pointerId === event.pointerId) {
      const size = canvasSize();
      const nextX = roundPosition(
        current.originX + ((event.clientX - current.startX) / (size.cssWidth * viewport().scale)) * 100,
      );
      const nextY = roundPosition(
        current.originY + ((event.clientY - current.startY) / (size.cssHeight * viewport().scale)) * 100,
      );
      setPositions(current.id, { x: nextX, y: nextY });
      scheduleDraw();
      return;
    }

    setHoveredAnimalId(hitTest(point)?.id ?? null);
  };

  const handlePointerUp = (event: PointerEvent) => {
    const current = drag();
    if (current && current.pointerId === event.pointerId) {
      const position = positions[current.id] ?? { x: current.originX, y: current.originY };
      props.onMoveAnimal(current.id, position.x, position.y, current.zIndex);
    }
    setDrag(null);
    stopPointer(event);
    setHoveredAnimalId(null);
  };

  const hitTest = (point: Point) => {
    const size = canvasSize();
    const animals = orderedAnimals().slice().reverse();
    return animals.find((animal) => pointInAnimal(point, animal, size)) ?? null;
  };

  const pointInAnimal = (point: Point, animal: ClientAnimal, size: CanvasSize) => {
    const bounds = animalBounds(animal, size);
    return (
      point.x >= bounds.center.x - bounds.width / 2 &&
      point.x <= bounds.center.x + bounds.width / 2 &&
      point.y >= bounds.center.y - bounds.height / 2 &&
      point.y <= bounds.center.y + bounds.height / 2
    );
  };

  const animalById = (id: string | null) =>
    id ? props.animals.find((animal) => animal.id === id) ?? null : null;

  const panViewport = (deltaX: number, deltaY: number) => {
    setViewport((current) => ({ ...current, x: current.x + deltaX, y: current.y + deltaY }));
  };

  const zoomViewport = (factor: number) => {
    const size = canvasSize();
    const focalPoint = { x: size.cssWidth / 2, y: size.cssHeight / 2 };
    setViewport((current) => zoomAtPoint(current, focalPoint, factor));
  };

  const animalBounds = (animal: ClientAnimal, size: CanvasSize) => {
    const position = positionFor(animal);
    const viewportState = viewport();
    const baseSize = size.cssWidth >= 768 ? 168 : 128;
    const width = baseSize * animal.canvas.scale * viewportState.scale;
    const height = baseSize * animal.canvas.scale * viewportState.scale;
    return {
      center: {
        x: (position.x / 100) * size.cssWidth * viewportState.scale + viewportState.x,
        y: (position.y / 100) * size.cssHeight * viewportState.scale + viewportState.y,
      },
      width,
      height,
    };
  };

  return (
    <Box class={canvasShellClass}>
      <ZooCanvasControls
        onZoomOut={() => zoomViewport(1 / VIEWPORT_ZOOM_STEP)}
        onZoomIn={() => zoomViewport(VIEWPORT_ZOOM_STEP)}
        onPanLeft={() => panViewport(-VIEWPORT_PAN_STEP, 0)}
        onPanRight={() => panViewport(VIEWPORT_PAN_STEP, 0)}
        onPanUp={() => panViewport(0, -VIEWPORT_PAN_STEP)}
        onPanDown={() => panViewport(0, VIEWPORT_PAN_STEP)}
      />
      <Box
        ref={shellRef}
        class={canvasClass}
        role="application"
        aria-label="Stuffed animal pile"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <canvas ref={mainCanvasRef} class={canvasLayerClass} />
        <canvas ref={overlayCanvasRef} class={canvasLayerClass} aria-hidden="true" />
      </Box>
    </Box>
  );
}
