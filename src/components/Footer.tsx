import { Link } from "react-router-dom";
import { Truck, Phone, Mail, MapPin } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-secondary pt-16 pb-8">
      <div className="container mx-auto">
        <div className="grid md:grid-cols-4 gap-10 mb-12">
          <div>
            <Link to="/" className="flex items-center gap-3 mb-4">
              <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center">
                <Truck className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="font-display text-lg font-bold text-secondary-foreground">
                CDL <span className="text-primary">Jobs</span>Center
              </span>
            </Link>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Connecting CDL drivers with top trucking companies across the nation.
            </p>
          </div>

          <div>
            <h4 className="font-display font-semibold text-secondary-foreground mb-4">Quick Links</h4>
            <div className="flex flex-col gap-2">
              {["Home", "Apply Now", "Jobs", "Drivers", "Companies"].map((link) => (
                <Link
                  key={link}
                  to={link === "Home" ? "/" : `/${link.toLowerCase().replace(" ", "-")}`}
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  {link}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-display font-semibold text-secondary-foreground mb-4">Job Types</h4>
            <div className="flex flex-col gap-2">
              {["Dry Van", "Flatbed", "Refrigerated", "Tanker", "Owner Operator"].map((type) => (
                <Link
                  key={type}
                  to="/jobs"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  {type}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-display font-semibold text-secondary-foreground mb-4">Contact</h4>
            <div className="flex flex-col gap-3">
              <a href="tel:+16189360241" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors">
                <Phone className="h-4 w-4" /> +1 618-936-0241
              </a>
              <a href="mailto:info@cdljobscenter.com" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors">
                <Mail className="h-4 w-4" /> info@cdljobscenter.com
              </a>
              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 mt-0.5" /> Mon - Sat: 7:00 AM - 5:00 PM
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-border/20 pt-8 text-center">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} CDL Jobs Center. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
