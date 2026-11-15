# Code Smells Checklist

Use this checklist when the diff includes at least one `.ts` or `.tsx`
file. This phase looks for **logical and architectural antipatterns**:
a responsibility placed in the wrong owner, or an abstraction introduced
to avoid a dependency that would have been fine to take directly. It is
not about naming, file layout, or syntax shape; those belong to the
`module`, `typescript`, and `functional style` phases. A finding here is
about *where logic lives and why*, never *how a line is written*.

- **Avoid routing a one-off integration between two specific modules
  through a bridge/adapter mounted on a shared, global, or app-root
  component.** When module A needs to react to module B's state (or the
  reverse) purely to feed a UI surface or another consumer that B itself
  has no other reason to know about, A should depend on and call into B
  directly. Reaching instead for a dedicated "bridge" hook or adapter,
  mounted at a global composition root (an app shell, root layout, or
  top-level provider) because it is "somewhere that's always mounted,"
  is a sign the two modules were never given a direct relationship. It
  is not evidence that the global component is the right home for the
  logic.

  This is two named antipatterns stacked on each other, and naming them
  precisely matters more than reaching for "separation of concerns,"
  which is a design *principle* about keeping one concern per module,
  not the name for this smell:
  - **God Object / God Class** (also catalogued as "The Blob" in Brown
    et al.'s *AntiPatterns*): the global or root component keeps
    absorbing small, unrelated pieces of wiring logic because it is the
    one place guaranteed to always be mounted, until it knows about
    every subsystem in the app instead of only composing layout.
  - **Middle Man** (Fowler, *Refactoring*): the bridge/adapter itself
    does nothing but forward one module's state into another's API,
    with no independent logic or value of its own. The prescribed fix
    for a Middle Man is to **remove it** so the caller talks to the
    real object directly, which is exactly the fix here: delete the
    bridge and have the producing module call the consuming module
    itself.

  **The general heuristic, not just this one shape:** when a global or
  app-shell-level component picks up a narrowly-scoped, one-off piece of
  logic that exists only to pipe one module's data into another, treat
  that placement itself as the finding. It is rarely evidence that the
  global component is the right owner; it is far more often evidence of
  a missed direct dependency between the two modules that actually care
  about each other.

  **Exceptions:**
  1. The global component is a genuine, intentional composition root
     wiring together several independent subsystems that have no
     business depending on each other (for example, a root error
     boundary subscribing to several unrelated services so it can
     report any of their failures). The test: does the logic serve
     *several* unrelated consumers, or exactly one?
  2. A real layering constraint forbids the direct dependency (for
     example, a lower-layer or shared module must not import a
     higher-layer, UI-only store, so an adapter at the boundary is the
     correct seam, not a workaround). The test: would the direct import
     actually violate a documented layering rule, or is it simply
     unfamiliar?
  3. The piece of logic is genuinely reused by more than the one
     consumer it was introduced for. A bridge feeding three unrelated
     panels is doing real integration work, not hiding one missed
     dependency.

  This is bad:

  ```tsx
  // DownloadManager has nothing to do with ProgressStore, and only one
  // caller (the root shell) ever needs that mirrored status. A
  // dedicated hook exists only to copy one module's state into another.
  function useDownloadProgressBridge(): void {
    const status = useDownloadManagerStatus();
    const jobIdRef = useRef<JobId | undefined>(undefined);

    useEffect(() => {
      if (status.kind === "downloading") {
        if (jobIdRef.current === undefined) {
          jobIdRef.current = ProgressStore.startJob(status.label);
        }
        ProgressStore.updateJob(jobIdRef.current, {
          status: "determinate",
          current: status.percent,
        });
      }
    }, [status]);
  }

  function AppShell(): JSX.Element {
    useDownloadProgressBridge(); // one-off concern, bolted onto the root
    return <Layout />;
  }
  ```

  This is good:

  ```ts
  // DownloadManager reports its own progress. No bridge, and no
  // component needs to know this wiring exists.
  class DownloadManagerImpl {
    private jobId: JobId | undefined;

    async start(): Promise<void> {
      this.jobId = ProgressStore.startJob("Downloading...");
      try {
        await this.runDownload();
        ProgressStore.finishJob(this.jobId);
      } catch (error) {
        ProgressStore.failJob(this.jobId, String(error));
        throw error;
      }
    }
  }
  ```
