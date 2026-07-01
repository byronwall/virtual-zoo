import { createMemo, For, Show } from "solid-js";
import { Printer } from "lucide-solid";
import { Box, HStack } from "styled-system/jsx";
import { Button, SimpleDialog, Text } from "~/components/ui";
import {
  contactSheetCardClass,
  contactSheetCheckClass,
  contactSheetDialogContentClass,
  contactSheetEmptyClass,
  contactSheetGridClass,
  contactSheetHeaderClass,
  contactSheetImageFrameClass,
  contactSheetMetaClass,
  contactSheetNameClass,
  contactSheetPreviewClass,
  contactSheetTitleClass,
} from "./ContactSheetDialog.styles";
import type { ClientAnimal } from "./types";

type ContactSheetDialogProps = {
  open: boolean;
  animals: ClientAnimal[];
  onClose: () => void;
};

const printScopeClass = "zoo-contact-sheet-print";

const printStyles = `
@page {
  size: letter portrait;
  margin: 0.32in;
}

@media print {
  html,
  body {
    width: 8.5in;
    min-height: 11in;
    background: white !important;
  }

  body * {
    visibility: hidden !important;
  }

  .${printScopeClass},
  .${printScopeClass} * {
    visibility: visible !important;
  }

  .${printScopeClass} {
    position: fixed !important;
    inset: 0 !important;
    width: auto !important;
    min-height: auto !important;
    overflow: visible !important;
  }
}
`;

export function ContactSheetDialog(props: ContactSheetDialogProps) {
  const sortedAnimals = createMemo(() =>
    [...props.animals].sort((first, second) =>
      first.name.localeCompare(second.name, undefined, { sensitivity: "base" }),
    ),
  );

  const handlePrint = () => {
    if (typeof window === "undefined") return;
    window.print();
  };

  return (
    <SimpleDialog
      open={props.open}
      onOpenChange={(open) => {
        if (!open) props.onClose();
      }}
      title="Print wish list"
      description="Preview the contact sheet, then print it for marking favorites by hand."
      maxW="980px"
      contentClass={contactSheetDialogContentClass}
      footer={
        <HStack justifyContent="end" gap="2">
          <Button variant="outline" onClick={props.onClose}>
            Cancel
          </Button>
          <Button disabled={sortedAnimals().length === 0} onClick={handlePrint}>
            <Printer size={18} />
            Print sheet
          </Button>
        </HStack>
      }
    >
      <style>{printStyles}</style>
      <Box class={`${contactSheetPreviewClass} ${printScopeClass}`}>
        <Box class={contactSheetHeaderClass}>
          <Box minW="0">
            <Box class={contactSheetTitleClass}>Stuffed Animal Wish List</Box>
            <Text color="fg.muted">Circle the friends you want to choose.</Text>
          </Box>
          <Box class={contactSheetMetaClass}>{sortedAnimals().length} friends</Box>
        </Box>

        <Show
          when={sortedAnimals().length > 0}
          fallback={<Box class={contactSheetEmptyClass}>Add animals before printing a wish list.</Box>}
        >
          <Box class={contactSheetGridClass}>
            <For each={sortedAnimals()}>
              {(animal) => (
                <Box class={contactSheetCardClass}>
                  <Box class={contactSheetCheckClass} aria-hidden="true" />
                  <Box class={contactSheetImageFrameClass}>
                    <img src={animal.image.stickerUrl} alt={animal.name} loading="eager" />
                  </Box>
                  <Box class={contactSheetNameClass}>{animal.name}</Box>
                </Box>
              )}
            </For>
          </Box>
        </Show>
      </Box>
    </SimpleDialog>
  );
}
