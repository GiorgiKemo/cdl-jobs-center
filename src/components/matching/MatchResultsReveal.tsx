import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sparkles, Search, ArrowRight, RefreshCw } from "lucide-react";
import type { DriverJobMatch } from "@/hooks/useMatchScores";

interface MatchResultsRevealProps {
  matches: DriverJobMatch[];
  isStillComputing: boolean;
}

function ScoreBadge({ score, delay }: { score: number; delay: number }) {
  const color =
    score >= 80
      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
      : score >= 60
        ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
        : score >= 40
          ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
          : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";

  return (
    <motion.span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-sm font-bold ${color}`}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: delay + 0.3, duration: 0.4, ease: "backOut" }}
    >
      {score}% Match
    </motion.span>
  );
}

function MatchCard({
  match,
  index,
}: {
  match: DriverJobMatch;
  index: number;
}) {
  const delay = index * 0.15;

  return (
    <motion.div
      initial={{ opacity: 0, y: 40, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        delay,
        duration: 0.5,
        ease: "easeOut",
      }}
    >
      <Link
        to={`/jobs/${match.jobId}`}
        className="block border border-border bg-card hover:bg-muted/50 transition-colors p-4 sm:p-5"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            {/* Company logo */}
            {match.jobLogoUrl ? (
              <img
                src={match.jobLogoUrl}
                alt=""
                loading="lazy"
                className="w-10 h-10 rounded-md object-cover shrink-0 bg-muted"
              />
            ) : (
              <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-xs font-bold text-primary">
                  {match.jobCompany?.charAt(0) ?? "?"}
                </span>
              </div>
            )}
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate">{match.jobTitle}</p>
              <p className="text-xs text-muted-foreground truncate">
                {match.jobCompany}
              </p>
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-xs text-muted-foreground">
                {match.jobLocation && <span>{match.jobLocation}</span>}
                {match.jobPay && <span>{match.jobPay}</span>}
                {match.jobRouteType && <span>{match.jobRouteType}</span>}
              </div>
            </div>
          </div>
          <ScoreBadge score={match.overallScore} delay={delay} />
        </div>

        {/* Top reasons */}
        {match.topReasons.length > 0 && (
          <motion.div
            className="mt-3 flex flex-wrap gap-1.5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: delay + 0.4 }}
          >
            {match.topReasons.slice(0, 3).map((reason, ri) => (
              <span
                key={ri}
                className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400"
              >
                {reason.text}
              </span>
            ))}
          </motion.div>
        )}
      </Link>
    </motion.div>
  );
}

export function MatchResultsReveal({
  matches,
  isStillComputing,
}: MatchResultsRevealProps) {
  if (matches.length === 0) {
    return (
      <motion.div
        className="text-center py-16 px-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
        >
          <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        </motion.div>
        <h3 className="text-lg font-semibold mb-2">
          {isStillComputing
            ? "Still computing your matches..."
            : "No matches found yet"}
        </h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto mb-8">
          {isStillComputing
            ? "Our AI is still analyzing jobs for you. Check your dashboard in a few minutes to see your results."
            : "We're working on finding the best jobs for your profile. Check back on your dashboard shortly."}
        </p>
        <div className="flex gap-3 justify-center flex-wrap">
          <Button asChild>
            <Link to="/driver-dashboard?tab=ai-matches">
              Go to Dashboard
              <ArrowRight className="h-4 w-4 ml-1.5" />
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/jobs">Browse Jobs</Link>
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="py-4">
      {/* Header */}
      <motion.div
        className="text-center mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
          className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900/30 mb-4"
        >
          <Sparkles className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
        </motion.div>
        <h3 className="text-xl font-bold mb-1">
          We found{" "}
          <motion.span
            className="text-primary"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            {matches.length}
          </motion.span>{" "}
          {matches.length === 1 ? "job" : "jobs"} matching your profile
        </h3>
        <p className="text-sm text-muted-foreground">
          Ranked by compatibility with your experience and preferences
        </p>
      </motion.div>

      {/* Still computing banner */}
      {isStillComputing && (
        <motion.div
          className="flex items-center gap-2 px-4 py-3 mb-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          transition={{ delay: 0.3 }}
        >
          <RefreshCw className="h-4 w-4 text-amber-600 dark:text-amber-400 animate-spin" />
          <p className="text-xs text-amber-700 dark:text-amber-400">
            Scores are still being refined. Check your dashboard for updated
            results.
          </p>
        </motion.div>
      )}

      {/* Match cards */}
      <div className="space-y-2">
        {matches.map((match, index) => (
          <MatchCard key={match.jobId} match={match} index={index} />
        ))}
      </div>

      {/* CTAs */}
      <motion.div
        className="flex gap-3 justify-center flex-wrap mt-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: matches.length * 0.15 + 0.5 }}
      >
        <Button asChild>
          <Link to="/driver-dashboard?tab=ai-matches">
            View All Matches
            <ArrowRight className="h-4 w-4 ml-1.5" />
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/jobs">Browse Jobs</Link>
        </Button>
      </motion.div>
    </div>
  );
}
