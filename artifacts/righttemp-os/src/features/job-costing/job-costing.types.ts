export type JobCostCategory =
  | "labor"
  | "materials"
  | "equipment"
  | "subcontractor"
  | "permit"
  | "other";

export interface JobCost {
  id: string;
  jobId: string;
  category: JobCostCategory;
  description: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  notes: string | null;
  createdAt: string;
}

export interface JobCostInput {
  category: JobCostCategory;
  description: string;
  quantity: number;
  unitCost: number;
  notes?: string;
}

export interface JobProfitability {
  revenue: number;
  poCost: number;
  manualCost: number;
  totalCost: number;
  grossProfit: number;
  marginPercent: number | null;
  estimateTitle: string | null;
  costs: JobCost[];
}
