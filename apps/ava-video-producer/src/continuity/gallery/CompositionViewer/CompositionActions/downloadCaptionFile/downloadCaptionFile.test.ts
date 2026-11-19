import assert from "node:assert/strict";
import test from "node:test";
import { downloadCaptionFile } from "./downloadCaptionFile";

const THEME = {
  id: "classic",
  patch: { other: { video: { semantic: { camera: { preset: "whip" } } } } },
};

test("a caption download posts the export's options and theme and saves the file", async () => {
  const requests: Array<{ url: string; body: unknown }> = [];
  const saved: Array<{ text: string; fileName: string }> = [];
  await downloadCaptionFile({
    id: "shared-object-handoff",
    options: { cameraMotion: true, theme: THEME },
    fetchFile: async (url, init) => {
      requests.push({ url: String(url), body: JSON.parse(String(init?.body)) });
      return new Response("1\n00:00:00,000 --> 00:00:01,000\nHi\n");
    },
    saveFile: (text, fileName) => {
      return saved.push({ text, fileName });
    },
  });
  assert.deepEqual(requests, [
    {
      url: "/api/captions",
      body: {
        id: "shared-object-handoff",
        options: { cameraMotion: true, theme: THEME },
      },
    },
  ]);
  assert.deepEqual(saved, [
    {
      text: "1\n00:00:00,000 --> 00:00:01,000\nHi\n",
      fileName: "shared-object-handoff-captions.srt",
    },
  ]);
});

test("a refused caption download saves nothing and fails", async () => {
  const saved: string[] = [];
  await assert.rejects(
    downloadCaptionFile({
      id: "shared-object-handoff",
      options: { theme: { id: "missing" } },
      fetchFile: async () => {
        return new Response("{}", { status: 400 });
      },
      saveFile: (text) => {
        return saved.push(text);
      },
    }),
  );
  assert.deepEqual(saved, []);
});
