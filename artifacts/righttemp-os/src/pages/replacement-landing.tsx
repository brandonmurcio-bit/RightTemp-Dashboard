import { useMemo, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  Check,
  CheckCircle2,
  ClipboardCheck,
  DollarSign,
  Home,
  ShieldCheck,
  ThermometerSun,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type FormState = {
  name: string;
  phone: string;
  email: string;
  zip: string;
  homeowner: string;
  systemAge: string;
  problem: string;
  timeline: string;
  financing: string;
  contactTime: string;
  website: string;
};

const initialForm: FormState = {
  name: "",
  phone: "",
  email: "",
  zip: "",
  homeowner: "",
  systemAge: "",
  problem: "",
  timeline: "",
  financing: "",
  contactTime: "",
  website: "",
};

const selectClass = "min-h-14 w-full rounded-xl border border-white/15 bg-[#111217] px-4 text-base font-medium text-white outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10";
const inputClass = "min-h-14 w-full rounded-xl border border-white/15 bg-white/[.035] px-4 text-base font-medium text-white outline-none placeholder:text-zinc-500 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10";

export default function ReplacementLandingPage() {
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
    const clickId = params.get("fbclid") ?? params.get("gclid") ?? params.get("msclkid") ?? "";
    const urgency = form.timeline === "asap" ? "today" : form.timeline === "30_days" ? "this_week" : "planning";
    const notes = [
      "REPLACEMENT QUALIFICATION",
      `Property owner: ${form.homeowner}`,
      `System age: ${form.systemAge}`,
      `Current problem: ${form.problem}`,
      `Replacement timeline: ${form.timeline}`,
      `Financing interest: ${form.financing}`,
      `Best contact time: ${form.contactTime || "Not provided"}`,
    ].join("\n");

    const { error: submitError } = await supabase.functions.invoke("capture-lead", {
      body: {
        name: form.name,
        phone: form.phone,
        email: form.email,
        zip: form.zip,
        serviceNeeded: "System replacement",
        urgency,
        notes,
        website: form.website,
        formStartedAt,
        attribution: {
          source: params.get("utm_source") ?? (params.has("fbclid") ? "facebook" : "replacement_page"),
          medium: params.get("utm_medium") ?? "replacement_funnel",
          campaign: params.get("utm_campaign") ?? "replacement",
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
          <a href="/" aria-label="RightTemp home" className="min-w-0 flex-[0_1_62%]">
            <img src="/icons/righttemp-header-logo.png" alt="RightTemp Heating & Air Conditioning" className="w-full max-w-[15.75rem] object-contain sm:max-w-[23rem]" />
          </a>
          <a href="#replacement-form" className="shrink-0 rounded-full bg-gradient-to-r from-[#e80019] via-[#c60042] to-[#075de9] px-4 py-3 text-xs font-extrabold shadow-[0_0_28px_rgba(26,92,255,.22)] sm:px-7 sm:py-4 sm:text-base">
            Compare options
          </a>
        </div>
        <div className="h-1 bg-gradient-to-r from-[#f20b20] via-[#7e195f] to-[#0869ff]" />
      </header>

      <section className="relative isolate">
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
          <div className="absolute right-[-8rem] top-8 h-[38rem] w-[38rem] rounded-full bg-blue-700/15 blur-[90px]" />
          <div className="absolute left-[-14rem] top-56 h-[34rem] w-[34rem] rounded-full bg-red-700/13 blur-[100px]" />
        </div>

        <div className="mx-auto grid max-w-6xl gap-12 px-5 pb-20 pt-14 sm:px-8 sm:pt-20 lg:grid-cols-[1.02fr_.98fr] lg:items-start">
          <div className="lg:sticky lg:top-8">
            <div className="inline-flex items-center gap-3 rounded-full border border-red-500/65 bg-black/65 px-4 py-2 text-[.7rem] font-extrabold uppercase tracking-[.18em] sm:text-xs">
              <BadgeCheck className="h-4 w-4 text-red-500" /> License No. 1157733 · Bonded · Insured
            </div>
            <p className="mt-9 text-xs font-extrabold uppercase tracking-[.24em] text-blue-400">AC & heating replacement</p>
            <h1 className="mt-4 text-[2.7rem] font-extrabold leading-[1.03] tracking-[-.055em] sm:text-6xl">
              Before another major repair, <span className="bg-gradient-to-r from-[#ff171d] via-[#bd2265] to-[#126dff] bg-clip-text text-transparent">compare your replacement options.</span>
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-zinc-300">Get a clear in-home evaluation and system options built around your house, comfort, and budget—without a high-pressure pitch.</p>

            <div className="mt-9 space-y-5">
              <Benefit>Free in-home replacement consultation</Benefit>
              <Benefit>Clear system options and written pricing</Benefit>
              <Benefit>Financing options available</Benefit>
              <Benefit>Local licensed installation</Benefit>
            </div>

            <div className="mt-10 grid grid-cols-3 gap-3">
              <MiniTrust icon={Home} label="Built for your home" />
              <MiniTrust icon={ShieldCheck} label="Licensed work" />
              <MiniTrust icon={DollarSign} label="Clear pricing" />
            </div>
          </div>

          <div id="replacement-form" className="scroll-mt-5 overflow-hidden rounded-[1.8rem] bg-gradient-to-br from-red-500 via-fuchsia-500/80 to-blue-500 p-[2px] shadow-[0_22px_85px_rgba(1,40,150,.24)]">
            <div className="rounded-[calc(1.8rem-2px)] bg-[linear-gradient(135deg,#09090c_0%,#101116_58%,#08090d_100%)] p-6 sm:p-9">
              {status === "success" ? (
                <div className="flex min-h-[42rem] flex-col items-center justify-center text-center" role="status">
                  <span className="grid h-20 w-20 place-items-center rounded-full border border-emerald-400/30 bg-emerald-400/10"><CheckCircle2 className="h-11 w-11 text-emerald-400" /></span>
                  <h2 className="mt-6 text-3xl font-extrabold">Your request is in.</h2>
                  <p className="mt-3 max-w-sm leading-7 text-zinc-400">RightTemp will review your replacement details and contact you to schedule the next step.</p>
                </div>
              ) : (
                <form onSubmit={submit} className="space-y-5">
                  <div>
                    <p className="text-xs font-extrabold uppercase tracking-[.2em] text-blue-500">Free replacement consultation</p>
                    <h2 className="mt-2 text-3xl font-extrabold tracking-tight">Tell us about your system</h2>
                    <p className="mt-2 text-sm text-zinc-400">A few quick details help us prepare the right options.</p>
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field label="Full name *"><input className={inputClass} required autoComplete="name" value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="Your full name" /></Field>
                    <Field label="Phone *"><input className={inputClass} required inputMode="tel" autoComplete="tel" minLength={10} value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder="(000) 000-0000" /></Field>
                  </div>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field label="Email"><input className={inputClass} type="email" autoComplete="email" value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="you@example.com" /></Field>
                    <Field label="ZIP code *"><input className={inputClass} required inputMode="numeric" autoComplete="postal-code" pattern="[0-9]{5}(-[0-9]{4})?" value={form.zip} onChange={(e) => update("zip", e.target.value)} placeholder="92345" /></Field>
                  </div>

                  <Field label="Do you own the property? *"><select className={selectClass} required value={form.homeowner} onChange={(e) => update("homeowner", e.target.value)}><option value="">Choose one</option><option value="Yes">Yes</option><option value="No">No</option></select></Field>
                  <Field label="How old is the current system? *"><select className={selectClass} required value={form.systemAge} onChange={(e) => update("systemAge", e.target.value)}><option value="">Choose system age</option><option value="Under 10 years">Under 10 years</option><option value="10–14 years">10–14 years</option><option value="15–19 years">15–19 years</option><option value="20+ years">20+ years</option><option value="Not sure">Not sure</option></select></Field>
                  <Field label="What is the biggest problem? *"><select className={selectClass} required value={form.problem} onChange={(e) => update("problem", e.target.value)}><option value="">Choose the main issue</option><option value="Not cooling or heating">Not cooling or heating</option><option value="Frequent repairs">Frequent repairs</option><option value="High energy bills">High energy bills</option><option value="Uneven temperatures">Uneven temperatures</option><option value="Old system / planning ahead">Old system / planning ahead</option><option value="Other">Other</option></select></Field>
                  <Field label="When are you considering replacement? *"><select className={selectClass} required value={form.timeline} onChange={(e) => update("timeline", e.target.value)}><option value="">Choose a timeline</option><option value="asap">As soon as possible</option><option value="30_days">Within 30 days</option><option value="1_3_months">Within 1–3 months</option><option value="researching">Just researching options</option></select></Field>
                  <Field label="Interested in financing options? *"><select className={selectClass} required value={form.financing} onChange={(e) => update("financing", e.target.value)}><option value="">Choose one</option><option value="Yes">Yes</option><option value="Maybe">Maybe</option><option value="No">No</option></select></Field>
                  <Field label="Best time to contact you"><input className={inputClass} value={form.contactTime} onChange={(e) => update("contactTime", e.target.value)} placeholder="Example: Weekdays after 4 PM" /></Field>

                  <div className="absolute -left-[9999px]" aria-hidden="true"><label>Website<input tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => update("website", e.target.value)} /></label></div>
                  {status === "error" && <p className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm font-semibold text-red-300" role="alert">{error}</p>}
                  <button disabled={status === "submitting"} className="flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#ed1025] to-[#0966f4] px-5 text-base font-extrabold shadow-[0_12px_35px_rgba(6,83,230,.2)] hover:brightness-110 disabled:opacity-60">
                    {status === "submitting" ? "Sending request…" : <>Compare replacement options <ArrowRight className="h-5 w-5" /></>}
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
          <Trust icon={ClipboardCheck} title="Evaluate first" text="We inspect the home and current equipment before recommending a system." />
          <Trust icon={ThermometerSun} title="Comfort-focused" text="Options are matched to the house—not picked from a generic price list." accent="red" />
          <Trust icon={ShieldCheck} title="Professional install" text="Licensed, bonded, and insured HVAC replacement." />
        </div>
      </section>

      <footer className="bg-black px-5 py-9 text-center text-sm text-zinc-500">
        <p className="font-bold text-zinc-200">RightTemp Heating & Air Conditioning</p>
        <p className="mt-1">License No. 1157733 · Bonded · Insured</p>
      </footer>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactElement }) {
  return <label className="block text-sm font-bold text-zinc-100">{label}<span className="mt-2 block">{children}</span></label>;
}

function Benefit({ children }: { children: React.ReactNode }) {
  return <span className="flex items-center gap-3 text-sm font-bold text-zinc-100 sm:text-base"><i className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-blue-500 text-blue-400"><Check className="h-4 w-4" strokeWidth={3} /></i>{children}</span>;
}

function MiniTrust({ icon: Icon, label }: { icon: typeof Home; label: string }) {
  return <div className="rounded-xl border border-white/10 bg-white/[.025] p-3 text-center"><Icon className="mx-auto h-5 w-5 text-blue-400" /><p className="mt-2 text-[.68rem] font-bold leading-4 text-zinc-400 sm:text-xs">{label}</p></div>;
}

function Trust({ icon: Icon, title, text, accent = "blue" }: { icon: typeof ClipboardCheck; title: string; text: string; accent?: "blue" | "red" }) {
  return <div className="rounded-2xl border border-white/10 bg-white/[.025] p-6"><Icon className={`h-7 w-7 ${accent === "red" ? "text-red-500" : "text-blue-500"}`} /><h3 className="mt-4 font-extrabold">{title}</h3><p className="mt-2 text-sm leading-6 text-zinc-500">{text}</p></div>;
}
