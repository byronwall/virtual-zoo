import { For, Show, createMemo, createSignal } from "solid-js";
import { createStore } from "solid-js/store";
import { css } from "styled-system/css";
import { Box } from "styled-system/jsx";
import type { ClientAnimal } from "./types";
import { AsyncThumbnailImage } from "./AsyncThumbnailImage";
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

type Point = {
  x: number;
  y: number;
};

type ViewportState = {
  scale: number;
  x: number;
  y: number;
};

type GestureState = {
  pointerIds: [number, number];
  startDistance: number;
  startMidpoint: Point;
  startViewport: ViewportState;
};

const DEFAULT_VIEWPORT: ViewportState = { scale: 1, x: 0, y: 0 };
const VIEWPORT_PAN_STEP = 80;
const VIEWPORT_ZOOM_STEP = 1.18;

export function ZooCanvas(props: ZooCanvasProps) {
  let canvasRef: HTMLDivElement | undefined;
  const activePointers = new Map<number, Point>();
  let gesture: GestureState | null = null;
  const [drag, setDrag] = createSignal<DragState | null>(null);
  const [positions, setPositions] = createStore<Record<string, Point>>({});
  const [zIndexes, setZIndexes] = createStore<Record<string, number>>({});
  const [viewport, setViewport] = createSignal(DEFAULT_VIEWPORT);

  const sortedAnimals = createMemo(() =>
    [...props.animals].sort((first, second) => {
      const backgroundWeight =
        Number(first.image.backgroundRemoved) - Number(second.image.backgroundRemoved);
      if (backgroundWeight !== 0) return backgroundWeight;
      return first.canvas.zIndex - second.canvas.zIndex;
    }),
  );

  const positionFor = (animal: ClientAnimal): Point => positions[animal.id] ?? animal.canvas;
  const zIndexFor = (animal: ClientAnimal) => zIndexes[animal.id] ?? animal.canvas.zIndex;

  const trackPointer = (event: PointerEvent) => {
    const rect = canvasRef?.getBoundingClientRect();
    activePointers.set(event.pointerId, {
      x: rect ? event.clientX - rect.left : event.clientX,
      y: rect ? event.clientY - rect.top : event.clientY,
    });
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
    if (gesture?.pointerIds.includes(event.pointerId)) {
      gesture = null;
      setDrag(null);
    }
    const target = event.currentTarget as HTMLElement;
    if (target.hasPointerCapture(event.pointerId)) {
      target.releasePointerCapture(event.pointerId);
    }
  };

  const handleCanvasPointerDown = (event: PointerEvent) => {
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    trackPointer(event);
    if (activePointers.size >= 2 && beginGesture()) {
      event.preventDefault();
      return;
    }
    props.onSelectAnimal(null);
  };

  const handleCanvasPointerMove = (event: PointerEvent) => {
    if (!activePointers.has(event.pointerId)) return;
    trackPointer(event);
    if (updateGesture()) event.preventDefault();
  };

  const handleCanvasPointerUp = (event: PointerEvent) => {
    stopPointer(event);
  };

  const handleAnimalPointerDown = (event: PointerEvent, animal: ClientAnimal) => {
    event.preventDefault();
    event.stopPropagation();
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    trackPointer(event);
    if (activePointers.size >= 2 && beginGesture()) {
      return;
    }
    props.onSelectAnimal(animal.id);
    const position = positionFor(animal);
    let highestZIndex = 0;
    for (const candidate of props.animals) {
      highestZIndex = Math.max(highestZIndex, zIndexes[candidate.id] ?? candidate.canvas.zIndex);
    }
    const zIndex = highestZIndex + 1;
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

  const handleAnimalPointerMove = (event: PointerEvent) => {
    if (activePointers.has(event.pointerId)) {
      trackPointer(event);
      if (updateGesture()) {
        event.preventDefault();
        return;
      }
    }
    const current = drag();
    if (!current || current.pointerId !== event.pointerId || !canvasRef) return;
    const rect = canvasRef.getBoundingClientRect();
    const nextX = roundPosition(
      current.originX + ((event.clientX - current.startX) / (rect.width * viewport().scale)) * 100,
    );
    const nextY = roundPosition(
      current.originY + ((event.clientY - current.startY) / (rect.height * viewport().scale)) * 100,
    );
    setPositions(current.id, { x: nextX, y: nextY });
    setZIndexes(current.id, current.zIndex);
  };

  const handleAnimalPointerUp = (event: PointerEvent) => {
    const current = drag();
    if (current && current.pointerId === event.pointerId) {
      const position = positions[current.id] ?? { x: current.originX, y: current.originY };
      props.onMoveAnimal(current.id, position.x, position.y, current.zIndex);
    }
    setDrag(null);
    stopPointer(event);
  };

  const panViewport = (deltaX: number, deltaY: number) => {
    setViewport((current) => ({
      ...current,
      x: current.x + deltaX,
      y: current.y + deltaY,
    }));
  };

  const zoomViewport = (factor: number) => {
    const rect = canvasRef?.getBoundingClientRect();
    const focalPoint = rect
      ? { x: rect.width / 2, y: rect.height / 2 }
      : { x: 0, y: 0 };

    setViewport((current) => {
      const nextScale = clampScale(current.scale * factor);
      const originWorldX = (focalPoint.x - current.x) / current.scale;
      const originWorldY = (focalPoint.y - current.y) / current.scale;

      return {
        scale: nextScale,
        x: focalPoint.x - originWorldX * nextScale,
        y: focalPoint.y - originWorldY * nextScale,
      };
    });
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
        ref={canvasRef}
        class={canvasClass}
        onPointerDown={handleCanvasPointerDown}
        onPointerMove={handleCanvasPointerMove}
        onPointerUp={handleCanvasPointerUp}
        onPointerCancel={handleCanvasPointerUp}
        aria-label="Stuffed animal pile"
      >
        <Box
          class={canvasLayerClass}
          style={{
            transform: `translate(${viewport().x}px, ${viewport().y}px) scale(${viewport().scale})`,
          }}
        >
          <Show when={props.animals.length === 0}>
            <Box class={emptyClass}>
              <Box class={emptyTitleClass}>The zoo is ready.</Box>
              <Box>Add the first stuffed animal photo to start the pile.</Box>
            </Box>
          </Show>
          <For each={sortedAnimals()}>
            {(animal) => {
              const position = () => positionFor(animal);
              const selected = () => props.selectedAnimalId === animal.id;
              return (
                <button
                  type="button"
                  class={animalButtonClass}
                  aria-label={`Select ${animal.name}`}
                  data-selected={selected() ? "true" : "false"}
                  onPointerDown={(event) => handleAnimalPointerDown(event, animal)}
                  onPointerMove={handleAnimalPointerMove}
                  onPointerUp={handleAnimalPointerUp}
                  onPointerCancel={handleAnimalPointerUp}
                  style={{
                    left: `${position().x}%`,
                    top: `${position().y}%`,
                    transform: `translate(-50%, -50%) rotate(${animal.canvas.rotation}deg) scale(${animal.canvas.scale})`,
                    "z-index": String(selected() ? 999 : zIndexFor(animal)),
                  }}
                >
                  <AsyncThumbnailImage
                    src={animal.image.thumbnailUrl}
                    fallbackSrc={animal.image.stickerUrl}
                    alt=""
                    draggable={false}
                  />
                  <Show when={selected()}>
                    <span>{animal.name}</span>
                  </Show>
                </button>
              );
            }}
          </For>
        </Box>
      </Box>
    </Box>
  );
}

const roundPosition = (value: number) => Math.round(value * 10) / 10;
const clampScale = (value: number) => Math.max(0.42, Math.min(2.4, value));
const distance = (first: Point, second: Point) =>
  Math.hypot(second.x - first.x, second.y - first.y);
const midpoint = (first: Point, second: Point) => ({
  x: (first.x + second.x) / 2,
  y: (first.y + second.y) / 2,
});

const canvasShellClass = css({
  position: "relative",
  w: "full",
  h: "full",
  minW: "0",
  minH: "0",
});

const canvasClass = css({
  position: "relative",
  w: "full",
  h: "full",
  minW: "0",
  minH: "0",
  maxW: "100%",
  overflow: "hidden",
  borderRadius: "2xl",
  bg: "green.subtle.bg",
  backgroundImage:
    "radial-gradient(circle at 18% 18%, rgba(255,255,255,.74) 0 10%, transparent 11%), radial-gradient(circle at 82% 10%, rgba(255, 197, 61, .42) 0 8%, transparent 9%), radial-gradient(circle at 74% 78%, rgba(255, 112, 67, .2) 0 12%, transparent 13%)",
  borderWidth: "2px",
  borderColor: "green.subtle.border",
  touchAction: "none",
});

const canvasLayerClass = css({
  position: "absolute",
  inset: "0",
  transformOrigin: "0 0",
  willChange: "transform",
});

const animalButtonClass = css({
  position: "absolute",
  w: { base: "128px", md: "168px" },
  h: { base: "128px", md: "168px" },
  p: "0",
  borderWidth: "0",
  bg: "transparent",
  cursor: "grab",
  touchAction: "none",
  transformOrigin: "center",
  transition: "filter 120ms ease, scale 120ms ease",
  "&:active": {
    cursor: "grabbing",
  },
  "& img": {
    w: "full",
    h: "full",
    objectFit: "contain",
    filter: "drop-shadow(0 10px 0 rgba(255,255,255,.85)) drop-shadow(0 16px 18px rgba(60, 45, 24, .24))",
    userSelect: "none",
    pointerEvents: "none",
  },
  "& span": {
    position: "absolute",
    left: "50%",
    bottom: "-10px",
    transform: "translateX(-50%)",
    px: "3",
    py: "1",
    borderRadius: "full",
    bg: "orange.default",
    color: "white",
    boxShadow: "0 8px 18px rgba(216, 87, 42, .28)",
    fontWeight: "extrabold",
    fontSize: "md",
    whiteSpace: "nowrap",
  },
  '&[data-selected="true"] img': {
    filter:
      "drop-shadow(0 10px 0 rgba(255,255,255,.95)) drop-shadow(0 0 0.75rem rgba(245, 158, 11, .72)) drop-shadow(0 18px 20px rgba(60, 45, 24, .24))",
  },
});

const emptyClass = css({
  position: "absolute",
  inset: "0",
  display: "grid",
  placeItems: "center",
  px: "8",
  color: "fg.muted",
  textAlign: "center",
  pointerEvents: "none",
});

const emptyTitleClass = css({
  color: "fg.default",
  fontSize: "2xl",
  fontWeight: "bold",
  mb: "2",
});
