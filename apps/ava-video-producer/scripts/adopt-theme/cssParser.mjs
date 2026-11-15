const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, "");

/** Flat list of { selector, body } with braces matched, so an @media block is
 *  returned whole instead of being cut at its first inner `}`. */
function blocks(css) {
  const out = [];
  let i = 0;
  while (i < css.length) {
    const brace = css.indexOf("{", i);
    if (brace === -1) break;
    const selector = css.slice(i, brace).trim().split(/[\n;]/).pop().trim();
    let depth = 1;
    let j = brace + 1;
    while (j < css.length && depth > 0) {
      if (css[j] === "{") depth += 1;
      else if (css[j] === "}") depth -= 1;
      j += 1;
    }
    out.push({ selector, body: css.slice(brace + 1, j - 1) });
    i = j;
  }
  return out;
}

/** Custom properties declared directly in a block, ignoring nested ones. */
function declarations(body) {
  const flat = body.replace(/\{[\s\S]*?\}/g, "");
  return Object.fromEntries(
    Array.from(flat.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g), (m) => [
      m[1],
      m[2].trim(),
    ]),
  );
}

/** Merge declarations, refusing the one shape that silently destroys a
 *  palette. Tailwind 4 re-exports a theme with `@theme inline { --x: var(--x) }`
 *  so utilities can reach it; that block usually sits BELOW the real
 *  definitions, and a plain Object.assign lets the self-reference overwrite the
 *  colour with a pointer at itself. Measured on a real Tailwind 4 stylesheet:
 *  every easing came back as `var(--ease-out-expo)` and the curve adoption
 *  found nothing at all. A concrete value always beats a pointer. */
function assign(target, incoming) {
  for (const [k, v] of Object.entries(incoming)) {
    const selfRef = new RegExp(`^var\\(\\s*${k}\\s*[,)]`).test(v.trim());
    if (selfRef && target[k]) continue;
    target[k] = v;
  }
  return target;
}

const isRoot = (sel) =>
  /(^|,)\s*(:root|html|@theme[\w\s]*)\s*(,|$)/.test(sel) ||
  sel.startsWith("@theme");
const isDark = (sel) =>
  /\.dark\b/.test(sel) ||
  /\[data-theme=["']?dark/.test(sel) ||
  /prefers-color-scheme:\s*dark/.test(sel);

/** Collect every light and dark custom property declared at :root, html, or
 *  `@theme`, following Tailwind's `.dark` / `[data-theme]` / media-query forms. */
export function collect(css) {
  const light = {};
  const dark = {};
  for (const b of blocks(stripComments(css))) {
    if (b.selector.startsWith("@")) {
      const inner = blocks(b.body);
      const target = isDark(b.selector) ? dark : light;
      if (b.selector.startsWith("@theme")) {
        assign(target, declarations(b.body));
      }
      for (const ib of inner) {
        if (isRoot(ib.selector) || isDark(ib.selector)) {
          assign(
            isDark(b.selector) || isDark(ib.selector) ? dark : light,
            declarations(ib.body),
          );
        }
      }
      continue;
    }
    if (isDark(b.selector)) assign(dark, declarations(b.body));
    else if (isRoot(b.selector)) assign(light, declarations(b.body));
  }
  return { light, dark };
}

/** Tailwind 4 aliases half a theme through `var(--x)`. Resolve within the map
 *  so the kit gets a colour and not a pointer at one that does not exist in
 *  its own stylesheet. */
export function resolveVars(map, fallback = {}) {
  const out = { ...map };
  for (let pass = 0; pass < 4; pass += 1) {
    let changed = false;
    for (const [k, v] of Object.entries(out)) {
      const m = /^var\((--[\w-]+)(?:\s*,\s*([^)]+))?\)$/.exec(v.trim());
      if (!m) continue;
      const target = out[m[1]] ?? fallback[m[1]] ?? m[2];
      if (target && target !== v) {
        out[k] = target.trim();
        changed = true;
      }
    }
    if (!changed) break;
  }
  return out;
}
