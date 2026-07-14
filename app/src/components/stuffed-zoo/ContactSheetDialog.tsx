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
  contactSheetPageClass,
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
const printDialogClass = "zoo-contact-sheet-dialog";
const printImageFrameClass = "zoo-contact-sheet-image-frame";
const animalsPerPrintPage = 15;

const chunkAnimalsForPrint = (animals: ClientAnimal[]) => {
  const pages: ClientAnimal[][] = [];

  for (let index = 0; index < animals.length; index += animalsPerPrintPage) {
    pages.push(animals.slice(index, index + animalsPerPrintPage));
  }

  return pages;
};

const printStyles = `
@page {
  size: letter landscape;
  margin: 0.32in;
}

@media print {
  html,
  body {
    width: auto;
    min-height: 0;
    margin: 0;
    background: white !important;
  }

  body * {
    visibility: hidden !important;
  }

  body > *:not(:has(.${printDialogClass})) {
    display: none !important;
  }

  body > :has(.${printDialogClass}) {
    display: block !important;
  }

  [data-scope="dialog"][data-part="backdrop"] {
    display: none !important;
  }

  [data-scope="dialog"][data-part="positioner"]:has(> .${printDialogClass}) {
    position: static !important;
    display: block !important;
    width: auto !important;
    height: auto !important;
    overflow: visible !important;
  }

  .${printDialogClass} {
    position: static !important;
    display: block !important;
    width: auto !important;
    max-width: none !important;
    max-height: none !important;
    margin: 0 !important;
    padding: 0 !important;
    overflow: visible !important;
    background: transparent !important;
    box-shadow: none !important;
    animation: none !important;
  }

  .${printDialogClass} > * {
    display: none !important;
  }

  .${printDialogClass} > :has(> .${printScopeClass}) {
    display: block !important;
    min-height: 0 !important;
    padding: 0 !important;
    overflow: visible !important;
  }

  .${printScopeClass},
  .${printScopeClass} * {
    visibility: visible !important;
  }

  .${printScopeClass} {
    position: static !important;
    width: auto !important;
    min-height: auto !important;
    overflow: visible !important;
  }

  .${printImageFrameClass} {
    aspect-ratio: auto !important;
    min-height: 0 !important;
  }
}
`;

export function ContactSheetDialog(props: ContactSheetDialogProps) {
  const sortedAnimals = createMemo(() =>
    [...props.animals].sort((first, second) =>
      first.name.localeCompare(second.name, undefined, { sensitivity: "base" }),
    ),
  );
  const printPages = createMemo(() => chunkAnimalsForPrint(sortedAnimals()));

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
      contentClass={`${contactSheetDialogContentClass} ${printDialogClass}`}
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
        <Show
          when={sortedAnimals().length > 0}
          fallback={<Box class={contactSheetEmptyClass}>Add animals before printing a wish list.</Box>}
        >
          <For each={printPages()}>
            {(pageAnimals) => (
              <Box class={contactSheetPageClass}>
                <Box class={contactSheetHeaderClass}>
                  <Box minW="0">
                    <Box class={contactSheetTitleClass}>Stuffed Animal Wish List</Box>
                    <Text color="fg.muted">Circle the friends you want to choose.</Text>
                  </Box>
                  <Box class={contactSheetMetaClass}>{sortedAnimals().length} friends</Box>
                </Box>

                <Box class={contactSheetGridClass}>
                  <For each={pageAnimals}>
                    {(animal) => (
                      <Box class={contactSheetCardClass}>
                        <Box class={contactSheetCheckClass} aria-hidden="true" />
                        <Box
                          class={`${contactSheetImageFrameClass} ${printImageFrameClass}`}
                        >
                          <img src={animal.image.imageUrl} alt={animal.name} loading="eager" />
                        </Box>
                        <Box class={contactSheetNameClass}>{animal.name}</Box>
                      </Box>
                    )}
                  </For>
                </Box>
              </Box>
            )}
          </For>
        </Show>
      </Box>
    </SimpleDialog>
  );
}
