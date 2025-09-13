import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Dashboard from "@/pages/dashboard";
import Rigs from "@/pages/rigs";
import Wells from "@/pages/wells";
import SurveyEngine from "@/pages/survey-engine";
import ComingSoon from "@/pages/coming-soon";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/rigs" component={Rigs} />
      <Route path="/wells" component={Wells} />
      <Route path="/survey" component={SurveyEngine} />
      <Route path="/bha" component={() => <ComingSoon title="BHA Manager" description="Bottom hole assembly configuration and management" />} />
      <Route path="/traces" component={() => <ComingSoon title="Traces" description="Real-time drilling traces and data visualization" />} />
      <Route path="/alarms" component={() => <ComingSoon title="Smart Alarms" description="Intelligent drilling alarm management system" />} />
      <Route path="/reports" component={() => <ComingSoon title="Reports" description="Comprehensive drilling reports and analytics" />} />
      <Route path="/sync" component={() => <ComingSoon title="Cloud Sync" description="Data synchronization with cloud services" />} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
