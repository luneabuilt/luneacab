import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import { Home, User, Clock, Car } from "lucide-react";
import { cn } from "@/lib/utils";

export default function BottomNav() {
  const [location] = useLocation();
  const { user } = useAuth();

  if (!user) return null;

  const passengerLinks = [
    { href: "/home", icon: Home, label: "Home" },
    { href: "/history", icon: Clock, label: "History" },
    { href: "/profile", icon: User, label: "Profile" },
  ];

  const driverLinks = [
    { href: "/driver", icon: Car, label: "Drive" },
    { href: "/earnings", icon: Clock, label: "Earnings" },
    { href: "/profile", icon: User, label: "Profile" },
  ];

  const links = user.role === "driver" ? driverLinks : passengerLinks;

  return (
    <div className="fixed bottom-4 left-0 right-0 z-50 flex justify-center px-4">
      {/* 🔥 Floating Container */}
      <div className="w-full max-w-md bg-white/90 backdrop-blur-lg border border-gray-200 shadow-2xl rounded-2xl flex justify-between items-center px-2 py-2">
        
        {links.map((link) => {
          const isActive =
            location === link.href ||
            (link.href === "/home" && location === "/");

          return (
            <Link
              key={link.href}
              href={link.href}
              className="flex-1 flex justify-center"
            >
              <div
                className={cn(
                  "flex flex-col items-center justify-center px-4 py-2 rounded-xl transition-all duration-300",
                  isActive
                    ? "bg-primary/10 text-primary scale-105"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <link.icon
                  className={cn(
                    "w-5 h-5 mb-1 transition-all",
                    isActive ? "stroke-[2.5]" : "stroke-[2]"
                  )}
                />
                <span className="text-[11px] font-medium">
                  {link.label}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}