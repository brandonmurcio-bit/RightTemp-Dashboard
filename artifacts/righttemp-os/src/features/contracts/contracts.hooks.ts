import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getContracts, signContract, updateContractStatus, uploadContract } from "./contracts.repository";
import type { ContractStatus } from "./contracts.types";
export const contractKeys = { all: ["contracts"] as const, list: (key: string) => ["contracts", key] as const };
export function useContracts(filters: { estimateId?: string; customerId?: string; jobId?: string }) { const key = filters.estimateId ?? filters.customerId ?? filters.jobId ?? "none"; return useQuery({ queryKey: contractKeys.list(key), queryFn: () => getContracts(filters), enabled: key !== "none" }); }
export function useUploadContract() { const client = useQueryClient(); return useMutation({ mutationFn: ({ estimateId, file }: { estimateId: string; file: File }) => uploadContract(estimateId, file), onSuccess: () => client.invalidateQueries({ queryKey: contractKeys.all }) }); }
export function useUpdateContractStatus() { const client = useQueryClient(); return useMutation({ mutationFn: ({ id, status }: { id: string; status: ContractStatus }) => updateContractStatus(id, status), onSuccess: () => client.invalidateQueries({ queryKey: contractKeys.all }) }); }
export function useSignContract() { const client = useQueryClient(); return useMutation({ mutationFn: ({ id, signedBy, signatureDataUrl }: { id: string; signedBy: string; signatureDataUrl: string }) => signContract(id, signedBy, signatureDataUrl), onSuccess: () => client.invalidateQueries({ queryKey: contractKeys.all }) }); }
