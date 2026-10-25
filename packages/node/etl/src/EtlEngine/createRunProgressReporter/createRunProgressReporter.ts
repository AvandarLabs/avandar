import type { CrawledPageCounts } from "@etl/EtlEngine/crawlScope/crawlScope";
import type {
  EtlCrawlStatus,
  EtlRunProgress,
} from "@etl/EtlEngine/EtlEngine.types";

/** Which crawl a progress event is about. */
export type ProgressCrawl = Readonly<{
  driveKey: string;
  scopeKey: string;
  /** The crawl's 1-based position among the run's crawls. */
  crawlNumber: number;
}>;

/** Turns crawl milestones into `EtlRunProgress` events with run totals. */
export type RunProgressReporter = Readonly<{
  crawlStarted: (crawl: ProgressCrawl) => void;
  pageLoaded: (crawl: ProgressCrawl, page: CrawledPageCounts) => void;
  crawlFinished: (crawl: ProgressCrawl, status: EtlCrawlStatus) => void;
}>;

/**
 * Creates a reporter that adds each loaded page to the run's totals and
 * sends every milestone to `onProgress`. Without `onProgress` it does
 * nothing.
 *
 * @param args.onProgress - The run's progress callback, if any.
 * @param args.crawlCount - How many crawls the run has.
 * @param args.limit - The run's limit on connections, if any.
 * @returns The reporter.
 */
export function createRunProgressReporter(args: {
  onProgress: ((progress: EtlRunProgress) => void) | undefined;
  crawlCount: number;
  limit: number | undefined;
}): RunProgressReporter {
  const { onProgress } = args;
  let totals = {
    connectionsFetched: 0,
    relationsTransformed: 0,
    columnsFound: 0,
  };
  const report = (
    stage: EtlRunProgress["stage"],
    crawl: ProgressCrawl,
    status?: EtlCrawlStatus,
  ): void => {
    onProgress?.({
      stage,
      ...crawl,
      crawlCount: args.crawlCount,
      limit: args.limit,
      ...totals,
      ...(status === undefined ? {} : { status }),
    });
  };
  return {
    crawlStarted: (crawl) => {
      report("crawl_started", crawl);
    },
    pageLoaded: (crawl, page) => {
      totals = {
        connectionsFetched: totals.connectionsFetched + page.connections,
        relationsTransformed: totals.relationsTransformed + page.relations,
        columnsFound: totals.columnsFound + page.columns,
      };
      report("page_loaded", crawl);
    },
    crawlFinished: (crawl, status) => {
      report("crawl_finished", crawl, status);
    },
  };
}
