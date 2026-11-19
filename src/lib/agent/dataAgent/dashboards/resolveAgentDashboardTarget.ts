/** A dashboard the agent may add a block to. */
export type AgentDashboardCandidate = Readonly<{
  id: string;
  name: string;
  /** Charts on it, when known, so a picker can tell two names apart. */
  chartCount?: number;
  /** When it was last saved, when known. */
  updatedAt?: string;
}>;

/** Where a block goes: the open editor, a card, or nowhere and why. */
export type AgentDashboardTarget =
  | { kind: "editor"; dashboardId: string }
  | { kind: "card"; candidates: readonly AgentDashboardCandidate[] }
  | { kind: "no_current" }
  | { kind: "not_found" };

/** What resolving a name needs from the page and the workspace. */
export type ResolveAgentDashboardTargetOptions = Readonly<{
  /** The name as the model wrote it, placeholders already restored. */
  requested: string;
  /** The dashboard the mounted editor shows, if any. */
  openEditorDashboardId: string | undefined;
  /** The dashboard the page shows, in the editor or a preview. */
  pageDashboard: AgentDashboardCandidate | undefined;
  /** Mentioned, then attached, dashboards. */
  contextDashboards: readonly AgentDashboardCandidate[];
  /** Every dashboard in the workspace. Called only when needed. */
  loadWorkspaceDashboards: () => Promise<readonly AgentDashboardCandidate[]>;
  canEdit: (dashboardId: string) => Promise<boolean>;
}>;

type TierLoader = () => Promise<readonly AgentDashboardCandidate[]>;

const CURRENT_DASHBOARD = "current";

function _normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

/** The forms a requested name matches: as written, and without "dashboard". */
function _requestedForms(requested: string): ReadonlySet<string> {
  const unquoted = requested.trim().replace(/^["'“”]+|["'“”]+$/g, "");
  const normalized = _normalizeName(unquoted);
  const withoutWord = normalized.replace(/\s+dashboard$/, "");
  return new Set([normalized, withoutWord].filter(Boolean));
}

/** Each dashboard once, in first-seen order. */
function _uniqueById(
  candidates: readonly AgentDashboardCandidate[],
): AgentDashboardCandidate[] {
  const byId = new Map(
    candidates.map((candidate) => {
      return [candidate.id, candidate] as const;
    }),
  );
  return [...byId.values()];
}

async function _editable(
  candidates: readonly AgentDashboardCandidate[],
  canEdit: (dashboardId: string) => Promise<boolean>,
): Promise<AgentDashboardCandidate[]> {
  const checks = await Promise.all(
    candidates.map((candidate) => {
      return canEdit(candidate.id);
    }),
  );
  return candidates.filter((_candidate, index) => {
    return checks[index] === true;
  });
}

/** The editable matches of the first tier that has any. */
async function _firstEditableMatch(
  tiers: readonly TierLoader[],
  forms: ReadonlySet<string>,
  canEdit: (dashboardId: string) => Promise<boolean>,
): Promise<AgentDashboardCandidate[]> {
  const [loadTier, ...laterTiers] = tiers;
  if (!loadTier) {
    return [];
  }
  const matches = _uniqueById(
    (await loadTier()).filter((candidate) => {
      return forms.has(_normalizeName(candidate.name));
    }),
  );
  const editable = await _editable(matches, canEdit);
  return editable.length > 0
    ? editable
    : _firstEditableMatch(laterTiers, forms, canEdit);
}

async function _resolveCurrent(
  options: ResolveAgentDashboardTargetOptions,
): Promise<AgentDashboardTarget> {
  if (options.openEditorDashboardId) {
    return { kind: "editor", dashboardId: options.openEditorDashboardId };
  }
  const page = options.pageDashboard;
  return page && (await options.canEdit(page.id))
    ? { kind: "card", candidates: [page] }
    : { kind: "no_current" };
}

/**
 * Where a block the agent named goes. `"current"` is the open editor, else
 * the page's dashboard. A name is matched in tiers (the page, then mentions
 * and the tray, then the workspace) and the first tier with a dashboard the
 * user can edit wins. One match open in the editor goes there. Anything
 * else becomes a card, with a picker when several share the name.
 */
export async function resolveAgentDashboardTarget(
  options: ResolveAgentDashboardTargetOptions,
): Promise<AgentDashboardTarget> {
  if (_normalizeName(options.requested) === CURRENT_DASHBOARD) {
    return _resolveCurrent(options);
  }
  const tiers: TierLoader[] = [
    async () => {
      return options.pageDashboard ? [options.pageDashboard] : [];
    },
    async () => {
      return options.contextDashboards;
    },
    options.loadWorkspaceDashboards,
  ];
  const editable = await _firstEditableMatch(
    tiers,
    _requestedForms(options.requested),
    options.canEdit,
  );
  const [onlyMatch, ...otherMatches] = editable;
  if (!onlyMatch) {
    return { kind: "not_found" };
  }
  return otherMatches.length === 0 &&
    onlyMatch.id === options.openEditorDashboardId
    ? { kind: "editor", dashboardId: onlyMatch.id }
    : { kind: "card", candidates: editable };
}
