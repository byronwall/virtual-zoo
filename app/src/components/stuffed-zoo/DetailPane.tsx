import { For, Show, createMemo } from "solid-js";
import { CalendarDays, Trash2 } from "lucide-solid";
import { css } from "styled-system/css";
import { Box, HStack, VStack } from "styled-system/jsx";
import { Button, IconButton, Input, Text, Textarea } from "~/components/ui";
import type { ClientAnimal } from "./types";

type DetailPaneProps = {
  animals: ClientAnimal[];
  selectedAnimal: ClientAnimal | null;
  customTypes: string[];
  draft: { name: string; type: string; notes: string };
  saving: boolean;
  onDraftChange: (field: "name" | "type" | "notes", value: string) => void;
  onSaveAnimal: () => void;
  onLogSleepover: () => void;
  onDeleteAnimal: () => void;
};

export function DetailPane(props: DetailPaneProps) {
  const days = createMemo(() => lastDays(14));
  const selectedSleepDates = createMemo(
    () => new Set(props.selectedAnimal?.sleepLog.map((entry) => entry.date) ?? []),
  );
  const hasRecentSelectedSleep = () =>
    days().some((day) => selectedSleepDates().has(day.date));

  return (
    <Box class={paneClass}>
      <Show
        when={props.selectedAnimal}
        fallback={
          <VStack alignItems="stretch" gap="5">
            <VStack alignItems="start" gap="2">
              <HStack gap="2" color="orange.default">
                <CalendarDays size={20} />
                <Box class={sectionTitleClass}>Sleepover calendar</Box>
              </HStack>
              <Text color="fg.muted">
                Tap a friend in the pile to see their details, or check who joined bedtime
                recently.
              </Text>
            </VStack>
            <SleepCalendar days={days()} animals={props.animals} />
          </VStack>
        }
      >
        {(animal) => (
          <VStack alignItems="stretch" gap="5">
            <Box class={stickerPreviewClass}>
              <img src={animal().image.stickerUrl} alt={animal().name} />
            </Box>

            <VStack alignItems="stretch" gap="3">
              <LabeledInput
                label="Name"
                value={props.draft.name}
                onInput={(value) => props.onDraftChange("name", value)}
              />
              <Box>
                <label class={labelClass} for="animal-type">
                  Type
                </label>
                <Input
                  id="animal-type"
                  list="animal-types"
                  value={props.draft.type}
                  onInput={(event) => props.onDraftChange("type", event.currentTarget.value)}
                />
                <datalist id="animal-types">
                  <For each={props.customTypes}>
                    {(type) => <option value={type} />}
                  </For>
                </datalist>
              </Box>
              <Box>
                <label class={labelClass} for="animal-notes">
                  Notes
                </label>
                <Textarea
                  id="animal-notes"
                  minH="24"
                  value={props.draft.notes}
                  onInput={(event) => props.onDraftChange("notes", event.currentTarget.value)}
                />
              </Box>
              <Button disabled={props.saving} onClick={props.onSaveAnimal}>
                Save friend
              </Button>
            </VStack>

            <VStack alignItems="stretch" gap="3">
              <Button size="lg" onClick={props.onLogSleepover}>
                Had a sleepover last night!
              </Button>
              <Show when={!hasRecentSelectedSleep()}>
                <Box class={quietNoteClass}>You haven't snuggled this friend lately.</Box>
              </Show>
              <SleepCalendar days={days()} animals={[animal()]} compact />
            </VStack>

            <HStack justifyContent="end">
              <IconButton
                variant="outline"
                aria-label={`Delete ${animal().name}`}
                onClick={props.onDeleteAnimal}
              >
                <Trash2 size={18} />
              </IconButton>
            </HStack>
          </VStack>
        )}
      </Show>
    </Box>
  );
}

function LabeledInput(props: {
  label: string;
  value: string;
  onInput: (value: string) => void;
}) {
  const id = () => `field-${props.label.toLowerCase()}`;
  return (
    <Box>
      <label class={labelClass} for={id()}>
        {props.label}
      </label>
      <Input
        id={id()}
        value={props.value}
        onInput={(event) => props.onInput(event.currentTarget.value)}
      />
    </Box>
  );
}

function SleepCalendar(props: {
  days: Array<{ date: string; label: string }>;
  animals: ClientAnimal[];
  compact?: boolean;
}) {
  const animalsForDate = (date: string) =>
    props.animals.filter((animal) => animal.sleepLog.some((entry) => entry.date === date));

  return (
    <Box class={calendarClass} data-compact={props.compact ? "true" : "false"}>
      <For each={props.days}>
        {(day) => {
          const sleepers = () => animalsForDate(day.date);
          return (
            <Box class={dayClass}>
              <Box class={dayLabelClass}>{day.label}</Box>
              <Box class={sleepPileClass}>
                <For each={sleepers().slice(0, 4)}>
                  {(animal, index) => (
                    <img
                      src={animal.image.stickerUrl}
                      alt={animal.name}
                      style={{
                        transform: `translateX(${index() * -8}px) rotate(${index() % 2 === 0 ? -6 : 6}deg)`,
                        "z-index": String(index() + 1),
                      }}
                    />
                  )}
                </For>
                <Show when={sleepers().length === 0}>
                  <Box class={emptyDayClass}>-</Box>
                </Show>
              </Box>
            </Box>
          );
        }}
      </For>
    </Box>
  );
}

const lastDays = (count: number) => {
  const formatter = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "numeric",
    day: "numeric",
  });
  return Array.from({ length: count }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (count - index));
    return {
      date: date.toISOString().slice(0, 10),
      label: formatter.format(date),
    };
  });
};

const paneClass = css({
  h: { base: "auto", md: "calc(100dvh - 32px)" },
  overflowY: "auto",
  borderRadius: "2xl",
  borderWidth: "1px",
  borderColor: "orange.subtle.border",
  bg: "bg.default",
  p: { base: "4", md: "5" },
  boxShadow: "lg",
});

const sectionTitleClass = css({
  fontSize: "xl",
  fontWeight: "bold",
  color: "fg.default",
});

const stickerPreviewClass = css({
  display: "grid",
  placeItems: "center",
  minH: "220px",
  borderRadius: "xl",
  bg: "orange.subtle.bg",
  overflow: "hidden",
  "& img": {
    maxW: "90%",
    maxH: "220px",
    objectFit: "contain",
    filter: "drop-shadow(0 10px 0 rgba(255,255,255,.9)) drop-shadow(0 18px 18px rgba(60, 45, 24, .22))",
  },
});

const labelClass = css({
  display: "block",
  mb: "1.5",
  fontWeight: "bold",
  color: "fg.default",
});

const quietNoteClass = css({
  borderRadius: "lg",
  bg: "amber.subtle.bg",
  color: "amber.subtle.fg",
  px: "3",
  py: "2",
  fontWeight: "semibold",
});

const calendarClass = css({
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "2",
  '&[data-compact="true"]': {
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  },
});

const dayClass = css({
  minH: "72px",
  borderRadius: "lg",
  borderWidth: "1px",
  borderColor: "border",
  bg: "bg.subtle",
  p: "2",
  overflow: "hidden",
});

const dayLabelClass = css({
  fontSize: "xs",
  fontWeight: "bold",
  color: "fg.muted",
  mb: "1",
});

const sleepPileClass = css({
  position: "relative",
  display: "flex",
  alignItems: "center",
  minH: "38px",
  pl: "1",
  "& img": {
    position: "relative",
    w: "38px",
    h: "38px",
    objectFit: "contain",
    filter: "drop-shadow(0 5px 5px rgba(60,45,24,.24))",
  },
});

const emptyDayClass = css({
  color: "fg.subtle",
  fontWeight: "bold",
});
