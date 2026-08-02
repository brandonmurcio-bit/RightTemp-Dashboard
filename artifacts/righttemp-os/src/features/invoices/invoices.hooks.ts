import { useMutation, useQuery } from "@tanstack/react-query";
import { createInvoiceFromJob, deletePaymentTransaction, getJobInvoice, markInvoiceSent, recordPayment, voidInvoice } from "./invoices.repository";
import type { JobInvoice, PaymentInput } from "./invoices.types";

export const invoiceQueryKeys = {
  job: (jobId: string) => ["invoice", "job", jobId] as const,
};

export function useJobInvoice(jobId: string) {
  return useQuery({ queryKey: invoiceQueryKeys.job(jobId), queryFn: () => getJobInvoice(jobId), enabled: !!jobId });
}
export function useCreateInvoice() { return useMutation({ mutationFn: (jobId: string) => createInvoiceFromJob(jobId) }); }
export function useMarkInvoiceSent() { return useMutation({ mutationFn: (id: string) => markInvoiceSent(id) }); }
export function useVoidInvoice() { return useMutation({ mutationFn: (id: string) => voidInvoice(id) }); }
export function useRecordPayment() { return useMutation({ mutationFn: ({ invoice, input }: { invoice: JobInvoice; input: PaymentInput }) => recordPayment(invoice, input) }); }
export function useDeletePaymentTransaction() { return useMutation({ mutationFn: (id: string) => deletePaymentTransaction(id) }); }
