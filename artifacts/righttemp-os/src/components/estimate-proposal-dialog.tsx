import { useEffect, useRef, useState } from "react";
import { Check, Download, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Estimate, EstimateAcceptanceInput } from "@/features/estimates/estimates.types";

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  })[character] ?? character);
}

function openPrintableEstimate(estimate: Estimate) {
  const lineItems = estimate.lineItems.map((item) => `
    <tr><td>${escapeHtml(item.description)}</td><td>${item.quantity}</td><td>${money.format(item.unit_price)}</td><td>${money.format(item.total)}</td></tr>
  `).join("");
  const signature = estimate.signatureDataUrl
    ? `<div class="signature"><img src="${escapeHtml(estimate.signatureDataUrl)}" alt="Customer signature"><strong>${escapeHtml(estimate.signedBy ?? "")}</strong><span>Accepted ${estimate.signedAt ? new Date(estimate.signedAt).toLocaleString() : ""}</span></div>`
    : "";
  const printable = window.open("", "_blank");
  if (!printable) return;
  printable.opener = null;
  printable.document.write(`<!doctype html><html><head><title>${escapeHtml(estimate.estimateNumber ?? estimate.title)}</title><meta name="viewport" content="width=device-width"><style>
    body{font:14px Arial,sans-serif;color:#111;margin:0;padding:38px} header{display:flex;justify-content:space-between;border-bottom:4px solid #1769e0;padding-bottom:22px;margin-bottom:30px}.brand{display:flex;gap:12px;align-items:center}.logo{background:#1769e0;color:white;border-radius:8px;font-size:24px;font-weight:800;padding:10px 14px}h1{margin:0;font-size:25px}.muted{color:#666}.meta{text-align:right}h2{font-size:19px;margin:30px 0 8px}table{width:100%;border-collapse:collapse;margin-top:24px}th,td{text-align:left;padding:12px;border-bottom:1px solid #ddd}th{background:#f4f6f8}.totals{margin:24px 0 0 auto;width:310px}.totals div{display:flex;justify-content:space-between;padding:7px}.grand{font-size:20px;font-weight:800;border-top:2px solid #111}.notes{white-space:pre-wrap;background:#f6f7f8;padding:16px;border-radius:8px}.signature{margin-top:40px;width:330px;border-top:1px solid #111;padding-top:8px}.signature img{display:block;max-width:280px;height:90px;object-fit:contain}.signature strong,.signature span{display:block;margin-top:4px}.footer{margin-top:50px;border-top:1px solid #ddd;padding-top:15px;color:#666;font-size:12px}@media print{body{padding:18px}@page{margin:.45in}}
  </style></head><body><header><div class="brand"><div class="logo">R</div><div><h1>RightTemp Heating & Air Conditioning</h1><div class="muted">Licensed • Bonded • Insured</div></div></div><div class="meta"><strong>${escapeHtml(estimate.estimateNumber ?? "ESTIMATE")}</strong><br>${new Date(estimate.createdAt).toLocaleDateString()}<br>${estimate.validUntil ? `Valid through ${escapeHtml(estimate.validUntil)}` : ""}</div></header><h2>Prepared for</h2><div>${escapeHtml(estimate.customerName)}</div><h2>${escapeHtml(estimate.title)}</h2><table><thead><tr><th>Description</th><th>Qty</th><th>Unit price</th><th>Total</th></tr></thead><tbody>${lineItems}</tbody></table><div class="totals"><div><span>Subtotal</span><span>${money.format(estimate.subtotal)}</span></div><div><span>Tax</span><span>${money.format(estimate.taxAmount)}</span></div><div class="grand"><span>Total</span><span>${money.format(estimate.total)}</span></div></div>${estimate.notes ? `<h2>Scope & notes</h2><div class="notes">${escapeHtml(estimate.notes)}</div>` : ""}${signature}<div class="footer">Thank you for choosing RightTemp. This proposal is subject to the scope, pricing, and validity shown above.</div><script>setTimeout(()=>window.print(),300)</script></body></html>`);
  printable.document.close();
}

interface EstimateProposalDialogProps {
  estimate: Estimate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAccept: (acceptance: EstimateAcceptanceInput) => void;
  isAccepting: boolean;
}

export function EstimateProposalDialog({ estimate, open, onOpenChange, onAccept, isAccepting }: EstimateProposalDialogProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const [signedBy, setSignedBy] = useState("");
  const [hasSignature, setHasSignature] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  useEffect(() => {
    if (!open) {
      setSignedBy("");
      setHasSignature(false);
      setTermsAccepted(false);
    }
  }, [open]);

  if (!estimate) return null;

  const point = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const bounds = canvas.getBoundingClientRect();
    return { x: (event.clientX - bounds.left) * (canvas.width / bounds.width), y: (event.clientY - bounds.top) * (canvas.height / bounds.height) };
  };
  const startDrawing = (event: React.PointerEvent<HTMLCanvasElement>) => {
    drawingRef.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    const context = event.currentTarget.getContext("2d")!;
    const start = point(event);
    context.beginPath();
    context.moveTo(start.x, start.y);
  };
  const draw = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const context = event.currentTarget.getContext("2d")!;
    const next = point(event);
    context.lineWidth = 3;
    context.lineCap = "round";
    context.strokeStyle = "#111827";
    context.lineTo(next.x, next.y);
    context.stroke();
    setHasSignature(true);
  };
  const stopDrawing = () => { drawingRef.current = false; };
  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (canvas) canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };
  const accept = () => {
    const canvas = canvasRef.current;
    if (!canvas || !signedBy.trim() || !hasSignature || !termsAccepted) return;
    onAccept({ signedBy: signedBy.trim(), signatureDataUrl: canvas.toDataURL("image/png", 0.75) });
  };

  const alreadyAccepted = Boolean(estimate.signedAt);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[94vh] overflow-y-auto print:max-w-none">
        <DialogHeader><DialogTitle>Customer Estimate</DialogTitle></DialogHeader>
        <div className="rounded-xl border bg-white text-slate-950 p-5 md:p-8 space-y-6">
          <header className="flex items-start justify-between gap-4 border-b-4 border-blue-600 pb-5">
            <div className="flex items-center gap-3"><div className="rounded-lg bg-blue-600 px-3 py-2 text-xl font-black text-white">R</div><div><h2 className="font-bold text-lg md:text-xl">RightTemp Heating & Air Conditioning</h2><p className="text-xs text-slate-500">Licensed • Bonded • Insured</p></div></div>
            <div className="text-right text-xs"><strong>{estimate.estimateNumber ?? "ESTIMATE"}</strong><p>{new Date(estimate.createdAt).toLocaleDateString()}</p></div>
          </header>
          <div><p className="text-xs uppercase tracking-wide text-slate-500">Prepared for</p><p className="font-semibold">{estimate.customerName}</p><h3 className="mt-4 text-xl font-bold">{estimate.title}</h3></div>
          <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="bg-slate-100"><th className="p-3 text-left">Description</th><th className="p-3 text-right">Qty</th><th className="p-3 text-right">Price</th><th className="p-3 text-right">Total</th></tr></thead><tbody>{estimate.lineItems.map((item, index) => <tr key={index} className="border-b"><td className="p-3">{item.description}</td><td className="p-3 text-right">{item.quantity}</td><td className="p-3 text-right">{money.format(item.unit_price)}</td><td className="p-3 text-right">{money.format(item.total)}</td></tr>)}</tbody></table></div>
          <div className="ml-auto max-w-xs space-y-2 text-sm"><div className="flex justify-between"><span>Subtotal</span><span>{money.format(estimate.subtotal)}</span></div><div className="flex justify-between"><span>Tax</span><span>{money.format(estimate.taxAmount)}</span></div><div className="flex justify-between border-t-2 pt-2 text-lg font-bold"><span>Total</span><span>{money.format(estimate.total)}</span></div></div>
          {estimate.notes && <div><p className="mb-2 text-sm font-bold">Scope & notes</p><p className="whitespace-pre-wrap rounded-lg bg-slate-100 p-4 text-sm">{estimate.notes}</p></div>}
          {alreadyAccepted && <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-4"><div className="flex items-center gap-2 font-bold text-emerald-800"><Check className="h-5 w-5" />Accepted by {estimate.signedBy}</div>{estimate.signatureDataUrl && <img src={estimate.signatureDataUrl} alt="Customer signature" className="mt-2 h-20 max-w-xs object-contain" />}<p className="text-xs text-emerald-700">{estimate.signedAt ? new Date(estimate.signedAt).toLocaleString() : ""}</p></div>}
        </div>

        {!alreadyAccepted && estimate.status !== "rejected" && <div className="space-y-3 rounded-xl border p-4"><div><Label htmlFor="signed-by">Customer’s full name</Label><Input id="signed-by" value={signedBy} onChange={(event) => setSignedBy(event.target.value)} placeholder="Type full legal name" /></div><div><div className="mb-2 flex items-center justify-between"><Label>Customer signature</Label><Button type="button" size="sm" variant="ghost" onClick={clearSignature}><RotateCcw className="mr-1 h-4 w-4" />Clear</Button></div><canvas ref={canvasRef} width={700} height={180} onPointerDown={startDrawing} onPointerMove={draw} onPointerUp={stopDrawing} onPointerCancel={stopDrawing} className="h-32 w-full touch-none rounded-lg border bg-white" /></div><label className="flex items-start gap-3 text-sm"><input type="checkbox" checked={termsAccepted} onChange={(event) => setTermsAccepted(event.target.checked)} className="mt-1" /><span>I approve this estimate, pricing, and scope of work and authorize RightTemp to schedule the job.</span></label><Button className="w-full" disabled={!signedBy.trim() || !hasSignature || !termsAccepted || isAccepting} onClick={accept}><Check className="mr-2 h-4 w-4" />{isAccepting ? "Accepting..." : "Accept Estimate & Schedule Job"}</Button></div>}

        <Button variant="outline" onClick={() => openPrintableEstimate(estimate)}><Download className="mr-2 h-4 w-4" />Print / Save PDF</Button>
      </DialogContent>
    </Dialog>
  );
}
