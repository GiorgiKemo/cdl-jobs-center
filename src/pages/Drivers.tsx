import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { motion } from "framer-motion";
import { Shield, TrendingUp, Headphones, MapPin, DollarSign, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const benefits = [
  { icon: Shield, title: "Verified Companies Only", desc: "Every company on our platform is vetted and verified." },
  { icon: TrendingUp, title: "Career Growth", desc: "We match you with companies that invest in driver development." },
  { icon: Headphones, title: "Dedicated Support", desc: "Our team is here to help you every step of the way." },
  { icon: MapPin, title: "Nationwide Coverage", desc: "Find jobs in all 48 continental states." },
  { icon: DollarSign, title: "Competitive Pay", desc: "Access the highest-paying positions in the industry." },
  { icon: Clock, title: "Quick Matching", desc: "Get matched with companies in minutes, not weeks." },
];

const Drivers = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
      <section className="py-20 bg-secondary">
        <div className="container mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-2xl mx-auto">
            <span className="text-primary font-medium text-sm uppercase tracking-widest">For Drivers</span>
            <h1 className="font-display text-4xl md:text-5xl font-bold text-secondary-foreground mt-3 mb-4">
              Why Drivers <span className="text-gradient">Choose Us</span>
            </h1>
            <p className="text-muted-foreground text-lg">We're dedicated to helping CDL drivers find their perfect match.</p>
          </motion.div>
        </div>
      </section>

      <section className="py-20">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {benefits.map((b, i) => (
              <motion.div
                key={b.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="glass rounded-2xl p-8 hover:border-primary/30 transition-all duration-300 group"
              >
                <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                  <b.icon className="h-7 w-7 text-primary" />
                </div>
                <h2 className="font-display text-xl font-semibold mb-2">{b.title}</h2>
                <p className="text-muted-foreground leading-relaxed">{b.desc}</p>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mt-16"
          >
            <Button size="lg" className="text-lg px-10 glow-orange" asChild>
              <Link to="/apply">Start Your Application</Link>
            </Button>
          </motion.div>
        </div>
      </section>
      </main>
      <Footer />
    </div>
  );
};

export default Drivers;
