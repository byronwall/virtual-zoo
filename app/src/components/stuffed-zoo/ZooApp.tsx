import { createEffect, createResource, createSignal, onCleanup, onMount, Show } from "solid-js";
import { createStore } from "solid-js/store";
import { Plus, Printer, ShieldCheck } from "lucide-solid";
import { Box, Grid, HStack, VStack } from "styled-system/jsx";
import { Button, Input, Text } from "~/components/ui";
import { ContactSheetDialog } from "./ContactSheetDialog";
import { UploadDialog, type UploadDraft } from "./UploadDialog";
import { ZooCanvas } from "./ZooCanvas";
import { DetailPane } from "./DetailPane";
import { appContentClass, appFrameClass, appHeaderClass, appLogoClass, appShellClass, appTitleClass } from "./ZooApp.styles";
import { deletePromptClass, errorClass, passcodeBoxClass } from "./ZooApp.styles";
import { passcodeShellClass } from "./ZooApp.styles";
import { getSiteConfig, getSiteIconHref } from "~/lib/site-config";
import type { ClientAnimal, ZooSnapshot } from "./types";

type Draft = {
  name: string;
  type: string;
  notes: string;
};

const emptyDraft = (): Draft => ({ name: "", type: "", notes: "" });
const emptyUploadDraft = (): UploadDraft => ({ ...emptyDraft(), photo: null });
const BACKGROUND_REMOVAL_POLL_MS = 3500;

export function ZooApp() {
  const siteConfig = getSiteConfig();
  const [session, { refetch: refetchSession }] = createResource(fetchSession);
  const [snapshot, { refetch }] = createResource(
    () => session()?.authenticated,
    async (authenticated) => (authenticated ? fetchZooSnapshot() : null),
  );
  const [selectedAnimalId, setSelectedAnimalId] = createSignal<string | null>(null);
  const [passcode, setPasscode] = createSignal("");
  const [passcodeError, setPasscodeError] = createSignal("");
  const [uploadOpen, setUploadOpen] = createSignal(false);
  const [contactSheetOpen, setContactSheetOpen] = createSignal(false);
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

  createEffect(() => {
    if (!session.latest?.authenticated) return;
    const hasQueuedImages = animals().some(
      (animal) => animal.image.backgroundRemovalStatus === "pending",
    );
    if (!hasQueuedImages) return;

    const timer = window.setInterval(() => {
      void refetch();
    }, BACKGROUND_REMOVAL_POLL_MS);
    onCleanup(() => window.clearInterval(timer));
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
    <Box class={appShellClass}>
      <Show
        when={session.latest?.authenticated}
        fallback={
          <PasscodeView
            passcode={passcode()}
            error={passcodeError()}
            title={siteConfig.title}
            onPasscodeChange={setPasscode}
            onLogin={handleLogin}
          />
        }
      >
        <VStack class={appFrameClass} alignItems="stretch" gap="3" p={{ base: "3", md: "4" }}>
          <HStack class={appHeaderClass} justifyContent="space-between" gap="3">
            <HStack alignItems="center" gap="3" minW="0">
              <img
                class={appLogoClass}
                src={getSiteIconHref(siteConfig, "android-chrome-192x192.png")}
                width="56"
                height="56"
                alt=""
                aria-hidden="true"
              />
              <Box minW="0">
                <Box class={appTitleClass}>{siteConfig.title}</Box>
                <Text color="fg.muted">Move friends around, add photos, and track sleepovers.</Text>
              </Box>
            </HStack>
            <HStack gap="2" flexWrap="wrap" justifyContent="end">
              <Button
                size="lg"
                variant="outline"
                disabled={animals().length === 0}
                onClick={() => setContactSheetOpen(true)}
              >
                <Printer size={20} />
                Print list
              </Button>
              <Button
                size="lg"
                onClick={() => {
                  setUploadDraft(emptyUploadDraft());
                  setUploadOpen(true);
                }}
              >
                <Plus size={20} />
                Add friend
              </Button>
            </HStack>
          </HStack>

          <Grid class={appContentClass} gap="4">
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
              onCloseAnimal={() => setSelectedAnimalId(null)}
            />
          </Grid>
        </VStack>
      </Show>

      <UploadDialog
        open={uploadOpen()}
        draft={uploadDraft}
        busy={busy()}
        onClose={() => setUploadOpen(false)}
        onDraftChange={(field, value) => setUploadDraft(field, value)}
        onPhotoChange={(photo) => setUploadDraft("photo", photo)}
        onUpload={handleUpload}
      />

      <ContactSheetDialog
        open={contactSheetOpen()}
        animals={animals()}
        onClose={() => setContactSheetOpen(false)}
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
  title: string;
  onPasscodeChange: (value: string) => void;
  onLogin: () => void;
}) {
  return (
    <Box class={passcodeShellClass}>
      <VStack class={passcodeBoxClass} alignItems="stretch" gap="4">
        <HStack gap="3">
          <ShieldCheck size={26} />
          <Box class={appTitleClass}>{props.title}</Box>
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

const fetchSession = async () =>
  typeof window === "undefined"
    ? { authenticated: false }
    : readJsonResponse<{ authenticated: boolean }>(await fetch("/api/zoo/session", {
        credentials: "include",
        headers: zooAuthHeaders(),
      }), "GET /api/zoo/session");

const fetchZooSnapshot = async () =>
  typeof window === "undefined"
    ? null
    : readJsonResponse<ZooSnapshot>(await fetch("/api/zoo/animals", {
        credentials: "include",
        headers: zooAuthHeaders(),
      }), "GET /api/zoo/animals");

const readJsonResponse = async <T,>(response: Response, label: string) => {
  const contentType = response.headers.get("content-type") ?? "";
  if (!response.ok) {
    const responseText = await response.text().catch(() => "");
    const details = responseText.trim().slice(0, 240) || response.statusText;
    throw new Error(`${label} failed with ${response.status}: ${details}`);
  }
  if (!contentType.includes("application/json")) {
    const responseText = await response.text().catch(() => "");
    throw new Error(
      `${label} returned ${contentType || "unknown content type"}: ${responseText.trim().slice(0, 240)}`,
    );
  }
  return (await response.json()) as T;
};

const zooAuthHeaders = (): Record<string, string> => {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("stuffed_zoo_pass");
  return token ? { "x-stuffed-zoo-pass": token } : {};
};
