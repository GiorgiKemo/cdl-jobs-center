import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/auth";
import EasyApplyDialog from "@/components/EasyApplyDialog";

const CTA = () => {
  const { user } = useAuth();
  const isCompany = user?.role === "company";
  return (
    <section className="relative overflow-hidden bg-muted/30 py-24">
      <div className="absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-[150px]" />
      <div className="container relative z-10 mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="glass glow-orange mx-auto max-w-3xl overflow-hidden rounded-3xl p-6 text-center sm:p-10 md:p-16"
        >
          <h2 className="mb-4 font-display text-3xl font-bold sm:text-4xl md:text-5xl">
            {isCompany
              ? <>Ready to Grow Your <span className="text-gradient">Fleet?</span></>
              : <>Ready to Hit the <span className="text-gradient">Road?</span></>}
          </h2>
          <p className="mx-auto mb-8 max-w-md text-base text-muted-foreground sm:text-lg">
            {isCompany
              ? "Join 150+ carriers who find qualified CDL drivers through CDL Jobs Center."
              : "Join thousands of drivers who found their perfect match through CDL Jobs Center."}
          </p>
          {isCompany ? (
            <Button size="lg" className="group w-full px-6 text-base sm:w-auto sm:px-10 sm:text-lg" asChild>
              <Link to="/dashboard">
                Post a Job — It's Free
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
          ) : (
            <EasyApplyDialog
              trigger={
                <Button size="lg" className="group w-full px-6 text-base sm:w-auto sm:px-10 sm:text-lg">
                  Quick Apply - It's Free
                  <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Button>
              }
            />
          )}
        </motion.div>
      </div>
    </section>
  );
};

export default CTA;
