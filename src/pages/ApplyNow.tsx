import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { ArrowRight, CheckCircle } from "lucide-react";

const ApplyNow = () => {
  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = (data: any) => {
    console.log(data);
    toast.success("Application submitted successfully! We'll match you with top companies.");
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <section className="py-20 bg-secondary">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-2xl mx-auto mb-12"
          >
            <span className="text-primary font-medium text-sm uppercase tracking-widest">Apply Now</span>
            <h1 className="font-display text-4xl md:text-5xl font-bold text-secondary-foreground mt-3 mb-4">
              Start Your <span className="text-gradient">New Career</span>
            </h1>
            <p className="text-muted-foreground text-lg">
              Complete this simple application and get matched with top carriers in minutes.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="py-16">
        <div className="container mx-auto max-w-2xl">
          <motion.form
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            onSubmit={handleSubmit(onSubmit)}
            className="glass rounded-2xl p-8 md:p-12 space-y-6"
          >
            <div className="grid sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input id="firstName" placeholder="John" {...register("firstName", { required: true })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input id="lastName" placeholder="Doe" {...register("lastName", { required: true })} />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input id="email" type="email" placeholder="john@email.com" {...register("email", { required: true })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone *</Label>
                <Input id="phone" type="tel" placeholder="(555) 123-4567" {...register("phone", { required: true })} />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>CDL Class</Label>
                <Select>
                  <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="a">Class A</SelectItem>
                    <SelectItem value="b">Class B</SelectItem>
                    <SelectItem value="c">Class C</SelectItem>
                    <SelectItem value="permit">Permit Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Years of Experience</Label>
                <Select>
                  <SelectTrigger><SelectValue placeholder="Select experience" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">No Experience / Student</SelectItem>
                    <SelectItem value="1">Less than 1 Year</SelectItem>
                    <SelectItem value="1-3">1–3 Years</SelectItem>
                    <SelectItem value="3-5">3–5 Years</SelectItem>
                    <SelectItem value="5+">5+ Years</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Preferred Freight Type</Label>
              <Select>
                <SelectTrigger><SelectValue placeholder="Select freight type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="dry-van">Dry Van</SelectItem>
                  <SelectItem value="flatbed">Flatbed</SelectItem>
                  <SelectItem value="refrigerated">Refrigerated</SelectItem>
                  <SelectItem value="tanker">Tanker</SelectItem>
                  <SelectItem value="dry-bulk">Dry Bulk</SelectItem>
                  <SelectItem value="any">Any / Open to All</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Anything else we should know?</Label>
              <Textarea id="message" placeholder="Tell us about your preferences, endorsements, or any other details..." rows={4} {...register("message")} />
            </div>

            <Button type="submit" size="lg" className="w-full text-lg glow-orange group">
              Submit Application
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>

            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <CheckCircle className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <p>Your information is secure and will only be shared with verified trucking companies.</p>
            </div>
          </motion.form>
        </div>
      </section>
      <Footer />
    </div>
  );
};

export default ApplyNow;
