import { useQuery } from "@tanstack/react-query";
import { getDashboardStats } from "./dashboard.repository";

export const dashboardQueryKeys = {
  all: ["dashboard"] as const,
  stats: ["dashboard", "stats"] as const,
};

export function useDashboardStats() {
  return useQuery({
    queryKey: dashboardQueryKeys.stats,
    queryFn: getDashboardStats,
  });
}
