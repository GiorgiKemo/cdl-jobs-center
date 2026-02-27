import { motion } from "framer-motion";
import { Star, BadgeCheck, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const companies = [
  { name: "GI Super Service", rating: 5, verified: true },
  { name: "United Global Carrier", rating: 5, verified: true },
  { name: "PKD Express", rating: 5, verified: true },
  { name: "AN Enterprise Inc", rating: 5, verified: true },
];

const TopCompanies = () => {
  return (
    <section className="py-24 bg-background">
      <div className="container mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex flex-col md:flex-row md:items-end md:justify-between mb-16"
        >
          <div>
            <span className="text-primary font-medium text-sm uppercase tracking-widest">Partners</span>
            <h2 className="font-display text-4xl md:text-5xl font-bold mt-3">
              Top <span className="text-gradient">Companies</span>
            </h2>
          </div>
          <Button variant="ghost" className="mt-4 md:mt-0 text-primary group" asChild>
            <Link to="/companies">
              View All Companies
              <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </Button>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {companies.map((company, i) => (
            <motion.div
              key={company.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <Link
                to="/companies"
                className="glass rounded-2xl p-6 block hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 group text-center sm:text-left"
              >
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary/20 to-cdl-amber/20 flex items-center justify-center mb-4 text-2xl font-display font-bold text-primary mx-auto sm:mx-0">
                  {company.name.charAt(0)}
                </div>
                <h3 className="font-display font-semibold text-lg mb-2">{company.name}</h3>
                <div className="flex items-center justify-center sm:justify-start gap-1 mb-3">
                  {Array.from({ length: company.rating }).map((_, j) => (
                    <Star key={j} className="h-4 w-4 fill-cdl-amber text-cdl-amber" />
                  ))}
                </div>
                {company.verified && (
                  <div className="flex items-center justify-center sm:justify-start gap-1.5 text-sm text-primary">
                    <BadgeCheck className="h-4 w-4" />
                    Verified Company
                  </div>
                )}
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TopCompanies;
