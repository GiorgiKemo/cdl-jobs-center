import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const CTA = () => {
  return (
    <section className="py-24 bg-muted/30 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[150px]" />
      <div className="container mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="glass rounded-3xl p-12 md:p-16 text-center max-w-3xl mx-auto glow-orange"
        >
          <h2 className="font-display text-4xl md:text-5xl font-bold mb-4">
            Ready to Hit the <span className="text-gradient">Road?</span>
          </h2>
          <p className="text-muted-foreground text-lg mb-8 max-w-md mx-auto">
            Join thousands of drivers who found their perfect match through CDL Jobs Center.
          </p>
          <Button size="lg" className="text-lg px-10 group" asChild>
            <Link to="/apply">
              Apply Now — It's Free
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </Button>
        </motion.div>
      </div>
    </section>
  );
};

export default CTA;
