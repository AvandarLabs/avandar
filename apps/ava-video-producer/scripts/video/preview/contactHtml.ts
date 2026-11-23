import type { Storyboard } from "../../../src/storyboard/schema/schema";
import type { PreviewSample } from "../video.types";

function _html(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/** The contact sheet page listing every preview still in film order. */
export function contactHtml(plan: Storyboard, samples: PreviewSample[]) {
  return `<!doctype html><meta charset="utf-8"><title>${_html(plan.title)} preview</title>
<style>body{font:16px system-ui;background:#111;color:#eee;margin:24px}main{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px}figure{margin:0}img{width:100%}figcaption{padding:8px 0}p{max-width:80ch}</style>
<h1>${_html(plan.title)}</h1><p>Inspect layout, transitions, captions, real media and click targets before render. This file records generated previews, not human approval. Cells are in film order.</p>
<main>${samples.map((item) => `<figure><a href="${item.file}"><img src="${item.file}" alt="Frame ${item.frame}"></a><figcaption>Frame ${item.frame}, ${(item.frame / plan.fps).toFixed(2)} s, ${_html(item.shot)}</figcaption></figure>`).join("")}</main>`;
}
