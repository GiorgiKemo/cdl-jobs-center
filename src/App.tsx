import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";

const Index = lazy(() => import("./pages/Index"));
const ApplyNow = lazy(() => import("./pages/ApplyNow"));
const Jobs = lazy(() => import("./pages/Jobs"));
const JobDetail = lazy(() => import("./pages/JobDetail"));

const Drivers = lazy(() => import("./pages/Drivers"));
const DriverProfile = lazy(() => import("./pages/DriverProfile"));
const Companies = lazy(() => import("./pages/Companies"));
const CompanyProfile = lazy(() => import("./pages/CompanyProfile"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const DriverDashboard = lazy(() => import("./pages/DriverDashboard"));
const SignIn = lazy(() => import("./pages/SignIn"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const Pricing = lazy(() => import("./pages/Pricing"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <Suspense fallback={null}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/apply" element={<ApplyNow />} />
            <Route path="/jobs" element={<Jobs />} />
            <Route path="/jobs/:id" element={<JobDetail />} />
            <Route path="/saved-jobs" element={<Navigate to="/driver-dashboard" replace />} />
            <Route path="/my-applications" element={<Navigate to="/driver-dashboard" replace />} />
            <Route path="/drivers" element={<Drivers />} />
            <Route path="/drivers/:id" element={<DriverProfile />} />
            <Route path="/companies" element={<Companies />} />
            <Route path="/companies/:id" element={<CompanyProfile />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/driver-dashboard" element={<DriverDashboard />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/signin" element={<SignIn />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
