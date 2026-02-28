import { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Phone, Mail, Truck, ChevronDown, LogOut, User, LayoutDashboard, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/context/auth";
import { SignInModal } from "@/components/SignInModal";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useUnreadCount } from "@/hooks/useMessages";

const jobDropdownItems = [
  { name: "All Jobs", path: "/jobs" },
  { name: "Dry Van", path: "/jobs?type=dry-van" },
  { name: "Flatbed", path: "/jobs?type=flatbed" },
  { name: "Dry Bulk", path: "/jobs?type=dry-bulk" },
  { name: "Refrigerated", path: "/jobs?type=refrigerated" },
  { name: "Tanker", path: "/jobs?type=tanker" },
  { name: "Teams driving", path: "/jobs?type=teams" },
  { name: "Owner Operator", path: "/jobs?type=owner-operator" },
  { name: "Students", path: "/jobs?type=students" },
];

const navLinks = [
  { name: "Home", path: "/" },
  { name: "Apply Now", path: "/apply" },
  { name: "Drivers", path: "/drivers" },
  { name: "Jobs", path: "/jobs", dropdown: jobDropdownItems },
  { name: "Companies", path: "/companies" },
  { name: "Pricing", path: "/pricing" },
];

const getInitials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

// Truck front-view SVG — headlights off in light mode, glowing amber in dark mode
const TruckToggle = ({ isDark, onClick }: { isDark: boolean; onClick: () => void }) => (
  <button
    onClick={onClick}
    title={isDark ? "Switch to light mode" : "Switch to dark mode"}
    className="p-1.5 rounded-lg hover:bg-muted transition-colors"
    aria-label="Toggle dark mode"
  >
    <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
      {/* Cab roof */}
      <path
        d="M4 9 L4 5.5 Q15 2.5 26 5.5 L26 9 Z"
        className="fill-primary dark:fill-slate-400 transition-colors duration-300"
      />
      {/* Windshield */}
      <rect x="5.5" y="9" width="19" height="6.5" rx="0.5"
        className="fill-sky-200 dark:fill-slate-800 transition-colors duration-300"
      />
      {/* Main body / hood */}
      <rect x="3" y="15.5" width="24" height="10" rx="0.5"
        className="fill-primary dark:fill-slate-700 transition-colors duration-300"
      />
      {/* Grille center section */}
      <rect x="11.5" y="16.5" width="7" height="8" rx="0.5"
        className="fill-primary/60 dark:fill-slate-600 transition-colors duration-300"
      />
      {/* Grille lines */}
      <line x1="11.5" y1="18.5" x2="18.5" y2="18.5"
        className="stroke-white/20 dark:stroke-slate-500"
        strokeWidth="0.6"
      />
      <line x1="11.5" y1="20.5" x2="18.5" y2="20.5"
        className="stroke-white/20 dark:stroke-slate-500"
        strokeWidth="0.6"
      />
      <line x1="11.5" y1="22.5" x2="18.5" y2="22.5"
        className="stroke-white/20 dark:stroke-slate-500"
        strokeWidth="0.6"
      />
      {/* Left headlight housing */}
      <rect x="3.5" y="16.5" width="7" height="7" rx="0.5"
        className="fill-primary/75 dark:fill-slate-600 transition-colors duration-300"
      />
      {/* Right headlight housing */}
      <rect x="19.5" y="16.5" width="7" height="7" rx="0.5"
        className="fill-primary/75 dark:fill-slate-600 transition-colors duration-300"
      />
      {/* Left headlight bulb */}
      <circle
        cx="7"
        cy="20"
        r="2.4"
        fill={isDark ? "#fbbf24" : "#4b5563"}
        style={isDark ? { filter: "drop-shadow(0 0 4px #fbbf24) drop-shadow(0 0 10px #f59e0b)" } : undefined}
        className="transition-colors duration-300"
      />
      {/* Right headlight bulb */}
      <circle
        cx="23"
        cy="20"
        r="2.4"
        fill={isDark ? "#fbbf24" : "#4b5563"}
        style={isDark ? { filter: "drop-shadow(0 0 4px #fbbf24) drop-shadow(0 0 10px #f59e0b)" } : undefined}
        className="transition-colors duration-300"
      />
      {/* Bumper */}
      <rect x="2" y="25.5" width="26" height="2.5" rx="0.5"
        className="fill-primary/50 dark:fill-slate-500 transition-colors duration-300"
      />
    </svg>
  </button>
);

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [jobsDropdownOpen, setJobsDropdownOpen] = useState(false);
  const [jobsMobileOpen, setJobsMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [signInOpen, setSignInOpen] = useState(false);
  const [signOutOpen, setSignOutOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { isDark, toggle } = useTheme();
  const { user, signOut } = useAuth();

  // Unseen notification counts
  const isCompany = user?.role === "company";
  const isDriver = user?.role === "driver";

  // Company: new applications since last viewed
  const { data: newAppCount = 0 } = useQuery({
    queryKey: ["new-app-count", user?.id],
    queryFn: async () => {
      const lastSeen = localStorage.getItem(`cdl-apps-seen-${user!.id}`) ?? "1970-01-01T00:00:00Z";
      const { count, error } = await supabase
        .from("applications")
        .select("*", { count: "exact", head: true })
        .eq("company_id", user!.id)
        .gt("submitted_at", lastSeen);
      if (error) return 0;
      return count ?? 0;
    },
    enabled: !!isCompany,
    refetchInterval: 30_000,
  });

  // Driver: applications whose status changed since last viewed
  const { data: driverUpdateCount = 0 } = useQuery({
    queryKey: ["driver-update-count", user?.id],
    queryFn: async () => {
      const lastSeen = localStorage.getItem(`cdl-apps-seen-${user!.id}`) ?? "1970-01-01T00:00:00Z";
      const { count, error } = await supabase
        .from("applications")
        .select("*", { count: "exact", head: true })
        .eq("driver_id", user!.id)
        .neq("pipeline_stage", "New")
        .gt("updated_at", lastSeen);
      if (error) return 0;
      return count ?? 0;
    },
    enabled: !!isDriver,
    refetchInterval: 30_000,
  });

  const { data: unreadMsgCount = 0 } = useUnreadCount(user?.id);
  const notifCount = (isCompany ? newAppCount : driverUpdateCount) + unreadMsgCount;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const confirmSignOut = async () => {
    setSignOutOpen(false);
    await signOut();
    navigate("/");
  };

  return (
    <>
      {/* Top bar */}
      <div className="hidden lg:block bg-secondary text-secondary-foreground">
        <div className="container mx-auto flex items-center justify-between py-2 text-sm">
          <div className="flex items-center gap-6">
            <a href="tel:+16189360241" className="flex items-center gap-2 hover:text-primary transition-colors">
              <Phone className="h-3.5 w-3.5" />
              +1 618-936-0241
            </a>
            <a href="mailto:info@cdljobscenter.com" className="flex items-center gap-2 hover:text-primary transition-colors">
              <Mail className="h-3.5 w-3.5" />
              info@cdljobscenter.com
            </a>
          </div>
          <p className="text-muted-foreground">Mon - Sat: 7:00 AM - 5:00 PM</p>
        </div>
      </div>

      {/* Main nav */}
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="sticky top-0 z-50 glass border-b border-border/50"
      >
        <div className="container mx-auto flex items-center justify-between py-4">
          <Link to="/" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
              <Truck className="h-6 w-6 text-primary-foreground" />
            </div>
            <div className="font-display">
              <span className="text-xl font-bold">CDL</span>
              <span className="text-xl font-bold text-primary"> Jobs</span>
              <span className="text-xl font-light">Center</span>
            </div>
          </Link>

          {/* Desktop links */}
          <div className="hidden lg:flex items-center gap-1">
            {navLinks.filter((link) => !(link.name === "Apply Now" && user?.role === "company") && !(link.name === "Drivers" && user?.role === "driver")).map((link) =>
              link.dropdown ? (
                <div
                  key={link.path}
                  className="relative"
                  onMouseEnter={() => setJobsDropdownOpen(true)}
                  onMouseLeave={() => setJobsDropdownOpen(false)}
                >
                  {/* Trigger */}
                  <button
                    aria-haspopup="true"
                    aria-expanded={jobsDropdownOpen}
                    onClick={() => setJobsDropdownOpen((prev) => !prev)}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") setJobsDropdownOpen(false);
                    }}
                    className={`relative flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors
                      ${location.pathname === link.path
                        ? "text-primary"
                        : "text-muted-foreground hover:text-foreground"
                      }`}
                  >
                    {link.name}
                    <ChevronDown
                      className={`h-3.5 w-3.5 transition-transform duration-200 ${jobsDropdownOpen ? "rotate-180" : ""}`}
                    />
                    {location.pathname === link.path && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute inset-0 rounded-lg bg-primary/10"
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                  </button>

                  {/* Dropdown panel */}
                  <AnimatePresence>
                    {jobsDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -2 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -2 }}
                        transition={{ duration: 0.12 }}
                        className="absolute top-full left-0 w-44 bg-card border border-border shadow-md py-1"
                      >
                        {link.dropdown.map((item) => (
                          <Link
                            key={item.path}
                            to={item.path}
                            onClick={() => setJobsDropdownOpen(false)}
                            className="block px-4 py-2 text-sm text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors"
                          >
                            {item.name}
                          </Link>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-colors
                    ${location.pathname === link.path
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                  {link.name}
                  {location.pathname === link.path && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-0 rounded-lg bg-primary/10"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                </Link>
              )
            )}
          </div>

          <div className="hidden lg:flex items-center gap-3">
            <TruckToggle isDark={isDark} onClick={toggle} />
            {user ? (
              <>
                {/* Profile dropdown */}
                <div className="relative" ref={profileRef}>
                  <button
                    onClick={() => setProfileOpen((o) => !o)}
                    aria-haspopup="menu"
                    aria-expanded={profileOpen}
                    aria-label="Open account menu"
                    className="group flex max-w-[300px] items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-left shadow-sm transition-all hover:border-primary/50"
                  >
                    <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/12 text-xs font-semibold text-primary">
                      {getInitials(user.name)}
                      {notifCount > 0 && (
                        <span
                          className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-background"
                          aria-label={`${notifCount} update${notifCount > 1 ? "s" : ""}`}
                          title={`${notifCount} update${notifCount > 1 ? "s" : ""}`}
                        >
                          {notifCount > 99 ? "99+" : notifCount}
                        </span>
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-foreground">{user.name}</span>
                      <span className="block text-[11px] text-muted-foreground">
                        {user.role === "admin" ? "Admin Account" : user.role === "company" ? "Company Account" : "Driver Account"}
                      </span>
                    </span>
                    <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-200 ${profileOpen ? "rotate-180" : ""}`} />
                  </button>
                  <AnimatePresence>
                    {profileOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 top-full z-50 mt-1.5 w-56 rounded-md border border-border bg-card py-1 shadow-md"
                        role="menu"
                        aria-label="Account menu"
                      >
                        {notifCount > 0 && (
                          <>
                            <div className="px-4 py-2 text-xs font-medium text-muted-foreground">
                              <span className="inline-flex items-center rounded-full bg-red-500/10 px-2 py-0.5 text-red-600 dark:text-red-400">
                                {isCompany
                                  ? `${notifCount} new application${notifCount > 1 ? "s" : ""}`
                                  : `${notifCount} application update${notifCount > 1 ? "s" : ""}`}
                              </span>
                            </div>
                            <hr className="my-1 border-border" />
                          </>
                        )}
                        <Link
                          to={user.role === "admin" ? "/admin" : user.role === "company" ? "/dashboard" : "/driver-dashboard"}
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-primary/5 hover:text-primary"
                        >
                          <LayoutDashboard className="h-3.5 w-3.5 shrink-0" />
                          {user.role === "admin" ? "Admin Dashboard" : user.role === "company" ? "Dashboard" : "My Dashboard"}
                        </Link>
                        <Link
                          to={`${user.role === "admin" ? "/admin" : user.role === "company" ? "/dashboard" : "/driver-dashboard"}?tab=messages`}
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-primary/5 hover:text-primary"
                        >
                          <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                          Messages
                          {unreadMsgCount > 0 && (
                            <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                              {unreadMsgCount > 99 ? "99+" : unreadMsgCount}
                            </span>
                          )}
                        </Link>
                        <hr className="border-border my-1" />
                        <button
                          onClick={() => { setSignOutOpen(true); setProfileOpen(false); }}
                          className="w-full flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-primary/5 hover:text-primary"
                        >
                          <LogOut className="h-3.5 w-3.5 shrink-0" />
                          Sign Out
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </>
            ) : (
              <>
                <Button variant="outline" size="sm" onClick={() => setSignInOpen(true)}>
                  Sign In
                </Button>
                <Button size="sm" className="glow-orange" asChild>
                  <Link to="/apply">Apply Now</Link>
                </Button>
              </>
            )}
          </div>

          {/* Mobile: truck toggle + burger */}
          <div className="lg:hidden flex items-center gap-1">
            <TruckToggle isDark={isDark} onClick={toggle} />
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
            aria-label={isOpen ? "Close menu" : "Open menu"}
            aria-expanded={isOpen}
          >
            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
          </div>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="lg:hidden overflow-hidden border-t border-border/50"
            >
              <div className="container mx-auto py-4 flex flex-col gap-2">
                {navLinks.filter((link) => !(link.name === "Apply Now" && user?.role === "company") && !(link.name === "Drivers" && user?.role === "driver")).map((link) =>
                  link.dropdown ? (
                    <div key={link.path}>
                      <button
                        onClick={() => setJobsMobileOpen(!jobsMobileOpen)}
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-colors
                          ${location.pathname === link.path
                            ? "bg-primary/10 text-primary"
                            : "hover:bg-muted text-muted-foreground"
                          }`}
                      >
                        {link.name}
                        <ChevronDown
                          className={`h-4 w-4 transition-transform duration-200 ${jobsMobileOpen ? "rotate-180" : ""}`}
                        />
                      </button>
                      <AnimatePresence>
                        {jobsMobileOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="pl-4 flex flex-col gap-1 pt-1">
                              {link.dropdown.map((item) => (
                                <Link
                                  key={item.path}
                                  to={item.path}
                                  onClick={() => { setIsOpen(false); setJobsMobileOpen(false); }}
                                  className="px-4 py-2 rounded-lg text-sm text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors"
                                >
                                  {item.name}
                                </Link>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ) : (
                    <Link
                      key={link.path}
                      to={link.path}
                      onClick={() => setIsOpen(false)}
                      className={`px-4 py-3 rounded-lg text-sm font-medium transition-colors
                        ${location.pathname === link.path
                          ? "bg-primary/10 text-primary"
                          : "hover:bg-muted text-muted-foreground"
                        }`}
                    >
                      {link.name}
                    </Link>
                  )
                )}
                {user ? (
                  <>
                    <Link
                      to={user.role === "admin" ? "/admin" : user.role === "company" ? "/dashboard" : "/driver-dashboard"}
                      onClick={() => setIsOpen(false)}
                      className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                        (location.pathname === "/dashboard" || location.pathname === "/driver-dashboard" || location.pathname === "/admin")
                          ? "bg-primary/10 text-primary"
                          : "hover:bg-muted text-muted-foreground"
                      }`}
                    >
                      <LayoutDashboard className="h-4 w-4 shrink-0" />
                      {user.role === "admin" ? "Admin Dashboard" : user.role === "company" ? "Dashboard" : "My Dashboard"}
                      {notifCount > 0 && (
                        <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                          {notifCount > 9 ? "9+" : notifCount}
                        </span>
                      )}
                    </Link>
                    <div className="flex gap-2 pt-2 items-center border-t border-border/50 mt-1">
                      <div className="flex items-center gap-2 px-3 py-1.5 text-sm flex-1 text-muted-foreground">
                        <User className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span className="font-medium truncate">{user.name}</span>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => { setSignOutOpen(true); setIsOpen(false); }} className="flex items-center gap-1.5">
                        <LogOut className="h-3.5 w-3.5" />
                        Sign Out
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => { setIsOpen(false); setSignInOpen(true); }}>
                      Sign In
                    </Button>
                    <Button size="sm" className="flex-1" asChild>
                      <Link to="/apply" onClick={() => setIsOpen(false)}>Apply Now</Link>
                    </Button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>

      {signInOpen && <SignInModal onClose={() => setSignInOpen(false)} />}

      <AlertDialog open={signOutOpen} onOpenChange={setSignOutOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign out</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to sign out of your account?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmSignOut}>Sign Out</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default Navbar;
