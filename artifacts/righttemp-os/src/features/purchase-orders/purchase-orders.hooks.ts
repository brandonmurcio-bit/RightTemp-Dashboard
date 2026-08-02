import { useMutation, useQuery } from "@tanstack/react-query";
import { getPurchaseOrders, updatePurchaseOrder } from "./purchase-orders.repository";
import type { PurchaseOrderUpdate } from "./purchase-orders.types";

export const purchaseOrderQueryKeys = { all: ["purchase-orders"] as const };

export function usePurchaseOrders() {
  return useQuery({ queryKey: purchaseOrderQueryKeys.all, queryFn: getPurchaseOrders });
}

export function useUpdatePurchaseOrder() {
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: PurchaseOrderUpdate }) =>
      updatePurchaseOrder(id, input),
  });
}
