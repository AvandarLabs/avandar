import { downloadFilm } from "./download.js";
/* eslint-disable-next-line import-x/extensions -- Native browser modules require the .js extension. */
import { watchFilms } from "./watch-films.js";

const clips = [
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
const player = document.querySelector("#player");
const speed = document.querySelector("#speed");
const loop = document.querySelector("#loop");
const downloadButton = document.querySelector("#download");
const exportStatus = document.querySelector("#export-status");
const clipOptions = new Map();
let currentIndex = 0;
let isAwaitingPlayer = true;
let shouldPlayWhenReady = false;
let pendingControls = [];

function control(action, value) {
  if (isAwaitingPlayer) {
    if (!["speed", "loop"].includes(action))
      pendingControls.push({ action, value });
    return;
  }
  player.contentWindow?.postMessage(
    { type: "film-control", action, value },
    window.location.origin,
  );
}

function createChapterButton([time, label]) {
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
    control("seek", Math.round(time * 30));
    control("play");
  });
  return button;
}

function updateDetails(index) {
  const clip = clips[index];
  document.querySelector("#clip-count").textContent = `CLIP 0${index + 1} / 03`;
  [
    ["clip-title", "title"],
    ["provenance", "provenance"],
    ["clip-description", "description"],
    ["watch-note", "note"],
  ].forEach(([id, key]) => {
    document.getElementById(id).textContent = clip[key];
  });
  document.querySelector("#source-link").href =
    `https://github.com/AvandarLabs/avandar/blob/develop/${clip.source}`;
  downloadButton.setAttribute("aria-label", `Download ${clip.title} as MP4`);
  document.querySelectorAll("[data-clip]").forEach((button) => {
    const selected = Number(button.dataset.clip) === index;
    button.classList.toggle("selected", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
  document
    .querySelector("#chapters")
    .replaceChildren(...clip.chapters.map(createChapterButton));
}

function restoreTransport() {
  control("speed", Number(speed.value));
  control("loop", loop.checked);
}

window.addEventListener("message", (event) => {
  if (
    event.origin !== window.location.origin ||
    event.source !== player.contentWindow
  )
    return;
  if (
    event.data?.type !== "film-options" ||
    event.data.id !== clips[currentIndex].id
  )
    return;
  clipOptions.set(event.data.id, {
    captions: event.data.options?.captions !== false,
  });
  const wasAwaitingPlayer = isAwaitingPlayer;
  isAwaitingPlayer = false;
  restoreTransport();
  if (!wasAwaitingPlayer) return;
  pendingControls.forEach(({ action, value }) => control(action, value));
  pendingControls = [];
  if (shouldPlayWhenReady) control("play");
  shouldPlayWhenReady = false;
});

document.querySelectorAll("[data-clip]").forEach((button) =>
  button.addEventListener("click", () => {
    const index = Number(button.dataset.clip);
    if (index === currentIndex) return control("replay");
    control("pause");
    currentIndex = index;
    isAwaitingPlayer = true;
    shouldPlayWhenReady = true;
    pendingControls = [];
    player.title = `${clips[index].title}: live preview`;
    player.src = `/live.html?id=${encodeURIComponent(clips[index].id)}`;
    updateDetails(currentIndex);
  }),
);
speed.addEventListener("change", () => control("speed", Number(speed.value)));
loop.addEventListener("change", () => control("loop", loop.checked));
document
  .querySelector("#replay")
  .addEventListener("click", () => control("replay"));
player.addEventListener("load", restoreTransport);

downloadButton.addEventListener("click", async () => {
  if (downloadButton.disabled) return;
  const clip = clips[currentIndex];
  downloadButton.disabled = true;
  downloadButton.setAttribute("aria-busy", "true");
  try {
    await downloadFilm({
      id: clip.id,
      options: clipOptions.get(clip.id) || {},
      onStatus: (job) => {
        exportStatus.hidden = false;
        exportStatus.textContent = `${clip.title}: ${job.message}`;
        exportStatus.dataset.state = job.state;
      },
    });
  } catch {
    /* The shared downloader reports failures in the live export status. */
  } finally {
    downloadButton.disabled = false;
    downloadButton.removeAttribute("aria-busy");
  }
});
updateDetails(0);
player.src = player.dataset.src;
watchFilms([player]);
