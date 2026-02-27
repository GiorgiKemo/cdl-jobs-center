import { useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type EasyApplyDialogProps = {
  trigger: React.ReactNode;
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

const EasyApplyDialog = ({ trigger }: EasyApplyDialogProps) => {
  const [open, setOpen] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [cdl, setCdl] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [driverType, setDriverType] = useState("");
  const [endorseCdl, setEndorseCdl] = useState(false);
  const [ownerOperator, setOwnerOperator] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    toast.success("Application received. We'll match you with top companies.");
    setOpen(false);
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
            <Button type="submit" className="h-12 rounded-md bg-accent px-9 text-3xl font-semibold text-accent-foreground hover:bg-accent/90">
              Send
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EasyApplyDialog;
