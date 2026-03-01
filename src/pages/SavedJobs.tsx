import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { Bookmark, BookmarkCheck, Truck } from "lucide-react";
import { useEffect } from "react";
import { useAuth } from "@/context/auth";
import { useActiveJobs } from "@/hooks/useJobs";
import { useSavedJobs } from "@/hooks/useSavedJobs";
import { usePageTitle } from "@/hooks/usePageTitle";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/Spinner";

const SavedJobs = () => {
  usePageTitle("Saved Jobs");
  const { user } = useAuth();
  const navigate = useNavigate();

  // Redirect non-drivers
  useEffect(() => {
    if (user && user.role !== "driver") navigate("/dashboard", { replace: true });
    if (!user) navigate("/signin", { replace: true });
  }, [user, navigate]);

  if (!user || user.role !== "driver") return null;

  return <SavedJobsInner driverId={user.id} />;
};

const SavedJobsInner = ({ driverId }: { driverId: string }) => {
  const { jobs: allJobs, isLoading: jobsLoading } = useActiveJobs();
  const { savedIds, isLoading: savedLoading, toggle } = useSavedJobs(driverId);

  const jobs = allJobs.filter((j) => savedIds.includes(j.id));
  const isLoading = jobsLoading || savedLoading;

  const handleRemove = async (id: string, company: string) => {
    await toggle(id);
    toast.success(`Removed ${company} from saved jobs`);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto py-6 max-w-4xl">
        {/* Breadcrumb */}
        <p className="text-sm text-muted-foreground mb-4">
          <Link to="/" className="text-primary hover:underline">Main</Link>
          <span className="mx-1">&raquo;</span>
          Saved Jobs
        </p>

        <div className="flex items-center gap-3 mb-6 border-l-4 border-primary pl-3">
          <BookmarkCheck className="h-5 w-5 text-primary" />
          <h1 className="font-display text-2xl font-bold">Saved Jobs</h1>
          <span className="text-sm text-muted-foreground">({jobs.length})</span>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Spinner size="md" /></div>
        ) : jobs.length === 0 ? (
          <div className="border border-border bg-card p-12 text-center">
            <Bookmark className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="font-medium text-foreground mb-1">No saved jobs yet</p>
            <p className="text-sm text-muted-foreground mb-4">
              Browse jobs and click the bookmark icon to save them here.
            </p>
            <Button asChild>
              <Link to="/jobs">Browse Jobs</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {jobs.map((job) => (
              <div key={job.id} className="border border-border bg-card p-5 flex flex-col sm:flex-row gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h2 className="font-display font-semibold text-lg text-primary">{job.company}</h2>
                    <button
                      onClick={() => handleRemove(job.id, job.company)}
                      aria-label="Remove from saved"
                      className="shrink-0 p-1 text-primary hover:text-destructive transition-colors"
                    >
                      <BookmarkCheck className="h-5 w-5" />
                    </button>
                  </div>
                  <p className="text-sm font-medium text-foreground mb-1">{job.title}</p>
                  <hr className="border-border mb-3" />
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mb-2">
                    <span>{job.location}</span>
                    <span>{job.routeType}</span>
                    <span>{job.driverType}</span>
                    <span className="font-medium text-foreground">{job.pay}</span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">{job.description}</p>
                </div>
                <div className="flex flex-col items-stretch gap-3 shrink-0 w-36">
                  <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90 w-full">
                    <Link to={`/jobs/${job.id}`}>View Job</Link>
                  </Button>
                  <div className="h-14 w-full border border-border flex items-center justify-center bg-muted/30">
                    <Truck className="h-6 w-6 text-muted-foreground" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default SavedJobs;
