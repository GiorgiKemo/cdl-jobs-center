import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

const SignIn = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please enter your email and password.");
      return;
    }
    setLoading(true);
    try {
      await signIn(email, password);
      toast.success("Welcome back!");
      navigate("/");
    } catch {
      toast.error("Sign in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <div className="border-b border-border">
        <div className="container mx-auto py-4">
          <Link to="/" className="flex items-center gap-3 w-fit">
            <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
              <Truck className="h-6 w-6 text-primary-foreground" />
            </div>
            <div className="font-display">
              <span className="text-xl font-bold">CDL</span>
              <span className="text-xl font-bold text-primary"> Jobs</span>
              <span className="text-xl font-light">Center</span>
            </div>
          </Link>
        </div>
      </div>

      {/* Form */}
      <main className="flex-1 flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-md">
          {/* Breadcrumb */}
          <p className="text-sm text-muted-foreground mb-6">
            <Link to="/" className="text-primary hover:underline">Main</Link>
            <span className="mx-1">»</span>
            Sign In
          </p>

          <div className="border border-border bg-card">
            {/* Header */}
            <div className="border-l-4 border-primary px-5 py-4 border-b border-border">
              <p className="font-display font-bold text-lg">Sign In to Your Account</p>
              <p className="text-sm text-muted-foreground mt-0.5">
                Access your driver profile and saved jobs
              </p>
            </div>

            <form onSubmit={handleSubmit} className="px-5 py-6 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <button
                    type="button"
                    className="text-xs text-primary hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={loading}
              >
                {loading ? "Signing in..." : "Sign In"}
              </Button>

              <p className="text-center text-sm text-muted-foreground pt-2">
                New driver?{" "}
                <Link to="/apply" className="text-primary font-medium hover:underline">
                  Apply Now →
                </Link>
              </p>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SignIn;
