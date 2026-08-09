import { useMemo, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  Check,
  CheckCircle2,
  Clock3,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  UserRound,
  Wrench,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

const services = ["AC repair", "Heating repair", "System replacement", "Maintenance / tune-up", "Indoor air quality", "Ductwork", "Other"];
const urgencyOptions = [
  ["emergency", "Emergency — no cooling or heat"],
  ["today", "As soon as possible"],
  ["this_week", "Sometime this week"],
  ["planning", "Planning / comparing options"],
] as const;

type FormState = { name: string; phone: string; email: string; zip: string; serviceNeeded: string; urgency: string; notes: string; website: string };
const initialForm: FormState = { name: "", phone: "", email: "", zip: "", serviceNeeded: "", urgency: "", notes: "", website: "" };

export default function ServiceLandingPage() {
  const [form, setForm] = useState(initialForm);
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [error, setError] = useState("");
  const formStartedAt = useMemo(() => Date.now(), []);
  const update = (field: keyof FormState, value: string) => setForm((current) => ({ ...current, [field]: value }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (status === "submitting") return;
    setStatus("submitting");
    setError("");
    const params = new URLSearchParams(window.location.search);
    const clickId = params.get("gclid") ?? params.get("fbclid") ?? params.get("msclkid") ?? "";
    const { error: submitError } = await supabase.functions.invoke("capture-lead", {
      body: {
        ...form,
        formStartedAt,
        attribution: {
          source: params.get("utm_source") ?? (params.has("gclid") ? "google" : params.has("fbclid") ? "facebook" : "website"),
          medium: params.get("utm_medium") ?? "landing_page",
          campaign: params.get("utm_campaign") ?? "",
          content: params.get("utm_content") ?? "",
          term: params.get("utm_term") ?? "",
          landingPage: `${window.location.pathname}${window.location.search}`,
          referrer: document.referrer,
          clickId,
        },
      },
    });
    if (submitError) {
      setStatus("error");
      setError("We couldn't send your request. Please check your information and try again.");
      return;
    }
    setStatus("success");
    setForm(initialForm);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <main className="min-h-[100dvh] overflow-hidden bg-[#020205] text-white selection:bg-blue-600">
      <header className="relative border-b border-white/10 bg-black">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-6 sm:px-8">
          <a href="#top" aria-label="RightTemp home" className="min-w-0 flex-[0_1_62%]">
            <img src="/icons/righttemp-header-logo.png" alt="RightTemp Heating & Air Conditioning" className="w-full max-w-[15.75rem] object-contain sm:max-w-[23rem]" />
          </a>
          <a href="#request-service" className="shrink-0 rounded-full border border-white/20 bg-gradient-to-r from-[#e80019] via-[#c60042] to-[#075de9] px-5 py-3 text-sm font-extrabold shadow-[0_0_28px_rgba(26,92,255,.22)] sm:px-7 sm:py-4 sm:text-base">
            Request service
          </a>
        </div>
        <div className="h-1 bg-gradient-to-r from-[#f20b20] via-[#7e195f] to-[#0869ff]" />
      </header>

      <section id="top" className="relative isolate">
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
          <div className="absolute right-[-8rem] top-16 h-[38rem] w-[38rem] rounded-full bg-blue-700/15 blur-[90px]" />
          <div className="absolute left-[-14rem] top-48 h-[34rem] w-[34rem] rounded-full bg-red-700/13 blur-[100px]" />
        </div>

        <div className="mx-auto max-w-6xl px-5 pb-20 pt-14 sm:px-8 sm:pt-20">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-3 rounded-full border border-red-500/65 bg-black/65 px-4 py-2 text-[.7rem] font-extrabold uppercase tracking-[.22em] shadow-[inset_-35px_0_45px_rgba(15,93,255,.12)] sm:text-xs">
              <BadgeCheck className="h-4 w-4 text-red-500" /> License No. 1157733 <i className="h-1 w-1 rounded-full bg-red-500" /> Bonded <i className="h-1 w-1 rounded-full bg-red-500" /> Insured
            </div>
            <h1 className="mt-8 text-[2.7rem] font-extrabold leading-[1.03] tracking-[-.055em] sm:text-7xl">
              <span className="bg-gradient-to-r from-[#ff171d] via-[#b91f63] to-[#126dff] bg-clip-text text-transparent">True Comfort.</span>
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-zinc-300 sm:text-xl sm:leading-9">Straight answers, clean HVAC work, and options that fit your home—not a high-pressure sales pitch.</p>
            <div className="mt-8 flex flex-wrap gap-x-8 gap-y-4 text-sm font-bold text-zinc-100 sm:text-base">
              <Benefit color="red">Local HVAC professionals</Benefit>
              <Benefit color="red">Upfront recommendations</Benefit>
              <Benefit color="blue">Residential service</Benefit>
            </div>
          </div>

          <div id="request-service" className="relative mt-14 scroll-mt-5 overflow-hidden rounded-[1.8rem] bg-gradient-to-br from-red-500 via-fuchsia-500/80 to-blue-500 p-[2px] shadow-[0_22px_85px_rgba(1,40,150,.24)]">
            <div className="rounded-[calc(1.8rem-2px)] bg-[linear-gradient(135deg,#09090c_0%,#101116_58%,#08090d_100%)] p-6 sm:p-10">
              {status === "success" ? (
                <div className="flex min-h-[32rem] flex-col items-center justify-center text-center" role="status">
                  <span className="grid h-20 w-20 place-items-center rounded-full border border-emerald-400/30 bg-emerald-400/10"><CheckCircle2 className="h-11 w-11 text-emerald-400" /></span>
                  <h2 className="mt-6 text-3xl font-extrabold">Request received.</h2>
                  <p className="mt-3 max-w-sm leading-7 text-zinc-400">Your information is now with RightTemp. We’ll reach out as soon as possible.</p>
                  <button type="button" onClick={() => setStatus("idle")} className="mt-7 font-bold text-blue-400 underline underline-offset-4">Send another request</button>
                </div>
              ) : (
                <form onSubmit={submit} className="space-y-5">
                  <div>
                    <p className="text-xs font-extrabold uppercase tracking-[.2em] text-blue-500">Fast service request</p>
                    <h2 className="mt-2 text-3xl font-extrabold tracking-tight">Tell us what’s going on</h2>
                    <p className="mt-2 text-sm text-zinc-400">Fields marked <span className="text-red-500">*</span> are required.</p>
                  </div>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field icon={UserRound} label="Full name *"><input required autoComplete="name" value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="Your full name" /></Field>
                    <Field icon={Phone} label="Phone *"><input required inputMode="tel" autoComplete="tel" minLength={10} value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder="(000) 000-0000" /></Field>
                  </div>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field icon={Mail} label="Email"><input type="email" autoComplete="email" value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="you@example.com" /></Field>
                    <Field icon={MapPin} label="ZIP code *"><input required inputMode="numeric" autoComplete="postal-code" pattern="[0-9]{5}(-[0-9]{4})?" value={form.zip} onChange={(e) => update("zip", e.target.value)} placeholder="92345" /></Field>
                  </div>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field label="Service needed *"><select required value={form.serviceNeeded} onChange={(e) => update("serviceNeeded", e.target.value)}><option value="">Choose a service</option>{services.map((service) => <option key={service}>{service}</option>)}</select></Field>
                    <Field label="How urgent is it? *"><select required value={form.urgency} onChange={(e) => update("urgency", e.target.value)}><option value="">Choose urgency</option>{urgencyOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
                  </div>
                  <Field label="What should we know?"><textarea rows={4} maxLength={1500} value={form.notes} onChange={(e) => update("notes", e.target.value)} placeholder="Describe the issue, equipment, or best time to contact you." /></Field>
                  <div className="absolute -left-[9999px]" aria-hidden="true"><label>Website<input tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => update("website", e.target.value)} /></label></div>
                  {status === "error" && <p className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm font-semibold text-red-300" role="alert">{error}</p>}
                  <button disabled={status === "submitting"} className="flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#ed1025] to-[#0966f4] px-5 text-base font-extrabold shadow-[0_12px_35px_rgba(6,83,230,.2)] hover:brightness-110 disabled:opacity-60">
                    {status === "submitting" ? "Sending request…" : <>Request HVAC service <ArrowRight className="h-5 w-5" /></>}
                  </button>
                  <p className="text-center text-xs leading-5 text-zinc-500">By submitting, you agree RightTemp may contact you about this request. No spam.</p>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-white/10 bg-[#07080c] px-5 py-14 sm:px-8">
        <div className="mx-auto grid max-w-6xl gap-5 sm:grid-cols-3">
          <Trust icon={Clock3} title="Responsive service" text="Your request enters our live dispatch system immediately." />
          <Trust icon={ShieldCheck} title="Professional work" text="Licensed, bonded, and insured HVAC service." accent="red" />
          <Trust icon={Wrench} title="Repair or replace" text="Clear options based on what your system actually needs." />
        </div>
      </section>

      <footer className="bg-black px-5 py-9 text-center text-sm text-zinc-500">
        <p className="font-bold text-zinc-200">RightTemp Heating & Air Conditioning</p>
        <p className="mt-1">License No. 1157733 · Bonded · Insured</p>
      </footer>
    </main>
  );
}

function Benefit({ color, children }: { color: "red" | "blue"; children: React.ReactNode }) {
  return <span className="flex items-center gap-3"><i className={`grid h-7 w-7 place-items-center rounded-full border ${color === "red" ? "border-red-500 text-red-500" : "border-blue-500 text-blue-500"}`}><Check className="h-4 w-4" strokeWidth={3} /></i>{children}</span>;
}

function Field({ label, icon: Icon, children }: { label: string; icon?: typeof UserRound; children: React.ReactElement }) {
  return <label className="block text-sm font-bold text-zinc-100">{label}<span className="relative mt-2 block">{Icon && <Icon className="pointer-events-none absolute left-4 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-red-500" />}<span className={`block [&>*]:min-h-14 [&>*]:w-full [&>*]:rounded-xl [&>*]:border [&>*]:border-white/15 [&>*]:bg-white/[.035] [&>*]:px-4 [&>*]:text-base [&>*]:font-medium [&>*]:text-white [&>*]:outline-none [&>*]:placeholder:text-zinc-500 [&>*]:focus:border-blue-500 [&>*]:focus:ring-4 [&>*]:focus:ring-blue-500/10 ${Icon ? "[&>*]:pl-12" : ""}`}>{children}</span></span></label>;
}

function Trust({ icon: Icon, title, text, accent = "blue" }: { icon: typeof Clock3; title: string; text: string; accent?: "blue" | "red" }) {
  return <div className="rounded-2xl border border-white/10 bg-white/[.025] p-6"><Icon className={`h-7 w-7 ${accent === "red" ? "text-red-500" : "text-blue-500"}`} /><h3 className="mt-4 font-extrabold">{title}</h3><p className="mt-2 text-sm leading-6 text-zinc-500">{text}</p></div>;
}
