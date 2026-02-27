import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Phone, Mail, Truck, ChevronDown, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/context/AuthContext";

const jobDropdownItems = [
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
];

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
  const location = useLocation();
  const navigate = useNavigate();
  const { isDark, toggle } = useTheme();
  const { user, signOut } = useAuth();

  const handleSignOut = () => {
    signOut();
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
          <Link to="/" className="flex items-center gap-3">
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
            {navLinks.map((link) =>
              link.dropdown ? (
                <div
                  key={link.path}
                  className="relative"
                  onMouseEnter={() => setJobsDropdownOpen(true)}
                  onMouseLeave={() => setJobsDropdownOpen(false)}
                >
                  {/* Trigger */}
                  <button
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
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.15 }}
                        className="absolute top-full left-0 mt-1 w-44 bg-card border border-border shadow-md py-1"
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
                <div className="flex items-center gap-2 px-3 py-1.5 border border-border text-sm">
                  <User className="h-3.5 w-3.5 text-primary" />
                  <span className="text-foreground font-medium">{user.name}</span>
                </div>
                <Button variant="outline" size="sm" onClick={handleSignOut} className="flex items-center gap-1.5">
                  <LogOut className="h-3.5 w-3.5" />
                  Sign Out
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/signin">Sign In</Link>
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
                {navLinks.map((link) =>
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
                  <div className="flex gap-2 pt-2 items-center">
                    <div className="flex items-center gap-2 px-3 py-1.5 border border-border text-sm flex-1">
                      <User className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span className="font-medium truncate">{user.name}</span>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => { handleSignOut(); setIsOpen(false); }} className="flex items-center gap-1.5">
                      <LogOut className="h-3.5 w-3.5" />
                      Sign Out
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="sm" className="flex-1" asChild>
                      <Link to="/signin" onClick={() => setIsOpen(false)}>Sign In</Link>
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
    </>
  );
};

export default Navbar;
