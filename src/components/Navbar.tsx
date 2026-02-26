import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Phone, Mail, Truck, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";

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

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [jobsDropdownOpen, setJobsDropdownOpen] = useState(false);
  const [jobsMobileOpen, setJobsMobileOpen] = useState(false);
  const location = useLocation();

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
            <Button variant="outline" size="sm" asChild>
              <Link to="/signin">Sign In</Link>
            </Button>
            <Button size="sm" className="glow-orange" asChild>
              <Link to="/apply">Apply Now</Link>
            </Button>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="lg:hidden p-2 rounded-lg hover:bg-muted transition-colors"
          >
            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
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
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" className="flex-1" asChild>
                    <Link to="/signin">Sign In</Link>
                  </Button>
                  <Button size="sm" className="flex-1" asChild>
                    <Link to="/apply">Apply Now</Link>
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>
    </>
  );
};

export default Navbar;
