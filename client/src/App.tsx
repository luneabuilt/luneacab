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
import DriverSignup from "@/pages/DriverSignup";
import { useAuth } from "@/hooks/use-auth";

function Router() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background text-foreground antialiased font-sans pb-16 md:pb-0">
      <Switch>

        {/* 🔥 NOT LOGGED IN */}
        {!user && <Route path="*" component={Auth} />}

        {/* 🔥 DRIVER NOT REGISTERED */}
        {user && user.role !== "driver" && (
          <>
            <Route path="/driver-signup" component={DriverSignup} />
            <Route path="*">
              <Redirect to="/driver-signup" />
            </Route>
          </>
        )}

        {/* 🔥 DRIVER NOT APPROVED */}
        {user && user.role === "driver" && !user.isApproved && (
          <Route path="*">
            <div className="p-6 text-center">
              <h2 className="text-xl font-bold">Waiting for Approval</h2>
              <p className="text-muted-foreground">
                Your account is under review by admin.
              </p>
            </div>
          </Route>
        )}

        {/* 🔥 APPROVED DRIVER */}
        {user && user.role === "driver" && user.isApproved && (
          <>
            <Route path="/" component={DriverDashboard} />
            <Route path="/driver" component={DriverDashboard} />
            <Route path="/profile" component={Profile} />
            <Route path="/earnings" component={Earnings} />
            <Route path="/history" component={History} />
          </>
        )}

        {/* 🔥 ADMIN */}
        {user && user.role === "admin" && (
          <>
            <Route path="/admin" component={Admin} />
            <Route path="*">
              <Redirect to="/admin" />
            </Route>
          </>
        )}

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