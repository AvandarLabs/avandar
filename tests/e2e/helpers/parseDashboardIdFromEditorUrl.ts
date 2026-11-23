/** The dashboard id in a dashboard editor URL, if the URL is one. */
export function parseDashboardIdFromEditorUrl(url: string): string | undefined {
  return url.match(/dashboards\/edit\/([0-9a-f-]{36})/i)?.[1];
}
