export type PoStatus = "pending" | "ordered" | "received" | "closed" | "cancelled";
export type PoEntityType = "customer" | "job";

export interface PurchaseOrder {
  id: string;
  entityType: PoEntityType;
  poNumber: string;
  title: string;
  customerName: string;
  status: PoStatus;
  vendor: string | null;
  amount: number | null;
  notes: string | null;
  createdAt: string;
}

export interface PurchaseOrderUpdate {
  status: PoStatus;
  vendor?: string;
  amount?: number;
  notes?: string;
}
