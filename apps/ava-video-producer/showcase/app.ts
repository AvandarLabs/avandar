import { FilmDownloads } from "./FilmDownloads/FilmDownloads";
import { watchFilms } from "./watchFilms/watchFilms";

type Chapter = readonly [time: number, label: string];
type Clip = Readonly<{
  id: string;
  title: string;
  provenance: string;
  description: string;
  source: string;
  chapters: readonly Chapter[];
  note: string;
}>;

const CLIPS: readonly Clip[] = [
  {
    id: "avandar-home",
    title: "From query to comparison",
    provenance: "AVANDAR COMPONENTS / FICTIONAL DATA",
    description:
      "Avandar’s actual Data Explorer: write a query, run a district comparison, and reveal the bar chart. Real product components and styles, animated with fictional Harborfield data.",
    source: "apps/ava-video-producer/storyboards/home.json",
    chapters: [
      [0, "Title"],
      [4.47, "Write a query"],
      [12, "Run comparison"],
      [13.67, "Visualization"],
      [14.67, "Bar chart"],
    ],
    note: "Watch the cursor hold during typing, the query results resolve, and the chart reveal. Fixture-driven animation; no live backend query is executed.",
  },
  {
    id: "title-study",
    title: "Words in motion",
    provenance: "NEW STUDY / EXISTING TITLE COMPONENT",
    description:
      "Three uses of the starter’s unchanged TitleCard component. Only the words change: a product name, a section title, and a closing message. Each treatment includes the original word masks, accent line, and delayed subtitle.",
    source: "apps/ava-video-producer/src/compositions/TitleStudy.tsx",
    chapters: [
      [0, "Product name"],
      [2.8, "Section title"],
      [5.6, "Closing message"],
    ],
    note: "Try 0.5× speed. Each word rises behind a hard mask; the subtitle follows after the headline.",
  },
  {
    id: "motion-lab",
    title: "The small details",
    provenance: "NEW STUDY / EXISTING MOTION HELPERS",
    description:
      "A new sample layout that isolates four things already in the kit: staggered entrances, typed text, counting, and a pointer that stops before it presses. This is a component study, not an Avandar product screen.",
    source: "apps/ava-video-producer/src/compositions/MotionLab.tsx",
    chapters: [
      [0, "Title"],
      [2.8, "Stagger"],
      [4.47, "Typing"],
      [6.27, "Counter"],
      [8.6, "Click response"],
    ],
    note: "The layout is new. Shared motion helpers, fonts and palette come from the starter; the macOS cursor adds smooth click feedback and subtle motion blur.",
  },
];

/** Returns the element a page must contain, or throws when it is missing. */
function _requireElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) {
    throw new Error(`Missing showcase element: ${selector}`);
  }
  return element;
}

const player = _requireElement<HTMLIFrameElement>("#player");
const speed = _requireElement<HTMLSelectElement>("#speed");
const loop = _requireElement<HTMLInputElement>("#loop");
const downloadButton = _requireElement<HTMLButtonElement>("#download");
const exportStatus = _requireElement<HTMLElement>("#export-status");
const clipOptions = new Map<string, { captions: boolean }>();
let currentIndex = 0;
let isAwaitingPlayer = true;
let shouldPlayWhenReady = false;
let pendingControls: Array<{ action: string; value?: number | boolean }> = [];

function _control(action: string, value?: number | boolean): void {
  if (isAwaitingPlayer) {
    if (!["speed", "loop"].includes(action)) {
      pendingControls.push({ action, value });
    }
    return;
  }
  player.contentWindow?.postMessage(
    { type: "film-control", action, value },
    window.location.origin,
  );
}

function _createChapterButton([time, label]: Chapter): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  const stamp = document.createElement("time");
  stamp.textContent = `0:${String(Math.floor(time)).padStart(2, "0")}`;
  button.append(stamp, document.createTextNode(label));
  button.setAttribute(
    "aria-label",
    `Jump to ${label} at ${time.toFixed(1)} seconds`,
  );
  button.addEventListener("click", () => {
    _control("seek", Math.round(time * 30));
    _control("play");
  });
  return button;
}

function _updateDetails(index: number): void {
  const clip = CLIPS[index];
  _requireElement("#clip-count").textContent = `CLIP 0${index + 1} / 03`;
  (
    [
      ["clip-title", "title"],
      ["provenance", "provenance"],
      ["clip-description", "description"],
      ["watch-note", "note"],
    ] as const
  ).forEach(([id, key]) => {
    _requireElement(`#${id}`).textContent = clip[key];
  });
  _requireElement<HTMLAnchorElement>("#source-link").href =
    `https://github.com/AvandarLabs/avandar/blob/develop/${clip.source}`;
  downloadButton.setAttribute("aria-label", `Download ${clip.title} as MP4`);
  document.querySelectorAll<HTMLElement>("[data-clip]").forEach((button) => {
    const isSelected = Number(button.dataset.clip) === index;
    button.classList.toggle("selected", isSelected);
    button.setAttribute("aria-pressed", String(isSelected));
  });
  _requireElement("#chapters").replaceChildren(
    ...clip.chapters.map(_createChapterButton),
  );
}

function _restoreTransport(): void {
  _control("speed", Number(speed.value));
  _control("loop", loop.checked);
}

window.addEventListener("message", (event) => {
  if (
    event.origin !== window.location.origin ||
    event.source !== player.contentWindow
  ) {
    return;
  }
  if (
    event.data?.type !== "film-options" ||
    event.data.id !== CLIPS[currentIndex].id
  ) {
    return;
  }
  clipOptions.set(event.data.id, {
    captions: event.data.options?.captions !== false,
  });
  const wasAwaitingPlayer = isAwaitingPlayer;
  isAwaitingPlayer = false;
  _restoreTransport();
  if (!wasAwaitingPlayer) {
    return;
  }
  pendingControls.forEach(({ action, value }) => _control(action, value));
  pendingControls = [];
  if (shouldPlayWhenReady) {
    _control("play");
  }
  shouldPlayWhenReady = false;
});

document.querySelectorAll<HTMLElement>("[data-clip]").forEach((button) =>
  button.addEventListener("click", () => {
    const index = Number(button.dataset.clip);
    if (index === currentIndex) {
      _control("replay");
      return;
    }
    _control("pause");
    currentIndex = index;
    isAwaitingPlayer = true;
    shouldPlayWhenReady = true;
    pendingControls = [];
    player.title = `${CLIPS[index].title}: live preview`;
    player.src = `/live.html?id=${encodeURIComponent(CLIPS[index].id)}`;
    _updateDetails(currentIndex);
  }),
);
speed.addEventListener("change", () => _control("speed", Number(speed.value)));
loop.addEventListener("change", () => _control("loop", loop.checked));
_requireElement("#replay").addEventListener("click", () => _control("replay"));
player.addEventListener("load", _restoreTransport);

downloadButton.addEventListener("click", async () => {
  if (downloadButton.disabled) {
    return;
  }
  const clip = CLIPS[currentIndex];
  downloadButton.disabled = true;
  downloadButton.setAttribute("aria-busy", "true");
  try {
    await FilmDownloads.downloadFilm({
      id: clip.id,
      options: clipOptions.get(clip.id) ?? {},
      onStatus: (job) => {
        exportStatus.hidden = false;
        exportStatus.textContent = `${clip.title}: ${job.message}`;
        exportStatus.dataset.state = job.state;
      },
    });
  } catch {
    // The shared downloader reports failures in the live export status.
  } finally {
    downloadButton.disabled = false;
    downloadButton.removeAttribute("aria-busy");
  }
});
_updateDetails(0);
player.src = player.dataset.src ?? "";
watchFilms([player]);
