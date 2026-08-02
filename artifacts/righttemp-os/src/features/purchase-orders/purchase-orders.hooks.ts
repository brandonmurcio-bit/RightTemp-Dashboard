import { useMutation, useQuery } from "@tanstack/react-query";
import { getPurchaseOrders, updatePurchaseOrder } from "./purchase-orders.repository";
import type { PoEntityType, PurchaseOrderUpdate } from "./purchase-orders.types";

export const purchaseOrderQueryKeys = { all: ["purchase-orders"] as const };

export function usePurchaseOrders() {
  return useQuery({ queryKey: purchaseOrderQueryKeys.all, queryFn: getPurchaseOrders });
}

export function useUpdatePurchaseOrder() {
  return useMutation({
    mutationFn: ({ entityType, id, input }: { entityType: PoEntityType; id: string; input: PurchaseOrderUpdate }) =>
      updatePurchaseOrder(entityType, id, input),
  });
}
