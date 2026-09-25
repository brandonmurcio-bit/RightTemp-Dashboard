import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import {
  Route,
  Switch,
  Router as WouterRouter,
} from "wouter";

import { supabase } from "@/lib/supabase";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout";

import LoginPage from "@/pages/login";
import NotFound from "@/pages/not-found";
import DashboardPage from "@/pages/dashboard";
import LeadsPage from "@/pages/leads";
import LeadDetailPage from "@/pages/lead-detail";
import CustomersPage from "@/pages/customers";
import CustomerDetailPage from "@/pages/customer-detail";
import JobsPage from "@/pages/jobs";
import JobDetailPage from "@/pages/job-detail";
import NewJobPage from "@/pages/new-job";
import EstimatesPage from "@/pages/estimates";
import PurchaseOrdersPage from "@/pages/purchase-orders";
import SchedulePage from "@/pages/schedule";
import InvoicesPage from "@/pages/invoices";
import ServiceLandingPage from "@/pages/service-landing";
import ReplacementLandingPage from "@/pages/replacement-landing";
import SettingsPage from "@/pages/settings";
import MarketingPage from "@/pages/marketing";
import TeamPage from "@/pages/team";
import { SettingsProvider } from "@/features/settings/settings.context";
import { useSettings } from "@/features/settings/settings.context";
const queryClient = new QueryClient();

function MarketingRoute() {
  const { canViewMarketing } = useSettings();
  return canViewMarketing ? <MarketingPage /> : <NotFound />;
}

function TeamRoute() {
  const { isAdmin } = useSettings();
  return isAdmin ? <TeamPage /> : <NotFound />;
}

function AuthenticatedRoutes() {
  const { role, isLoading } = useSettings();

  if (isLoading || !role) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <p className="text-sm text-muted-foreground">Loading RightTemp OS...</p>
      </div>
    );
  }

  if (role === "marketing") {
    return (
      <Layout>
        <MarketingPage />
      </Layout>
    );
  }

  return (
    <Layout>
      <Switch>
        <Route path="/" component={DashboardPage} />
        <Route path="/login" component={DashboardPage} />

        <Route path="/marketing" component={MarketingRoute} />
        <Route path="/team" component={TeamRoute} />

        <Route path="/leads" component={LeadsPage} />
        <Route path="/leads/:id" component={LeadDetailPage} />

        <Route path="/customers" component={CustomersPage} />
        <Route path="/customers/:id" component={CustomerDetailPage} />

        <Route path="/jobs" component={JobsPage} />
        <Route path="/schedule" component={SchedulePage} />
        <Route path="/jobs/new" component={NewJobPage} />
        <Route path="/jobs/:id" component={JobDetailPage} />

        <Route path="/estimates" component={EstimatesPage} />
        <Route path="/invoices" component={InvoicesPage} />
        <Route path="/purchase-orders" component={PurchaseOrdersPage} />
        <Route path="/settings" component={SettingsPage} />

        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function AuthenticatedRouter() {
  return (
    <SettingsProvider>
      <AuthenticatedRoutes />
    </SettingsProvider>
  );
}

function Router() {
  const [session, setSession] = useState<Session | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadSession = async () => {
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();

      if (isMounted) {
        setSession(currentSession);
        setIsCheckingSession(false);
      }
    };

    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setIsCheckingSession(false);

      if (!nextSession) {
        queryClient.clear();
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const pathname = window.location.pathname.replace(/\/$/, "") || "/";

  if (pathname === "/replacement") {
    return <ReplacementLandingPage />;
  }

  if (pathname === "/" || pathname === "/service") {
    return <ServiceLandingPage />;
  }

  if (isCheckingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <p className="text-sm text-muted-foreground">
          Loading RightTemp OS...
        </p>
      </div>
    );
  }

  if (!session) {
    return <LoginPage />;
  }

  return <AuthenticatedRouter />;
}

function App() {
  const pathname = window.location.pathname.replace(/\/$/, "") || "/";
  const isPublicSite = pathname === "/" || pathname === "/service" || pathname === "/replacement";
  const routerBase = pathname === "/app" || pathname.startsWith("/app/")
    ? "/app"
    : import.meta.env.BASE_URL.replace(/\/$/, "");

  useEffect(() => {
    document.title = pathname === "/replacement"
      ? "AC Replacement Options | RightTemp Heating & Air Conditioning"
      : isPublicSite
        ? "RightTemp Heating & Air Conditioning"
        : "RightTemp OS";
  }, [isPublicSite, pathname]);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={routerBase}>
          <Router />
        </WouterRouter>

        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
