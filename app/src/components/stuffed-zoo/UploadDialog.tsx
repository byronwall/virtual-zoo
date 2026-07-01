import { createEffect, createSignal, For, onCleanup, Show } from "solid-js";
import { Camera } from "lucide-solid";
import { Box, HStack, VStack } from "styled-system/jsx";
import { Button, Input, SimpleDialog, Textarea } from "~/components/ui";
import {
  labelClass,
  photoMediaRowClass,
  photoPickerClass,
  photoPreviewClass,
  typeQuickPickRowClass,
} from "./ZooApp.styles";

type Draft = {
  name: string;
  type: string;
  notes: string;
};

export type UploadDraft = Draft & {
  photo: File | null;
};

const commonAnimalTypes = ["bear", "dog", "cat", "bunny", "dinosaur", "unicorn", "horse", "lion"];

export function UploadDialog(props: {
  open: boolean;
  draft: UploadDraft;
  busy: boolean;
  onClose: () => void;
  onDraftChange: (field: "name" | "type" | "notes", value: string) => void;
  onPhotoChange: (photo: File | null) => void;
  onUpload: () => void;
}) {
  const [previewUrl, setPreviewUrl] = createSignal<string | null>(null);

  createEffect(() => {
    const photo = props.draft.photo;
    if (!photo) {
      setPreviewUrl(null);
      return;
    }

    const url = URL.createObjectURL(photo);
    setPreviewUrl(url);
    onCleanup(() => URL.revokeObjectURL(url));
  });

  return (
    <SimpleDialog
      open={props.open}
      onOpenChange={(open) => {
        if (!open) props.onClose();
      }}
      title="Add a stuffed friend"
      description="Take a picture on the iPad, then give this friend a name."
      footer={
        <HStack justifyContent="end" gap="2">
          <Button variant="outline" onClick={props.onClose}>Cancel</Button>
          <Button disabled={!props.draft.photo || props.busy} onClick={props.onUpload}>
            Add to zoo
          </Button>
        </HStack>
      }
    >
      <VStack alignItems="stretch" gap="4" w="full">
        <Box class={photoMediaRowClass}>
          <label class={photoPickerClass}>
            <Camera size={22} />
            <span>{props.draft.photo ? props.draft.photo.name : "Take or choose a photo"}</span>
            <input
              type="file"
              accept="image/*,.heic,.heif"
              capture="environment"
              onChange={(event) => props.onPhotoChange(event.currentTarget.files?.[0] ?? null)}
            />
          </label>
          <Box class={photoPreviewClass}>
            <Show when={previewUrl()} fallback={<span>No photo yet</span>}>
              {(url) => <img src={url()} alt="Selected stuffed animal preview" />}
            </Show>
          </Box>
        </Box>
        <Box>
          <label class={labelClass} for="new-animal-name">Name</label>
          <Input
            id="new-animal-name"
            value={props.draft.name}
            onInput={(event) => props.onDraftChange("name", event.currentTarget.value)}
          />
        </Box>
        <Box>
          <label class={labelClass} for="new-animal-type">Type</label>
          <Input
            id="new-animal-type"
            value={props.draft.type}
            onInput={(event) => props.onDraftChange("type", event.currentTarget.value)}
          />
          <AnimalTypeQuickPicks
            value={props.draft.type}
            onChange={(value) => props.onDraftChange("type", value)}
          />
        </Box>
        <Box>
          <label class={labelClass} for="new-animal-notes">Notes</label>
          <Textarea
            id="new-animal-notes"
            minH="24"
            value={props.draft.notes}
            onInput={(event) => props.onDraftChange("notes", event.currentTarget.value)}
          />
        </Box>
      </VStack>
    </SimpleDialog>
  );
}

function AnimalTypeQuickPicks(props: {
  value: string;
  onChange: (value: string) => void;
}) {
  const normalizedValue = () => normalizeAnimalType(props.value);

  return (
    <Box class={typeQuickPickRowClass} aria-label="Common animal types">
      <For each={commonAnimalTypes}>
        {(type) => {
          const active = () => normalizedValue() === normalizeAnimalType(type);
          return (
            <Button
              size="sm"
              variant={active() ? "solid" : "outline"}
              colorPalette={active() ? "orange" : "gray"}
              aria-pressed={active()}
              onClick={() => props.onChange(type)}
            >
              {type}
            </Button>
          );
        }}
      </For>
    </Box>
  );
}

const normalizeAnimalType = (value: string) => value.trim().toLowerCase();
