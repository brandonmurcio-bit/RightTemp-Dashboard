import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  Check,
  CircleAlert,
  Mail,
  MoreHorizontal,
  RefreshCw,
  ShieldCheck,
  UserMinus,
  UserPlus,
  Users,
} from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";

type MarketingMember = {
  membershipId: string;
  userId?: string;
  email?: string;
  fullName?: string | null;
  role?: string;
  joinedAt?: string;
};

const formatDate = (value?: string) => {
  if (!value) return "Pending";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

const initials = (member: MarketingMember) =>
  (member.fullName || member.email || "?")
    .split(/[\s@]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

export default function TeamPage() {
  const [members, setMembers] = useState<MarketingMember[]>([]);
  const [currentEmail, setCurrentEmail] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isInviting, setIsInviting] = useState(false);
  const [revokingId, setRevokingId] = useState("");
  const [selectedMember, setSelectedMember] = useState<MarketingMember | null>(null);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [loadError, setLoadError] = useState("");

  const loadMembers = useCallback(async () => {
    setIsLoading(true);
    setLoadError("");
    try {
      const [{ data, error }, userResponse] = await Promise.all([
        supabase.functions.invoke("manage-marketing-access", { body: { action: "list" } }),
        supabase.auth.getUser(),
      ]);
      if (error) throw error;
      setMembers(((data?.members || []) as MarketingMember[]));
      setCurrentEmail(userResponse.data.user?.email || "");
    } catch (caught) {
      setLoadError(caught instanceof Error ? caught.message : "Unable to load marketing access.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMembers();
  }, [loadMembers]);

  const handleInvite = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !normalizedEmail.includes("@")) {
      setFeedback({ tone: "error", text: "Enter a valid email address." });
      return;
    }
    setIsInviting(true);
    try {
      const { data, error: functionError } = await supabase.functions.invoke("manage-marketing-access", {
        body: {
          action: "invite",
          email: normalizedEmail,
          fullName: fullName.trim() || undefined,
        },
      });
      if (functionError) throw functionError;
      setEmail("");
      setFullName("");
      setFeedback({ tone: "success", text: data?.message || (data?.invited ? "Invitation sent." : "Marketing access updated.") });
      await loadMembers();
    } catch (caught) {
      setFeedback({ tone: "error", text: caught instanceof Error ? caught.message : "Unable to invite this user." });
    } finally {
      setIsInviting(false);
    }
  };

  const handleRevoke = async () => {
    if (!selectedMember) return;
    setRevokingId(selectedMember.membershipId);
    setFeedback(null);
    try {
      const { error: functionError } = await supabase.functions.invoke("manage-marketing-access", {
        body: { action: "revoke", membershipId: selectedMember.membershipId },
      });
      if (functionError) throw functionError;
      setMembers((current) => current.filter((member) => member.membershipId !== selectedMember.membershipId));
      setFeedback({ tone: "success", text: `${selectedMember.email || "User"} no longer has marketing access.` });
      setSelectedMember(null);
    } catch (caught) {
      setFeedback({ tone: "error", text: caught instanceof Error ? caught.message : "Unable to revoke access." });
    } finally {
      setRevokingId("");
    }
  };

  return (
    <div className="min-h-[100dvh] bg-background">
      <div className="mx-auto max-w-[1250px] space-y-6 p-4 md:space-y-8 md:p-8">
        <header className="relative overflow-hidden rounded-3xl border border-white/10 bg-[linear-gradient(120deg,rgba(12,31,53,.95),rgba(17,24,39,.88)_62%,rgba(124,25,31,.34))] p-5 md:p-8">
          <div className="pointer-events-none absolute -bottom-32 -right-20 h-72 w-72 rounded-full bg-red-500/10 blur-3xl" />
          <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-sky-300/20 bg-sky-300/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-sky-200">
                <ShieldCheck className="h-3.5 w-3.5" /> Access control
              </div>
              <h1 className="text-3xl font-black tracking-tight md:text-5xl">Marketing access</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">Give the people who own acquisition a clean view of attribution and outcomes. This area is limited to organization owners and admins.</p>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-background/20 px-4 py-3 backdrop-blur-sm">
              <div className="grid h-9 w-9 place-items-center rounded-full bg-sky-400/15 text-sky-300"><Users className="h-4 w-4" /></div>
              <div><p className="text-xs text-muted-foreground">Signed in as</p><p className="max-w-[210px] truncate text-sm font-semibold">{currentEmail || "Current account"}</p></div>
            </div>
          </div>
        </header>

        {feedback && (
          <div className={`flex items-start gap-3 rounded-xl border p-4 text-sm ${feedback.tone === "success" ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-200" : "border-red-500/20 bg-red-500/10 text-red-200"}`}>
            {feedback.tone === "success" ? <Check className="mt-0.5 h-4 w-4 shrink-0" /> : <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />}
            <span>{feedback.text}</span>
          </div>
        )}

        <section className="grid gap-6 xl:grid-cols-[.8fr_1.2fr]">
          <Card className="border-white/10 bg-card/70">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><UserPlus className="h-4 w-4 text-red-300" /> Invite a marketer</CardTitle>
              <CardDescription>They will receive access to the marketing workspace only.</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={handleInvite}>
                <div className="space-y-2"><Label htmlFor="marketing-email">Email address</Label><div className="relative"><Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input id="marketing-email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@company.com" className="pl-9" /></div></div>
                <div className="space-y-2"><Label htmlFor="marketing-name">Name <span className="font-normal text-muted-foreground">(optional)</span></Label><Input id="marketing-name" value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Avery Morgan" /></div>
                <Button type="submit" className="w-full gap-2" disabled={isInviting}>{isInviting ? <><RefreshCw className="h-4 w-4 animate-spin" />Sending invite</> : <><UserPlus className="h-4 w-4" />Invite to marketing</>}</Button>
              </form>
              <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.025] p-3 text-xs leading-5 text-muted-foreground"><span className="font-semibold text-foreground">Permission boundary.</span> Marketing users can review attribution, pipeline outcomes, and campaign spend. They cannot access this page or manage organization members.</div>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-card/70">
            <CardHeader className="flex flex-row items-start justify-between gap-3">
              <div><CardTitle className="text-base">People with marketing access</CardTitle><CardDescription>{members.length} active {members.length === 1 ? "member" : "members"} · Changes apply immediately</CardDescription></div>
              <Button variant="outline" size="sm" className="gap-2" onClick={() => void loadMembers()} disabled={isLoading}><RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />Refresh</Button>
            </CardHeader>
            <CardContent>
              {loadError ? (
                <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-5 text-center"><CircleAlert className="mx-auto h-5 w-5 text-red-300" /><p className="mt-2 text-sm text-red-200">{loadError}</p><Button variant="outline" size="sm" className="mt-4" onClick={() => void loadMembers()}>Try again</Button></div>
              ) : isLoading ? (
                <div className="space-y-3">{[1, 2, 3].map((item) => <div key={item} className="h-[72px] animate-pulse rounded-xl bg-muted/60" />)}</div>
              ) : members.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 px-5 py-12 text-center"><Users className="mx-auto h-7 w-7 text-muted-foreground" /><p className="mt-3 font-semibold">No marketing users yet</p><p className="mt-1 text-sm text-muted-foreground">Invite the first person responsible for turning traffic into pipeline.</p></div>
              ) : (
                <div className="space-y-2">
                  {members.map((member) => (
                    <div key={member.membershipId} className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.025] p-3 transition-colors hover:border-white/15">
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-sky-300/15 bg-sky-300/10 text-xs font-bold text-sky-200">{initials(member)}</div>
                      <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{member.fullName || "Invited marketer"}</p><p className="truncate text-xs text-muted-foreground">{member.email || "Email unavailable"}</p></div>
                      <div className="hidden text-right sm:block"><Badge variant="outline" className="border-sky-300/20 text-[10px] text-sky-200">{member.role || "marketing"}</Badge><p className="mt-1 text-[10px] text-muted-foreground">Joined {formatDate(member.joinedAt)}</p></div>
                      <Button variant="ghost" size="icon" aria-label={`Revoke access for ${member.email || "member"}`} className="shrink-0 text-muted-foreground hover:text-red-300" onClick={() => setSelectedMember(member)}><MoreHorizontal className="h-4 w-4" /></Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        <footer className="flex items-center gap-2 border-t border-white/10 pt-4 text-xs text-muted-foreground"><ShieldCheck className="h-3.5 w-3.5 text-sky-300" /> Access changes are logged by the organization.</footer>
      </div>

      <AlertDialog open={Boolean(selectedMember)} onOpenChange={(open) => !open && setSelectedMember(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke marketing access?</AlertDialogTitle>
            <AlertDialogDescription>{selectedMember?.email || "This member"} will lose access to the marketing workspace immediately. Their organization membership is not otherwise changed.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={Boolean(revokingId)}>Keep access</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground" disabled={Boolean(revokingId)} onClick={(event) => { event.preventDefault(); void handleRevoke(); }}>{revokingId ? "Revoking…" : <><UserMinus className="h-4 w-4" />Revoke access</>}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}