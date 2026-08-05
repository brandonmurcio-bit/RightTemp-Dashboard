import { useMemo, useState } from "react";
import { ArrowRight, BadgeCheck, CheckCircle2, Clock3, Flame, ShieldCheck, Snowflake, Star, Wrench } from "lucide-react";
import { supabase } from "@/lib/supabase";

const services = [
  "AC repair",
  "Heating repair",
  "System replacement",
  "Maintenance / tune-up",
  "Indoor air quality",
  "Ductwork",
  "Other",
];

const urgencyOptions = [
  ["emergency", "Emergency — no cooling or heat"],
  ["today", "As soon as possible"],
  ["this_week", "Sometime this week"],
  ["planning", "Planning / comparing options"],
] as const;

type FormState = {
  name: string;
  phone: string;
  email: string;
  zip: string;
  serviceNeeded: string;
  urgency: string;
  notes: string;
  website: string;
};

const initialForm: FormState = {
  name: "",
  phone: "",
  email: "",
  zip: "",
  serviceNeeded: "",
  urgency: "",
  notes: "",
  website: "",
};

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
    <main className="min-h-[100dvh] overflow-x-hidden bg-[#f7f4ee] text-slate-950 selection:bg-blue-600 selection:text-white">
      <header className="border-b border-slate-900/10 bg-[#f7f4ee]/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <a href="#top" className="flex items-center gap-2" aria-label="RightTemp home">
            <span className="relative grid h-10 w-10 place-items-center overflow-hidden rounded-xl bg-slate-950 text-white">
              <Snowflake className="absolute left-1 h-6 w-6 text-blue-400" />
              <Flame className="absolute right-1 h-6 w-6 text-red-500" />
            </span>
            <span className="text-xl font-extrabold tracking-[-0.04em]">RIGHT<span className="text-blue-600">TEMP</span></span>
          </a>
          <a href="#request-service" className="rounded-full bg-slate-950 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-blue-700">
            Request service
          </a>
        </div>
      </header>

      <section id="top" className="relative isolate overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_15%_15%,rgba(37,99,235,.16),transparent_32rem),radial-gradient(circle_at_90%_35%,rgba(239,68,68,.12),transparent_28rem)]" />
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:py-20 lg:grid-cols-[1.05fr_.95fr] lg:items-center">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-blue-700/20 bg-blue-600/10 px-3 py-1.5 text-xs font-extrabold uppercase tracking-[.15em] text-blue-800">
              <BadgeCheck className="h-4 w-4" /> Licensed • Bonded • Insured
            </div>
            <h1 className="max-w-3xl text-4xl font-extrabold leading-[.98] tracking-[-.055em] sm:text-6xl">
              Your comfort fixed.<br /><span className="text-blue-700">The right way.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
              Straight answers, clean HVAC work, and options that fit your home—not a high-pressure sales pitch.
            </p>
            <div className="mt-7 flex flex-wrap gap-x-6 gap-y-3 text-sm font-bold text-slate-700">
              <span className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-emerald-600" /> Local HVAC professionals</span>
              <span className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-emerald-600" /> Upfront recommendations</span>
              <span className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-emerald-600" /> Residential service</span>
            </div>
          </div>

          <div id="request-service" className="scroll-mt-6 rounded-[2rem] border border-slate-900/10 bg-white p-5 shadow-[0_30px_80px_rgba(15,23,42,.16)] sm:p-7">
            {status === "success" ? (
              <div className="flex min-h-[34rem] flex-col items-center justify-center text-center" role="status">
                <span className="grid h-20 w-20 place-items-center rounded-full bg-emerald-100"><CheckCircle2 className="h-11 w-11 text-emerald-700" /></span>
                <h2 className="mt-6 text-3xl font-extrabold tracking-tight">Request received.</h2>
                <p className="mt-3 max-w-sm leading-7 text-slate-600">Your information is now with RightTemp. We’ll reach out as soon as possible.</p>
                <button type="button" onClick={() => setStatus("idle")} className="mt-7 font-bold text-blue-700 underline underline-offset-4">Send another request</button>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-4">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-[.16em] text-blue-700">Fast service request</p>
                  <h2 className="mt-1 text-2xl font-extrabold tracking-tight">Tell us what’s going on</h2>
                  <p className="mt-1 text-sm text-slate-500">Fields marked * are required.</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Full name *"><input required autoComplete="name" value={form.name} onChange={(e) => update("name", e.target.value)} /></Field>
                  <Field label="Phone *"><input required inputMode="tel" autoComplete="tel" minLength={10} value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder="(760) 555-0123" /></Field>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Email"><input type="email" autoComplete="email" value={form.email} onChange={(e) => update("email", e.target.value)} /></Field>
                  <Field label="ZIP code *"><input required inputMode="numeric" autoComplete="postal-code" pattern="[0-9]{5}(-[0-9]{4})?" value={form.zip} onChange={(e) => update("zip", e.target.value)} /></Field>
                </div>
                <Field label="Service needed *">
                  <select required value={form.serviceNeeded} onChange={(e) => update("serviceNeeded", e.target.value)}>
                    <option value="">Choose a service</option>{services.map((service) => <option key={service}>{service}</option>)}
                  </select>
                </Field>
                <Field label="How urgent is it? *">
                  <select required value={form.urgency} onChange={(e) => update("urgency", e.target.value)}>
                    <option value="">Choose urgency</option>{urgencyOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </Field>
                <Field label="What should we know?"><textarea rows={3} maxLength={1500} value={form.notes} onChange={(e) => update("notes", e.target.value)} placeholder="Describe the issue, equipment, or best time to contact you." /></Field>
                <div className="absolute -left-[9999px]" aria-hidden="true"><label>Website<input tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => update("website", e.target.value)} /></label></div>
                {status === "error" && <p className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700" role="alert">{error}</p>}
                <button disabled={status === "submitting"} className="flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 text-base font-extrabold text-white shadow-lg shadow-blue-700/20 hover:bg-blue-800 disabled:opacity-60">
                  {status === "submitting" ? "Sending request…" : <>Request HVAC service <ArrowRight className="h-5 w-5" /></>}
                </button>
                <p className="text-center text-xs leading-5 text-slate-500">By submitting, you agree RightTemp may contact you about this request. No spam.</p>
              </form>
            )}
          </div>
        </div>
      </section>

      <section className="bg-slate-950 px-4 py-12 text-white sm:px-6">
        <div className="mx-auto grid max-w-6xl gap-4 sm:grid-cols-3">
          <Trust icon={Clock3} title="Responsive service" text="Your request enters our live dispatch system immediately." />
          <Trust icon={ShieldCheck} title="Professional work" text="Licensed, bonded, and insured HVAC service." />
          <Trust icon={Wrench} title="Repair or replace" text="Clear options based on what your system actually needs." />
        </div>
      </section>

      <footer className="bg-[#f7f4ee] px-4 py-8 text-center text-sm text-slate-500">
        <div className="mb-2 flex justify-center gap-1 text-amber-500" aria-label="Five star service">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className="h-4 w-4 fill-current" />)}</div>
        <p className="font-bold text-slate-800">RightTemp Heating & Air Conditioning</p>
        <p className="mt-1">Serving the High Desert and surrounding communities.</p>
      </footer>
    </main>
  );
}
function Field({ label, children }: { label: string; children: React.ReactElement }) {
  return <label className="block text-sm font-bold text-slate-700">{label}{<span className="mt-1.5 block [&>*]:min-h-12 [&>*]:w-full [&>*]:rounded-xl [&>*]:border [&>*]:border-slate-300 [&>*]:bg-white [&>*]:px-3.5 [&>*]:text-base [&>*]:font-medium [&>*]:text-slate-950 [&>*]:outline-none [&>*]:focus:border-blue-600 [&>*]:focus:ring-4 [&>*]:focus:ring-blue-600/10">{children}</span>}</label>;
}

function Trust({ icon: Icon, title, text }: { icon: typeof Clock3; title: string; text: string }) {
  return <div className="rounded-2xl border border-white/10 bg-white/[.04] p-5"><Icon className="h-7 w-7 text-blue-400" /><h3 className="mt-4 font-extrabold">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-400">{text}</p></div>;
}
