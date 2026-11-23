import { CliOutput } from "../CliOutput/CliOutput.mjs";
import { PromptView } from "../PromptView.mjs";
import { TerminalSession } from "../TerminalSession.mjs";

/** Narrows rows by every search word, including their public group fields. */
function _filter({ rows, words }) {
  return rows.filter((row) =>
    words.every((word) =>
      [row.id, row.name, row.group, row.description]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(word.toLowerCase()),
    ),
  );
}

/**
 * Returns the selected page, its local selection and one-based page numbers.
 */
function _page({ rows, index = 0, pageSize = 20 }) {
  const size = Math.max(1, Math.floor(pageSize));
  const selected = Math.max(0, Math.min(index, rows.length - 1));
  const start = Math.floor(selected / size) * size;
  return {
    rows: rows.slice(start, start + size),
    index: selected - start,
    page: Math.floor(start / size) + 1,
    pages: Math.max(1, Math.ceil(rows.length / size)),
  };
}

function _terminalPageSize(output) {
  return Math.max(1, Math.floor(((output.rows || 24) - 4) / 2));
}

function _render({ terminal, rows, index, query }) {
  const page = _page({
    rows,
    index,
    pageSize: _terminalPageSize(terminal.output),
  });
  const idWidth = Math.min(
    32,
    Math.max(8, Math.floor((terminal.output.columns || 80) * 0.4)),
  );
  const nameWidth = Math.max(8, (terminal.output.columns || 80) - idWidth - 4);
  let group;
  for (const [rowIndex, row] of page.rows.entries()) {
    if (row.group !== group) {
      group = row.group;
      terminal.output.write(`${CliOutput.heading(group ?? "Items")}\n`);
    }
    const text = `${row.id.slice(0, idWidth).padEnd(idWidth)} ${row.name.slice(0, nameWidth)}`;
    terminal.output.write(
      `${rowIndex === page.index ? CliOutput.selection(text) : `  ${text}`}\n`,
    );
  }
  if (query !== undefined) terminal.output.write(`Search: ${query}\n`);
  terminal.output.write(
    `Page ${page.page}/${page.pages}. Arrows/j/k: move. g/G: endpoints. /: search. Enter: details. Esc/Ctrl-C: exit.\n`,
  );
}

async function _browse({ terminal, rows }) {
  let words = [];
  let index = 0;
  let query = "";
  let isSearching = false;
  while (true) {
    const visible = _filter({ rows, words });
    _render({
      terminal,
      rows: visible,
      index,
      query: isSearching ? query : undefined,
    });
    const key = await TerminalSession.readKey(terminal);
    if (isSearching) {
      if (key.name === "return") isSearching = false;
      else query = _getSearchText({ key, query });
      words = query.split(/\s+/).filter(Boolean);
      index = 0;
    } else if (key.text === "/") {
      query = "";
      words = [];
      isSearching = true;
      index = 0;
    } else if (key.name === "return" && visible[index]) {
      const row = visible[index];
      terminal.output.write(
        `${row.id}\nName: ${row.name}\nGroup: ${row.group ?? "Items"}\n${row.description ?? ""}\n`,
      );
    } else if (visible.length)
      index = PromptView.move({
        index,
        length: visible.length,
        key: ["up", "down"].includes(key.name)
          ? key.name
          : key.text || key.name,
      });
  }
}

function _printRows(rows) {
  for (const row of rows)
    process.stdout.write(`${row.id}\t${row.group ?? ""}\t${row.name}\n`);
}

/** Prints filtered terminal results a screen at a time, with data on stdout. */
async function _printFiltered(rows) {
  const pageSize = _terminalPageSize(process.stdout);
  const terminal =
    process.stdout.isTTY && rows.length > pageSize
      ? TerminalSession.open()
      : undefined;
  if (!terminal) {
    _printRows(rows);
    return;
  }
  try {
    for (let index = 0; index < rows.length; index += pageSize) {
      const page = _page({ rows, index, pageSize });
      _printRows(page.rows);
      if (page.page < page.pages) {
        const choice = await PromptView.choose({
          terminal,
          label: `Page ${page.page}/${page.pages}`,
          choices: ["Next page", "Stop"],
        });
        if (choice === "Stop") break;
      }
    }
  } finally {
    terminal.close();
  }
}

/** Prints filtered inventories or opens a searchable, paged terminal view. */
async function _show({ rows, words = [] }) {
  const filtered = _filter({ rows, words });
  if (!filtered.length) {
    CliOutput.warning("No inventory entries match the search words.");
    return 1;
  }
  const terminal =
    !words.length && process.stdout.isTTY ? TerminalSession.open() : undefined;
  try {
    if (terminal) await _browse({ terminal, rows });
    else await _printFiltered(filtered);
  } catch (error) {
    if (!String(error).includes("Cancelled")) throw error;
  } finally {
    terminal?.close();
  }
  return 0;
}

/** Shared capture-flow and Motion Atlas inventory rendering. */
export const InventoryView = {
  /** Returns rows matching all search words in known public fields. */
  filter: _filter,
  /** Returns a bounded page with its selection and page numbers. */
  page: _page,
  /** Shows details on Enter and never executes an inventory item. */
  show: _show,
};

function _getSearchText({ key, query }) {
  if (key.name === "backspace") return query.slice(0, -1);
  return key.text && !key.ctrl && !key.meta && key.name !== "tab"
    ? query + key.text
    : query;
}
