import { useMutation, useQuery } from "@tanstack/react-query";
import { deleteCustomerDocument, getCustomerDocuments, uploadCustomerDocument } from "./customer-documents.repository";
import type { CustomerDocument } from "./customer-documents.types";

export const customerDocumentQueryKeys = {
  list: (customerId: string) => ["customer-documents", customerId] as const,
};

export function useCustomerDocuments(customerId: string) {
  return useQuery({
    queryKey: customerDocumentQueryKeys.list(customerId),
    queryFn: () => getCustomerDocuments(customerId),
    enabled: !!customerId,
  });
}

export function useUploadCustomerDocument() {
  return useMutation({
    mutationFn: ({ customerId, file }: { customerId: string; file: File }) =>
      uploadCustomerDocument(customerId, file),
  });
}

export function useDeleteCustomerDocument() {
  return useMutation({ mutationFn: (document: CustomerDocument) => deleteCustomerDocument(document) });
}
