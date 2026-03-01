import { motion } from "framer-motion";
import { ArrowRight, Shield, Zap, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/auth";

const heroImage = "/hero-truck.jpg";
const heroVideo = "/mainvideo.mp4";

const Hero = () => {
  const { user } = useAuth();
  const isCompany = user?.role === "company";
  const isDriver = user?.role === "driver";
  return (
    <section className="relative overflow-hidden bg-secondary min-h-[90vh] flex items-center">
      {/* Background image */}
      <div className="absolute inset-0">
        <img
          src={heroImage}
          alt="Professional CDL truck driver"
          className="w-full h-full object-cover opacity-40"
          {...({ fetchpriority: "high" } as Record<string, string>)}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-secondary via-secondary/90 to-secondary/50" />
      </div>

      {/* Floating orb */}
      <div className="absolute top-20 right-20 w-96 h-96 bg-primary/20 rounded-full blur-[120px] animate-float" />

      <div className="container mx-auto relative z-10 py-20">
        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(340px,460px)]">
          <div className="max-w-2xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-6"
            >
              <Zap className="h-4 w-4" />
              {isCompany
                ? "AI-Powered Driver Matching"
                : "AI-Powered Job Matching"}
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="font-display text-5xl md:text-7xl font-bold text-secondary-foreground leading-tight mb-6"
            >
              {isCompany ? "Find the CDL Drivers " : "Find the Trucking Job "}
              <span className="text-gradient">
                {isCompany ? "You Need" : "You Deserve"}
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-lg md:text-xl text-muted-foreground mb-8 max-w-lg"
            >
              {isCompany
                ? "Post once, get matched with qualified CDL drivers instantly. Over 150 carriers trust us."
                : isDriver
                  ? "Get AI-ranked jobs based on your profile and preferences. Over 2,000 drivers placed and counting."
                  : "Apply once, get matched with top carriers instantly. Over 2,000 drivers placed and counting."}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-4"
            >
              <Button
                size="lg"
                className="text-lg px-8 glow-orange group"
                asChild
              >
                <Link to={isCompany ? "/dashboard" : "/apply"}>
                  {isCompany ? "Post a Job" : isDriver ? "Find My Matches" : "Apply Now"}
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="text-lg px-8 border-border/50 text-secondary-foreground hover:bg-muted/20 hover:text-secondary-foreground"
                asChild
              >
                <Link to={isCompany ? "/drivers" : "/jobs"}>
                  {isCompany ? "Browse Drivers" : "Browse Jobs"}
                </Link>
              </Button>
            </motion.div>

            {/* Trust badges */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="mt-12 flex items-center gap-8 border-t border-border/20 pt-8"
            >
              <div className="flex items-center gap-2 text-muted-foreground">
                <Shield className="h-5 w-5 text-primary" />
                <span className="text-sm">
                  {isCompany ? "Verified Drivers" : "Verified Companies"}
                </span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Users className="h-5 w-5 text-primary" />
                <span className="text-sm">
                  {isCompany
                    ? "150+ Partner Companies"
                    : "2,000+ Drivers Placed"}
                </span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Zap className="h-5 w-5 text-primary" />
                <span className="text-sm">Instant Matching</span>
              </div>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="hidden lg:block justify-self-end w-full"
          >
            <div className="overflow-hidden rounded-2xl border border-border/40 bg-card/20 p-2 backdrop-blur-sm shadow-xl lg:-translate-y-8 lg:-translate-x-14">
              <video
                src={heroVideo}
                className="h-[auto] w-full rounded-xl bg-black/30 object-contain"
                autoPlay
                muted
                loop
                playsInline
                preload="metadata"
              />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
