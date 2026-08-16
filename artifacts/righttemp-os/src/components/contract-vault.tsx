import { useRef, useState } from "react";
import { Camera, Check, ExternalLink, FileSignature, RotateCcw, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useContracts, useSignContract, useUpdateContractStatus, useUploadContract } from "@/features/contracts/contracts.hooks";
import { openContract } from "@/features/contracts/contracts.repository";
import type { ContractDocument, ContractStatus } from "@/features/contracts/contracts.types";
import { useToast } from "@/hooks/use-toast";

export function ContractVault({ estimateId, customerId, jobId, allowUpload = false, allowSign = false }: { estimateId?: string; customerId?: string; jobId?: string; allowUpload?: boolean; allowSign?: boolean }) {
  const uploadInput = useRef<HTMLInputElement>(null); const cameraInput = useRef<HTMLInputElement>(null);
  const { data: contracts = [], isLoading } = useContracts({ estimateId, customerId, jobId });
  const upload = useUploadContract(); const updateStatus = useUpdateContractStatus(); const { toast } = useToast();
  const [signing, setSigning] = useState<ContractDocument | null>(null);
  const sendFile = (file?: File) => { if (!file || !estimateId) return; upload.mutate({ estimateId, file }, { onSuccess: () => toast({ title: "Contract uploaded" }), onError: (error) => toast({ title: "Upload failed", description: error.message, variant: "destructive" }) }); };
  const open = async (contract: ContractDocument) => { try { window.open(await openContract(contract.storagePath), "_blank", "noopener,noreferrer"); } catch (error) { toast({ title: "Unable to open", description: error instanceof Error ? error.message : "Try again.", variant: "destructive" }); } };
  return <div className="space-y-3 border-t pt-4">
    <div className="flex flex-wrap items-center justify-between gap-2"><p className="flex items-center gap-2 text-sm font-semibold"><FileSignature className="h-4 w-4 text-primary" />Contracts & Documents <span className="text-xs font-normal text-muted-foreground">({contracts.length})</span></p>
      {allowUpload && estimateId && <div className="flex gap-2"><input ref={uploadInput} className="hidden" type="file" accept="application/pdf,image/*,.doc,.docx" onChange={(e) => sendFile(e.target.files?.[0])}/><input ref={cameraInput} className="hidden" type="file" accept="image/*" capture="environment" onChange={(e) => sendFile(e.target.files?.[0])}/><Button size="sm" variant="outline" onClick={() => uploadInput.current?.click()} disabled={upload.isPending}><Upload className="mr-2 h-4 w-4"/>Upload</Button><Button size="sm" variant="outline" onClick={() => cameraInput.current?.click()} disabled={upload.isPending}><Camera className="mr-2 h-4 w-4"/>Camera</Button></div>}
    </div>
    {isLoading && <p className="text-xs text-muted-foreground">Loading contracts...</p>}
    {contracts.map((contract) => <div key={contract.id} className="rounded-lg border p-3"><div className="flex flex-wrap items-center justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-medium">{contract.fileName}</p><p className="text-xs text-muted-foreground">{contract.signedAt ? `Signed by ${contract.signedBy} · ${new Date(contract.signedAt).toLocaleString()}` : new Date(contract.createdAt).toLocaleDateString()}</p></div><div className="flex items-center gap-2"><Select value={contract.status} disabled={contract.status === "signed"} onValueChange={(status) => updateStatus.mutate({ id: contract.id, status: status as ContractStatus })}><SelectTrigger className="w-28"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="draft">Draft</SelectItem><SelectItem value="presented">Presented</SelectItem><SelectItem value="signed">Signed</SelectItem></SelectContent></Select><Button size="icon" variant="ghost" onClick={() => open(contract)}><ExternalLink className="h-4 w-4"/></Button>{allowSign && contract.status !== "signed" && <Button size="sm" onClick={() => setSigning(contract)}><FileSignature className="mr-2 h-4 w-4"/>Sign</Button>}</div></div>{contract.signatureDataUrl && <img src={contract.signatureDataUrl} alt="Customer signature" className="mt-3 h-16 max-w-xs rounded bg-white object-contain"/>}</div>)}
    <ContractSigningDialog contract={signing} onClose={() => setSigning(null)} />
  </div>;
}

function ContractSigningDialog({ contract, onClose }: { contract: ContractDocument | null; onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null); const drawing = useRef(false); const [name, setName] = useState(""); const [hasSignature, setHasSignature] = useState(false); const sign = useSignContract();
  const point = (e: React.PointerEvent<HTMLCanvasElement>) => { const b = e.currentTarget.getBoundingClientRect(); return { x: (e.clientX-b.left)*(e.currentTarget.width/b.width), y: (e.clientY-b.top)*(e.currentTarget.height/b.height) }; };
  const start = (e: React.PointerEvent<HTMLCanvasElement>) => { drawing.current=true; e.currentTarget.setPointerCapture(e.pointerId); const p=point(e); const c=e.currentTarget.getContext("2d")!; c.beginPath(); c.moveTo(p.x,p.y); };
  const draw = (e: React.PointerEvent<HTMLCanvasElement>) => { if(!drawing.current)return; const p=point(e); const c=e.currentTarget.getContext("2d")!; c.lineWidth=3;c.lineCap="round";c.strokeStyle="#111827";c.lineTo(p.x,p.y);c.stroke();setHasSignature(true); };
  const clear = () => { canvasRef.current?.getContext("2d")?.clearRect(0,0,700,180); setHasSignature(false); };
  const submit = () => { const canvas=canvasRef.current; if(!contract||!canvas||!name.trim()||!hasSignature)return; sign.mutate({id:contract.id,signedBy:name.trim(),signatureDataUrl:canvas.toDataURL("image/png",.75)},{onSuccess:onClose}); };
  return <Dialog open={Boolean(contract)} onOpenChange={(open)=>{if(!open)onClose();}}><DialogContent><DialogHeader><DialogTitle>Sign Contract</DialogTitle></DialogHeader><p className="text-sm text-muted-foreground">Signing confirms the customer reviewed and accepted {contract?.fileName}.</p><div><Label>Customer’s full legal name</Label><Input value={name} onChange={(e)=>setName(e.target.value)}/></div><div><div className="mb-2 flex justify-between"><Label>Customer signature</Label><Button size="sm" variant="ghost" onClick={clear}><RotateCcw className="mr-1 h-4 w-4"/>Clear</Button></div><canvas ref={canvasRef} width={700} height={180} onPointerDown={start} onPointerMove={draw} onPointerUp={()=>drawing.current=false} onPointerCancel={()=>drawing.current=false} className="h-32 w-full touch-none rounded-lg border bg-white"/></div><Button disabled={!name.trim()||!hasSignature||sign.isPending} onClick={submit}><Check className="mr-2 h-4 w-4"/>{sign.isPending?"Saving Signature...":"Sign Contract"}</Button></DialogContent></Dialog>;
}
