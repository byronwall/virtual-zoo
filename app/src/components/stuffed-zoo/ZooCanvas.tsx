import { For, Show, createMemo, createSignal } from "solid-js";
import { css } from "styled-system/css";
import { Box } from "styled-system/jsx";
import type { ClientAnimal } from "./types";

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

export function ZooCanvas(props: ZooCanvasProps) {
  let canvasRef: HTMLDivElement | undefined;
  const [drag, setDrag] = createSignal<DragState | null>(null);
  const [positions, setPositions] = createSignal<Record<string, { x: number; y: number }>>({});

  const sortedAnimals = createMemo(() =>
    [...props.animals].sort((first, second) => {
      const backgroundWeight =
        Number(first.image.backgroundRemoved) - Number(second.image.backgroundRemoved);
      if (backgroundWeight !== 0) return backgroundWeight;
      return first.canvas.zIndex - second.canvas.zIndex;
    }),
  );

  const positionFor = (animal: ClientAnimal) => positions()[animal.id] ?? animal.canvas;

  const handleCanvasPointerDown = (event: PointerEvent) => {
    if (event.target === canvasRef) props.onSelectAnimal(null);
  };

  const handleAnimalPointerDown = (event: PointerEvent, animal: ClientAnimal) => {
    event.preventDefault();
    event.stopPropagation();
    props.onSelectAnimal(animal.id);
    const position = positionFor(animal);
    const zIndex =
      props.animals.reduce((highest, candidate) => Math.max(highest, candidate.canvas.zIndex), 0) +
      1;
    setDrag({
      id: animal.id,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: position.x,
      originY: position.y,
      zIndex,
    });
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  };

  const handleAnimalPointerMove = (event: PointerEvent) => {
    const current = drag();
    if (!current || current.pointerId !== event.pointerId || !canvasRef) return;
    const rect = canvasRef.getBoundingClientRect();
    const nextX = clamp(current.originX + ((event.clientX - current.startX) / rect.width) * 100);
    const nextY = clamp(current.originY + ((event.clientY - current.startY) / rect.height) * 100);
    setPositions((previous) => ({
      ...previous,
      [current.id]: { x: nextX, y: nextY },
    }));
  };

  const handleAnimalPointerUp = (event: PointerEvent) => {
    const current = drag();
    if (!current || current.pointerId !== event.pointerId) return;
    const position = positions()[current.id] ?? { x: current.originX, y: current.originY };
    props.onMoveAnimal(current.id, position.x, position.y, current.zIndex);
    setDrag(null);
  };

  return (
    <Box
      ref={canvasRef}
      class={canvasClass}
      onPointerDown={handleCanvasPointerDown}
      aria-label="Stuffed animal pile"
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
                "z-index": String(selected() ? 999 : animal.canvas.zIndex),
              }}
            >
              <img src={animal.image.stickerUrl} alt="" draggable={false} />
              <Show when={selected()}>
                <span>{animal.name}</span>
              </Show>
            </button>
          );
        }}
      </For>
    </Box>
  );
}

const clamp = (value: number) => Math.max(6, Math.min(94, Math.round(value * 10) / 10));

const canvasClass = css({
  position: "relative",
  minH: { base: "58dvh", md: "calc(100dvh - 32px)" },
  h: "full",
  overflow: "hidden",
  borderRadius: "2xl",
  bg: "green.subtle.bg",
  backgroundImage:
    "radial-gradient(circle at 20% 20%, rgba(255,255,255,.55) 0 10%, transparent 11%), radial-gradient(circle at 80% 8%, rgba(255,255,255,.4) 0 8%, transparent 9%)",
  borderWidth: "1px",
  borderColor: "green.subtle.border",
  touchAction: "none",
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
    bg: "bg.default",
    color: "fg.default",
    boxShadow: "md",
    fontWeight: "bold",
    fontSize: "sm",
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
