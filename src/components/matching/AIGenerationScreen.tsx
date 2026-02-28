import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, Search, BarChart3, ArrowUpDown, Sparkles } from "lucide-react";
import { Progress } from "@/components/ui/progress";

const PHASES = [
  { id: 1, label: "Analyzing your profile", icon: User, duration: 1500 },
  { id: 2, label: "Scanning active jobs", icon: Search, duration: 1500 },
  { id: 3, label: "Computing match scores", icon: BarChart3, duration: 1500 },
  { id: 4, label: "Ranking best matches", icon: ArrowUpDown, duration: 1200 },
  { id: 5, label: "Preparing your results", icon: Sparkles, duration: 1000 },
] as const;

const TOTAL_DURATION = PHASES.reduce((sum, p) => sum + p.duration, 0);

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  delay: number;
  duration: number;
}

function generateParticles(count: number): Particle[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 3 + 1,
    delay: Math.random() * 3,
    duration: Math.random() * 4 + 3,
  }));
}

interface AIGenerationScreenProps {
  onAllPhasesComplete: () => void;
}

export function AIGenerationScreen({ onAllPhasesComplete }: AIGenerationScreenProps) {
  const [phase, setPhase] = useState(0);
  const particles = useMemo(() => generateParticles(30), []);

  // Auto-advance phases
  useEffect(() => {
    if (phase >= PHASES.length) {
      onAllPhasesComplete();
      return;
    }
    const timer = setTimeout(() => {
      setPhase((p) => p + 1);
    }, PHASES[phase].duration);
    return () => clearTimeout(timer);
  }, [phase, onAllPhasesComplete]);

  const currentPhase = phase < PHASES.length ? PHASES[phase] : PHASES[PHASES.length - 1];
  const Icon = currentPhase.icon;
  const elapsed = PHASES.slice(0, phase).reduce((sum, p) => sum + p.duration, 0);
  const progressValue = Math.min((elapsed / TOTAL_DURATION) * 100, 100);

  return (
    <div className="relative min-h-[500px] flex flex-col items-center justify-center overflow-hidden rounded-lg">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-primary/5 to-background" />

      {/* Pulsing orbs */}
      <motion.div
        className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-primary/10 blur-3xl"
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.3, 0.6, 0.3],
        }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-1/4 right-1/4 w-48 h-48 rounded-full bg-emerald-500/10 blur-3xl"
        animate={{
          scale: [1.2, 1, 1.2],
          opacity: [0.2, 0.5, 0.2],
        }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
      />
      <motion.div
        className="absolute top-1/2 right-1/3 w-32 h-32 rounded-full bg-blue-500/10 blur-3xl"
        animate={{
          scale: [1, 1.4, 1],
          opacity: [0.15, 0.4, 0.15],
        }}
        transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 2 }}
      />

      {/* Particle field */}
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-primary/40"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
          }}
          animate={{
            y: [0, -20, 0],
            opacity: [0.1, 0.5, 0.1],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            ease: "easeInOut",
            delay: p.delay,
          }}
        />
      ))}

      {/* Scanning beam */}
      <motion.div
        className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent"
        animate={{ y: ["-200%", "50000%"] }}
        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
      />
      <motion.div
        className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent"
        animate={{ y: ["50000%", "-200%"] }}
        transition={{ duration: 5, repeat: Infinity, ease: "linear", delay: 1.5 }}
      />

      {/* Central content */}
      <div className="relative z-10 flex flex-col items-center text-center px-6">
        {/* Phase icon with ring */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPhase.id}
            className="relative mb-8"
            initial={{ scale: 0.5, opacity: 0, rotate: -90 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            exit={{ scale: 0.5, opacity: 0, rotate: 90 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            {/* Spinning ring */}
            <motion.div
              className="absolute inset-0 -m-4 rounded-full border-2 border-primary/20 border-t-primary"
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              style={{ width: "calc(100% + 32px)", height: "calc(100% + 32px)" }}
            />
            {/* Outer pulse ring */}
            <motion.div
              className="absolute inset-0 -m-6 rounded-full border border-primary/10"
              animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              style={{ width: "calc(100% + 48px)", height: "calc(100% + 48px)" }}
            />
            {/* Icon container */}
            <div className="w-20 h-20 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center backdrop-blur-sm">
              <Icon className="h-9 w-9 text-primary" />
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Phase label */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPhase.id}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.4 }}
          >
            <h3 className="text-lg font-semibold text-foreground mb-1">
              {currentPhase.label}
            </h3>
            <p className="text-sm text-muted-foreground">
              Step {Math.min(phase + 1, PHASES.length)} of {PHASES.length}
            </p>
          </motion.div>
        </AnimatePresence>

        {/* Dots animation */}
        <div className="flex gap-1.5 mt-6 mb-8">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 rounded-full bg-primary"
              animate={{ opacity: [0.2, 1, 0.2], scale: [0.8, 1.2, 0.8] }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                ease: "easeInOut",
                delay: i * 0.2,
              }}
            />
          ))}
        </div>

        {/* Progress bar */}
        <div className="w-64">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Progress value={progressValue} className="h-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {Math.round(progressValue)}% complete
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
