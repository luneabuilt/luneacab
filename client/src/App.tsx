import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import BottomNav from "@/components/BottomNav";

import Home from "@/pages/Home";
import Auth from "@/pages/Auth";
import DriverDashboard from "@/pages/DriverDashboard";
import Profile from "@/pages/Profile";
import NotFound from "@/pages/not-found";
import History from "@/pages/History";

import Earnings from "@/pages/Earnings";

import Admin from "@/pages/Admin";

function Router() {
  return (
    <div className="min-h-screen bg-background text-foreground antialiased font-sans pb-16 md:pb-0">
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/home" component={Home} />
        <Route path="/driver" component={DriverDashboard} />
        <Route path="/auth" component={Auth} />
        <Route path="/profile" component={Profile} />
        <Route path="/admin" component={Admin} />

        <Route path="/super-admin-dashboard" component={Admin} />

        {/* Placeholder pages */}
        <Route path="/history" component={History} />
        <Route path="/earnings" component={Earnings} />
        <Route component={NotFound} />
      </Switch>
      <BottomNav />
    </div>
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
