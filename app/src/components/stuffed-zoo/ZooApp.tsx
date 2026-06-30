import { createEffect, createResource, createSignal, For, Show, onMount } from "solid-js";
import { createStore } from "solid-js/store";
import { Camera, Plus, ShieldCheck } from "lucide-solid";
import { css } from "styled-system/css";
import { Box, Grid, HStack, VStack } from "styled-system/jsx";
import { Button, Input, SimpleDialog, Text, Textarea } from "~/components/ui";
import { ZooCanvas } from "./ZooCanvas";
import { DetailPane } from "./DetailPane";
import type { ClientAnimal, ZooSnapshot } from "./types";

type Draft = {
  name: string;
  type: string;
  notes: string;
};

type UploadDraft = Draft & {
  photo: File | null;
};

const emptyDraft = (): Draft => ({ name: "", type: "cat", notes: "" });
const emptyUploadDraft = (): UploadDraft => ({ ...emptyDraft(), photo: null });

export function ZooApp() {
  const [session, { refetch: refetchSession }] = createResource(fetchSession);
  const [snapshot, { refetch }] = createResource(
    () => session()?.authenticated,
    async (authenticated) => (authenticated ? fetchZooSnapshot() : null),
  );
  const [selectedAnimalId, setSelectedAnimalId] = createSignal<string | null>(null);
  const [passcode, setPasscode] = createSignal("");
  const [passcodeError, setPasscodeError] = createSignal("");
  const [uploadOpen, setUploadOpen] = createSignal(false);
  const [deleteConfirming, setDeleteConfirming] = createSignal(false);
  const [busy, setBusy] = createSignal(false);
  const [draft, setDraft] = createStore<Draft>(emptyDraft());
  const [uploadDraft, setUploadDraft] = createStore<UploadDraft>(emptyUploadDraft());

  const animals = () => snapshot.latest?.animals ?? [];
  const customTypes = () => snapshot.latest?.customTypes ?? ["cat", "dog", "axolotl"];
  const selectedAnimal = () =>
    animals().find((animal) => animal.id === selectedAnimalId()) ?? null;

  onMount(() => {
    void refetchSession();
  });

  createEffect(() => {
    const animal = selectedAnimal();
    if (!animal) {
      setDraft(emptyDraft());
      setDeleteConfirming(false);
      return;
    }
    setDraft({
      name: animal.name,
      type: animal.type,
      notes: animal.notes,
    });
  });

  const handleLogin = async () => {
    setPasscodeError("");
    const response = await fetch("/api/zoo/login", {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ passcode: passcode() }),
    });
    if (!response.ok) {
      setPasscodeError("That passcode did not open the zoo.");
      return;
    }
    const body = (await response.json()) as { cookieValue?: string };
    if (body.cookieValue) {
      document.cookie = `stuffed_zoo_pass=${encodeURIComponent(body.cookieValue)}; Path=/; Max-Age=630720000; SameSite=Lax`;
      localStorage.setItem("stuffed_zoo_pass", body.cookieValue);
    }
    setPasscode("");
    await refetchSession();
  };

  const handleUpload = async () => {
    if (!uploadDraft.photo) return;
    setBusy(true);
    const formData = new FormData();
    formData.append("photo", uploadDraft.photo);
    formData.append("name", uploadDraft.name || "New friend");
    formData.append("type", uploadDraft.type || "friend");
    formData.append("notes", uploadDraft.notes);
    const response = await fetch("/api/zoo/upload", {
      method: "POST",
      credentials: "include",
      headers: zooAuthHeaders(),
      body: formData,
    });
    setBusy(false);
    if (!response.ok) return;
    const body = (await response.json()) as { animal: ClientAnimal };
    setSelectedAnimalId(body.animal.id);
    setUploadDraft(emptyUploadDraft());
    setUploadOpen(false);
    await refetch();
  };

  const handleSaveAnimal = async () => {
    const animal = selectedAnimal();
    if (!animal) return;
    setBusy(true);
    await fetch("/api/zoo/animals", {
      method: "PATCH",
      credentials: "include",
      headers: { ...zooAuthHeaders(), "content-type": "application/json" },
      body: JSON.stringify({ id: animal.id, ...draft }),
    });
    setBusy(false);
    await refetch();
  };

  const handleLogSleepover = async () => {
    const animal = selectedAnimal();
    if (!animal) return;
    await fetch("/api/zoo/animals", {
      method: "PATCH",
      credentials: "include",
      headers: { ...zooAuthHeaders(), "content-type": "application/json" },
      body: JSON.stringify({ intent: "sleepover", id: animal.id }),
    });
    await refetch();
  };

  const handleMoveAnimal = async (id: string, x: number, y: number, zIndex: number) => {
    await fetch("/api/zoo/animals", {
      method: "PATCH",
      credentials: "include",
      headers: { ...zooAuthHeaders(), "content-type": "application/json" },
      body: JSON.stringify({ intent: "position", id, x, y, zIndex }),
    });
    await refetch();
  };

  const handleDelete = async () => {
    const animal = selectedAnimal();
    if (!animal) return;
    if (!deleteConfirming()) {
      setDeleteConfirming(true);
      return;
    }
    await fetch("/api/zoo/animals", {
      method: "DELETE",
      credentials: "include",
      headers: { ...zooAuthHeaders(), "content-type": "application/json" },
      body: JSON.stringify({ id: animal.id }),
    });
    setSelectedAnimalId(null);
    setDeleteConfirming(false);
    await refetch();
  };

  return (
    <Box minH="dvh" bg="amber.subtle.bg" color="fg.default">
      <Show
        when={session.latest?.authenticated}
        fallback={
          <PasscodeView
            passcode={passcode()}
            error={passcodeError()}
            onPasscodeChange={setPasscode}
            onLogin={handleLogin}
          />
        }
      >
        <VStack alignItems="stretch" gap="3" p={{ base: "3", md: "4" }}>
          <HStack justifyContent="space-between" gap="3" flexWrap="wrap">
            <Box>
              <Box class={appTitleClass}>Violet's Stuffed Animal Zoo</Box>
              <Text color="fg.muted">Move friends around, add photos, and track sleepovers.</Text>
            </Box>
            <Button size="lg" onClick={() => setUploadOpen(true)}>
              <Plus size={20} />
              Add friend
            </Button>
          </HStack>

          <Grid gridTemplateColumns={{ base: "1fr", lg: "minmax(0, 1fr) 360px" }} gap="4">
            <ZooCanvas
              animals={animals()}
              selectedAnimalId={selectedAnimalId()}
              onSelectAnimal={setSelectedAnimalId}
              onMoveAnimal={handleMoveAnimal}
            />
            <DetailPane
              animals={animals()}
              selectedAnimal={selectedAnimal()}
              customTypes={customTypes()}
              draft={draft}
              saving={busy()}
              onDraftChange={(field, value) => setDraft(field, value)}
              onSaveAnimal={handleSaveAnimal}
              onLogSleepover={handleLogSleepover}
              onDeleteAnimal={handleDelete}
            />
          </Grid>
        </VStack>
      </Show>

      <UploadDialog
        open={uploadOpen()}
        draft={uploadDraft}
        customTypes={customTypes()}
        busy={busy()}
        onClose={() => setUploadOpen(false)}
        onDraftChange={(field, value) => setUploadDraft(field, value)}
        onPhotoChange={(photo) => setUploadDraft("photo", photo)}
        onUpload={handleUpload}
      />

      <Show when={deleteConfirming()}>
        <Box class={deletePromptClass}>
          Tap the trash again to delete this friend.
        </Box>
      </Show>
    </Box>
  );
}

function PasscodeView(props: {
  passcode: string;
  error: string;
  onPasscodeChange: (value: string) => void;
  onLogin: () => void;
}) {
  return (
    <Box class={passcodeShellClass}>
      <VStack class={passcodeBoxClass} alignItems="stretch" gap="4">
        <HStack gap="3">
          <ShieldCheck size={26} />
          <Box class={appTitleClass}>Violet's Stuffed Animal Zoo</Box>
        </HStack>
        <Text color="fg.muted">Enter the family passcode once to open the zoo on this iPad.</Text>
        <Input
          value={props.passcode}
          type="password"
          autocomplete="current-password"
          aria-label="Zoo passcode"
          onInput={(event) => props.onPasscodeChange(event.currentTarget.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") void props.onLogin();
          }}
        />
        <Show when={props.error}>
          {(error) => <Box class={errorClass}>{error()}</Box>}
        </Show>
        <Button size="lg" onClick={props.onLogin}>Open the zoo</Button>
      </VStack>
    </Box>
  );
}

function UploadDialog(props: {
  open: boolean;
  draft: UploadDraft;
  customTypes: string[];
  busy: boolean;
  onClose: () => void;
  onDraftChange: (field: "name" | "type" | "notes", value: string) => void;
  onPhotoChange: (photo: File | null) => void;
  onUpload: () => void;
}) {
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
            list="new-animal-types"
            value={props.draft.type}
            onInput={(event) => props.onDraftChange("type", event.currentTarget.value)}
          />
          <datalist id="new-animal-types">
            <For each={props.customTypes}>
              {(type) => <option value={type} />}
            </For>
          </datalist>
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

const fetchSession = async () =>
  typeof window === "undefined"
    ? { authenticated: false }
    : ((await fetch("/api/zoo/session", {
        credentials: "include",
        headers: zooAuthHeaders(),
      }).then((response) => response.json())) as {
        authenticated: boolean;
      });

const fetchZooSnapshot = async () =>
  typeof window === "undefined"
    ? null
    : ((await fetch("/api/zoo/animals", {
        credentials: "include",
        headers: zooAuthHeaders(),
      }).then((response) => response.json())) as ZooSnapshot);

const zooAuthHeaders = (): Record<string, string> => {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("stuffed_zoo_pass");
  return token ? { "x-stuffed-zoo-pass": token } : {};
};

const appTitleClass = css({
  fontSize: { base: "2xl", md: "3xl" },
  fontWeight: "extrabold",
  color: "fg.default",
});

const passcodeShellClass = css({
  minH: "dvh",
  display: "grid",
  placeItems: "center",
  p: "4",
});

const passcodeBoxClass = css({
  w: "full",
  maxW: "420px",
  p: "6",
  borderRadius: "2xl",
  bg: "bg.default",
  borderWidth: "1px",
  borderColor: "border",
  boxShadow: "xl",
});

const errorClass = css({
  color: "red.default",
  fontWeight: "semibold",
});

const photoPickerClass = css({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "3",
  minH: "96px",
  borderRadius: "xl",
  borderWidth: "2px",
  borderStyle: "dashed",
  borderColor: "orange.subtle.border",
  bg: "orange.subtle.bg",
  color: "orange.subtle.fg",
  fontWeight: "bold",
  cursor: "pointer",
  "& input": {
    srOnly: true,
  },
});

const labelClass = css({
  display: "block",
  mb: "1.5",
  fontWeight: "bold",
});

const deletePromptClass = css({
  position: "fixed",
  left: "50%",
  bottom: "5",
  transform: "translateX(-50%)",
  px: "4",
  py: "2",
  borderRadius: "full",
  bg: "red.default",
  color: "white",
  fontWeight: "bold",
  boxShadow: "lg",
});
