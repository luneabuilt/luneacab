import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import { Home, User, Clock, Settings, Car } from "lucide-react";
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
    <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-zinc-900 border-t border-gray-200 dark:border-gray-800 pb-safe z-50">
      <div className="flex justify-around items-center h-16">
        {links.map((link) => {
          const isActive =
            location === link.href ||
            (link.href === "/home" && location === "/");
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <link.icon
                className={cn("w-6 h-6", isActive && "fill-current")}
                strokeWidth={isActive ? 2.5 : 2}
              />
              <span className="text-[10px] font-medium">{link.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
