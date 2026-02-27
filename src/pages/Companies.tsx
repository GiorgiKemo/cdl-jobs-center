import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { motion } from "framer-motion";
import { Star, BadgeCheck, MapPin, Users, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const companies = [
  { name: "GI Super Service", location: "Illinois", drivers: 100, rating: 5, desc: "Leading OTR carrier specializing in dry van and refrigerated freight across 48 states." },
  { name: "United Global Carrier", location: "Texas", drivers: 85, rating: 5, desc: "Full-service flatbed and specialized carrier with competitive pay and benefits." },
  { name: "PKD Express", location: "California", drivers: 60, rating: 5, desc: "Premier tanker carrier with excellent safety record and driver-first culture." },
  { name: "AN Enterprise Inc", location: "Florida", drivers: 75, rating: 5, desc: "Growing carrier offering team and solo opportunities nationwide." },
];

const Companies = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
      <section className="py-20 bg-secondary">
        <div className="container mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-2xl mx-auto">
            <span className="text-primary font-medium text-sm uppercase tracking-widest">Our Partners</span>
            <h1 className="font-display text-4xl md:text-5xl font-bold text-secondary-foreground mt-3 mb-4">
              Verified <span className="text-gradient">Companies</span>
            </h1>
            <p className="text-muted-foreground text-lg">Work with the most trusted carriers in the industry.</p>
          </motion.div>
        </div>
      </section>

      <section className="py-16">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-2 gap-8">
            {companies.map((c, i) => (
              <motion.div
                key={c.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="glass rounded-2xl p-8 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300"
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary/20 to-cdl-amber/20 flex items-center justify-center text-2xl font-display font-bold text-primary shrink-0">
                    {c.name.charAt(0)}
                  </div>
                  <div>
                    <h2 className="font-display text-xl font-semibold">{c.name}</h2>
                    <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{c.location}</span>
                      <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{c.drivers}+ drivers</span>
                    </div>
                  </div>
                </div>
                <p className="text-muted-foreground mb-4 leading-relaxed">{c.desc}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-0.5">
                      {Array.from({ length: c.rating }).map((_, j) => (
                        <Star key={j} className="h-4 w-4 fill-cdl-amber text-cdl-amber" />
                      ))}
                    </div>
                    <span className="flex items-center gap-1 text-sm text-primary">
                      <BadgeCheck className="h-4 w-4" /> Verified
                    </span>
                  </div>
                  <Button variant="ghost" size="sm" className="text-primary group" asChild>
                    <Link to="/apply">
                      Apply
                      <ArrowRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      </main>
      <Footer />
    </div>
  );
};

export default Companies;
