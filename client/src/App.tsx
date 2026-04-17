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

import { useEffect } from "react";
import { BASE_URL } from "@/lib/config";

function Router() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background text-foreground antialiased font-sans pb-16 md:pb-0">
      <Switch>

  {/* 🔥 NOT LOGGED IN */}
  {!user && <Route path="*" component={Auth} />}

  {/* 🔥 PASSENGER */}
  {user && user.role === "passenger" && (
    <>
      <Route path="/" component={Home} />
      <Route path="/home" component={Home} />
      <Route path="/profile" component={Profile} />
      <Route path="/history" component={History} />
      <Route path="/driver-signup" component={DriverSignup} />
    </>
  )}

  {/* 🔥 DRIVER NOT APPROVED */}
  {user && user.role === "driver" && !user.isApproved && (
    <Route path="*">
      <div className="p-6 text-center">
        <h2 className="text-xl font-bold">Waiting for Approval</h2>
        <p className="text-muted-foreground">
          Your account is under review
        </p>
      </div>
    </Route>
  )}

  {/* 🔥 APPROVED DRIVER */}
  {user && user.role === "driver" && user.isApproved && (
    <>
      <Route path="/" component={DriverDashboard} />
      <Route path="/driver" component={DriverDashboard} />
      <Route path="/earnings" component={Earnings} />
      <Route path="/history" component={History} />
      <Route path="/profile" component={Profile} />
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
  <Route path="*">
  <div className="p-6 text-center">Page Not Found</div>
</Route>

</Switch>

      <BottomNav />
    </div>
  );
}

function App() {
  const { user, setUser } = useAuth(); // ✅ ADD THIS

  useEffect(() => {
    if (!user) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${BASE_URL}/api/users/${user.id}`);
        const updatedUser = await res.json();

        setUser(updatedUser);
      } catch (err) {
        console.error("Auto refresh error:", err);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
  if (!user) return;

  const interval = setInterval(async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/users/${user.id}`);
      const updatedUser = await res.json();

      setUser(updatedUser);
    } catch (err) {
      console.error("Auto refresh error:", err);
    }
  }, 5000); // every 5 sec

  return () => clearInterval(interval);
}, [user]);

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