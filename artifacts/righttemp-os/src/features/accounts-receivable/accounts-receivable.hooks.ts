import { useQuery } from "@tanstack/react-query";
import { getAccountsReceivable } from "./accounts-receivable.repository";

export const accountsReceivableQueryKeys = { all: ["accounts-receivable"] as const };

export function useAccountsReceivable() {
  return useQuery({ queryKey: accountsReceivableQueryKeys.all, queryFn: getAccountsReceivable });
}
