import fs from "node:fs/promises";
import path from "node:path";
import { propEq } from "@avandar/utils";
import { STOCK_LOOP_FRAMES, STOCK_FPS } from "../../src/stock/stockEntry";
import { VideoThemeSnapshots } from "../../src/videoTheme/VideoThemeSnapshots/VideoThemeSnapshots";
import { getSha256FromFile } from "../lib/getSha256FromFile";
import { MediaHelpers } from "../lib/MediaHelpers/MediaHelpers";
import { ensureDirectory } from "../lib/planHelpers/planHelpers";
import {
  type StockFingerprint,
  StockFingerprintModule,
} from "../stock/StockFingerprintModule/StockFingerprintModule";
import { makeFreshMotionDirectory } from "./makeFreshMotionDirectory";
import { ROOT } from "./motion.constants";
import type { MotionRequest } from "../MotionRequests/MotionRequests";

async function _renderAndCheckStock({
  motionRequest,
  directory,
  publicDirectory,
}: Readonly<{
  motionRequest: MotionRequest;
  directory: string;
  publicDirectory: string;
}>): Promise<{
  video: string;
  info: Awaited<ReturnType<typeof _checkStockVideo>>;
}> {
  const { entry } = motionRequest;
  const output = await _renderStock({
    motionRequest,
    options: {
      directory,
      publicDirectory: publicDirectory,
    },
  });
  await fs.writeFile(path.join(directory, "render.log"), output);
  const video = path.join(directory, `${entry.id}.mp4`);
  const info = await _checkStockVideo({
    video,
    presetId: entry.id,
  });
  return { video, info };
}
/** What `_writeDeliveryRecord` needs to describe one delivered preset. */
type StockDelivery = {
  motionRequest: MotionRequest;
  fingerprint: StockFingerprint;
  destination: string;
  video: string;
  seconds: number;
};
/** Runs `render.sh` for one preset into `directory`; returns its log. */
async function _renderStock({
  motionRequest,
  options,
}: Readonly<{
  motionRequest: Readonly<MotionRequest>;
  options: Readonly<{
    directory: string;
    publicDirectory: string;
  }>;
}>): Promise<string> {
  const propsFile = path.join(options.directory, "inputs.json");
  await fs.writeFile(
    propsFile,
    JSON.stringify({ ...motionRequest.request, theme: motionRequest.theme }),
  );
  return MediaHelpers.run({
    command: "sh",
    args: [
      path.join(ROOT, "scripts/render.sh"),
      `stock-${motionRequest.entry.id}`,
      "90",
    ],
    options: {
      quiet: true,
      cwd: ROOT,
      env: {
        ...process.env,
        RENDER_OUT_DIR: options.directory,
        RENDER_OUTPUT_ID: motionRequest.entry.id,
        REMOTION_PROPS_FILE: propsFile,
        DELIVER: "1280:800",
        STANDALONE: "0",
        KEEP_RENDER_FRAMES: "1",
        RENDER_ENTRY_POINT: "src/stock-entry.tsx",
        RENDER_PUBLIC_DIR: options.publicDirectory,
      },
    },
  });
}
/** Probes a stock render, refusing anything but a 6 s 1280x800 30 fps loop. */
async function _checkStockVideo({
  video,
  presetId,
}: Readonly<{
  video: string;
  presetId: string;
}>): Promise<Awaited<ReturnType<typeof MediaHelpers.probe>>> {
  const info = await MediaHelpers.probe(video);
  const stream = info.streams.find(propEq("codec_type", "video"));
  if (
    info.duration !== 6 ||
    stream?.width !== 1280 ||
    stream.height !== 800 ||
    stream.avg_frame_rate !== "30/1" ||
    Number(stream.nb_frames) !== STOCK_LOOP_FRAMES
  ) {
    throw new Error(`Unexpected media metadata: ${presetId}`);
  }
  return info;
}
/** Backs up the preset's current delivery, then copies in the new render. */
async function _replaceDelivery(
  options: Readonly<{
    presetId: string;
    directory: string;
    destination: string;
  }>,
): Promise<void> {
  const { presetId, directory, destination } = options;
  // Existing delivery files stay recoverable even when rerendering one preset.
  const backup = await ensureDirectory({
    root: ROOT,
    relative: `out/motion/backups/${presetId}-${Date.now()}`,
  });
  for (const suffix of [".mp4", "-poster.jpg", ".json"]) {
    const deliveredFile = path.join(destination, `${presetId}${suffix}`);
    try {
      await fs.copyFile(
        deliveredFile,
        path.join(backup, path.basename(deliveredFile)),
      );
    } catch (error) {
      if (
        !(error instanceof Error && "code" in error && error.code === "ENOENT")
      ) {
        throw error;
      }
    }
  }
  for (const suffix of [".mp4", "-poster.jpg"]) {
    await fs.copyFile(
      path.join(directory, `${presetId}${suffix}`),
      path.join(destination, `${presetId}${suffix}`),
    );
  }
}
/** Writes the delivery record beside a preset's delivered video. */
async function _writeDeliveryRecord(
  options: Readonly<StockDelivery>,
): Promise<void> {
  const { motionRequest, fingerprint, destination } = options;
  const { entry, request, theme } = motionRequest;
  const record = {
    preset: entry.id,
    fingerprint,
    request,
    themeId: theme.themeId,
    themeHash: VideoThemeSnapshots.toResolvedTheme({
      snapshot: theme,
      overrideIds: [entry.id],
    }).hash,
    frames: STOCK_LOOP_FRAMES,
    fps: STOCK_FPS,
    width: 1280,
    height: 800,
    seconds: options.seconds,
    audio: false,
    gate: "passed including loop seam",
    videoSha256: await getSha256FromFile(options.video),
    posterSha256: await getSha256FromFile(
      path.join(destination, `${entry.id}-poster.jpg`),
    ),
    generatedAt: new Date().toISOString(),
  };
  await fs.writeFile(
    path.join(destination, `${entry.id}.json`),
    `${JSON.stringify(record, null, 2)}\n`,
  );
}
/** Renders, gates, and delivers one preset under `out/motion/deliveries/`. */
async function _renderRequest({
  motionRequest,
  options,
}: Readonly<{
  motionRequest: Readonly<MotionRequest>;
  options: Readonly<{
    digest: string;
    destination: string;
    publicDirectory: string;
  }>;
}>): Promise<void> {
  const { entry, request, sourceHash } = motionRequest;
  const sourceCheck = { root: ROOT, sourceHash: options.digest };
  await StockFingerprintModule.verifySources(sourceCheck);
  const fingerprint = await StockFingerprintModule.fromRequest({
    root: ROOT,
    request,
    expectedSourceHash: sourceHash,
  });
  const directory = await makeFreshMotionDirectory(
    `render/${entry.id}/${fingerprint.configurationHash}`,
  );
  const { video, info } = await _renderAndCheckStock({
    motionRequest,
    directory,
    publicDirectory: options.publicDirectory,
  });
  await StockFingerprintModule.verifySources(sourceCheck);
  const { destination } = options;
  await _replaceDelivery({ presetId: entry.id, directory, destination });
  await _writeDeliveryRecord({
    motionRequest,
    fingerprint,
    destination,
    video,
    seconds: info.duration,
  });
  console.log(`Rendered and gated: ${entry.id}`);
  await fs.rm(path.join(directory, `${entry.id}-frames`), { recursive: true });
}
/**
 * Renders, gates, and delivers every request one at a time under
 * `out/motion/deliveries/`, after checking that each has a current preview.
 */
export async function renderMotionRequests(
  requests: readonly MotionRequest[],
): Promise<void> {
  const digest = await StockFingerprintModule.getSourceHashFromRoot(ROOT);
  // Check the whole selection before spending time on a partial batch.
  await Promise.all(
    requests.map(async ({ entry, request, sourceHash, theme }) => {
      await StockFingerprintModule.requirePreview({
        root: ROOT,
        preset: entry.id,
        fingerprint: await StockFingerprintModule.fromRequest({
          root: ROOT,
          request: { ...request, theme },
          expectedSourceHash: sourceHash,
        }),
      });
    }),
  );
  const destination = await ensureDirectory({
    root: ROOT,
    relative: "out/motion/deliveries",
  });
  const publicDirectory = await ensureDirectory({
    root: ROOT,
    relative: "out/motion/empty-public",
  });
  // Renders are serial: Remotion renders run with concurrency 1.
  for (const motionRequest of requests) {
    await _renderRequest({
      motionRequest,
      options: {
        digest,
        destination,
        publicDirectory,
      },
    });
  }
}
