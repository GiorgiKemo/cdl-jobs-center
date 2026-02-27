import { useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/auth";

type EasyApplyDialogProps = {
  trigger: React.ReactNode;
  companyName?: string;
};

type OffOnToggleProps = {
  checked: boolean;
  onChange: (value: boolean) => void;
};

const OffOnToggle = ({ checked, onChange }: OffOnToggleProps) => (
  <div className="inline-flex overflow-hidden rounded-sm border border-border">
    <button
      type="button"
      onClick={() => onChange(false)}
      className={cn(
        "h-7 min-w-11 px-3 text-[11px] font-semibold transition-colors",
        !checked ? "bg-background text-foreground" : "bg-muted text-muted-foreground",
      )}
    >
      OFF
    </button>
    <button
      type="button"
      onClick={() => onChange(true)}
      className={cn(
        "h-7 min-w-11 px-3 text-[11px] font-semibold transition-colors",
        checked ? "bg-foreground text-background" : "bg-muted text-muted-foreground",
      )}
    >
      ON
    </button>
  </div>
);

const EasyApplyDialog = ({ trigger, companyName = "General Application" }: EasyApplyDialogProps) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [cdl, setCdl] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [driverType, setDriverType] = useState("");
  const [endorseCdl, setEndorseCdl] = useState(false);
  const [ownerOperator, setOwnerOperator] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!firstName || !lastName || !email || !phone) {
      toast.error("Please fill in your name, email, and phone.");
      return;
    }
    if (!user || user.role !== "driver") {
      toast.error("You must be signed in as a driver to apply.");
      return;
    }
    setSubmitting(true);
    const insertPromise = supabase.from("applications").insert({
      driver_id: user.id,
      company_name: companyName,
      first_name: firstName,
      last_name: lastName,
      email,
      phone,
      cdl_number: cdl || null,
      driver_type: driverType || null,
      endorse: { cdl: endorseCdl, ownerOperator },
      pipeline_stage: "New",
    });

    const timeoutPromise = new Promise<never>((_res, reject) =>
      setTimeout(() => reject(new Error("Request timed out. Check your connection and try again.")), 30000)
    );

    try {
      const { error } = await Promise.race([insertPromise, timeoutPromise]) as { error: unknown };
      if (error) {
        const msg =
          error instanceof Error
            ? error.message
            : (error as { message?: string })?.message ?? "Submission failed.";
        console.error("Quick apply error:", error);
        toast.error(msg);
        return;
      }
      toast.success(`Application sent to ${companyName}!`);
      setOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Submission failed. Please try again.";
      console.error("Quick apply error:", err);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-[560px] gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b border-border px-4 py-3 sm:px-5">
          <DialogTitle className="text-3xl font-medium text-foreground">Quick Apply</DialogTitle>
          <DialogDescription className="sr-only">
            Quick application form.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 p-4 sm:p-5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input placeholder="First name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
              <Input placeholder="Last name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
              <Input placeholder="CDL #" value={cdl} onChange={(e) => setCdl(e.target.value)} />
              <Input placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              <Input placeholder="Phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
              <Select value={driverType} onValueChange={setDriverType}>
                <SelectTrigger>
                  <SelectValue placeholder="Driver Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="company">Company Driver</SelectItem>
                  <SelectItem value="owner-operator">Owner Operator</SelectItem>
                  <SelectItem value="lease">Lease Operator</SelectItem>
                  <SelectItem value="student">Student / Trainee</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="border-y border-border bg-muted/40">
            <p className="px-4 pb-3 pt-4 text-2xl font-semibold text-accent sm:px-5">Endorsements (optional):</p>
            <div className="grid grid-cols-1 divide-y divide-border border-t border-border sm:grid-cols-2 sm:divide-x sm:divide-y-0">
              <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
                <span className="text-xl text-foreground">CDL</span>
                <OffOnToggle checked={endorseCdl} onChange={setEndorseCdl} />
              </div>
              <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
                <span className="text-xl text-foreground">Owner Operator</span>
                <OffOnToggle checked={ownerOperator} onChange={setOwnerOperator} />
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-5">
            <Button
              type="submit"
              disabled={submitting}
              className="h-12 rounded-md bg-accent px-9 text-3xl font-semibold text-accent-foreground hover:bg-accent/90"
            >
              {submitting ? "Sending…" : "Send"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EasyApplyDialog;
