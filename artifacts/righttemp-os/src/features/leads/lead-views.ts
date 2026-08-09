const VIEWED_LEADS_KEY = "righttemp:viewed-leads";

export function getViewedLeadIds(): Set<string> {
  try {
    const stored = window.localStorage.getItem(VIEWED_LEADS_KEY);
    return new Set(stored ? (JSON.parse(stored) as string[]) : []);
  } catch {
    return new Set();
  }
}

export function markLeadViewed(leadId: string) {
  const viewedLeadIds = getViewedLeadIds();
  viewedLeadIds.add(leadId);
  window.localStorage.setItem(VIEWED_LEADS_KEY, JSON.stringify([...viewedLeadIds]));
}
