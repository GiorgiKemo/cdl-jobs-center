import { useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useApplication } from "@/hooks/useApplication";

const US_STATES = [
  "Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut","Delaware",
  "Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa","Kansas","Kentucky",
  "Louisiana","Maine","Maryland","Massachusetts","Michigan","Minnesota","Mississippi",
  "Missouri","Montana","Nebraska","Nevada","New Hampshire","New Jersey","New Mexico",
  "New York","North Carolina","North Dakota","Ohio","Oklahoma","Oregon","Pennsylvania",
  "Rhode Island","South Carolina","South Dakota","Tennessee","Texas","Utah","Vermont",
  "Virginia","Washington","West Virginia","Wisconsin","Wyoming",
];

const ToggleRow = ({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) => (
  <div className="flex items-center justify-between py-1">
    <span className="text-sm text-foreground">{label}</span>
    <div className="flex items-center gap-1.5">
      <span className={`text-xs font-medium ${!checked ? "text-foreground" : "text-muted-foreground"}`}>OFF</span>
      <Switch checked={checked} onCheckedChange={onChange} className="data-[state=unchecked]:bg-muted" />
      <span className={`text-xs font-medium ${checked ? "text-primary" : "text-muted-foreground"}`}>ON</span>
    </div>
  </div>
);

const SectionHeader = ({ children }: { children: React.ReactNode }) => (
  <div className="border-l-4 border-primary bg-primary/5 px-3 py-2 mb-4">
    <p className="text-primary text-sm font-semibold">{children}</p>
  </div>
);

interface ApplyModalProps {
  companyName: string;
  onClose: () => void;
}

export function ApplyModal({ companyName, onClose }: ApplyModalProps) {
  const { load, save } = useApplication();
  const saved = load();

  // Basic info — pre-fill from saved
  const [firstName, setFirstName] = useState(saved.firstName ?? "");
  const [lastName, setLastName] = useState(saved.lastName ?? "");
  const [email, setEmail] = useState(saved.email ?? "");
  const [phone, setPhone] = useState(saved.phone ?? "");
  const [cdlNumber, setCdlNumber] = useState(saved.cdlNumber ?? "");
  const [zipCode, setZipCode] = useState(saved.zipCode ?? "");
  const [date, setDate] = useState(saved.date ?? "");
  const [driverType, setDriverType] = useState(saved.driverType ?? "");
  const [licenseClass, setLicenseClass] = useState(saved.licenseClass ?? "");
  const [yearsExp, setYearsExp] = useState(saved.yearsExp ?? "");
  const [licenseState, setLicenseState] = useState(saved.licenseState ?? "");
  const [soloTeam, setSoloTeam] = useState(saved.soloTeam ?? "Solo");
  const [notes, setNotes] = useState(saved.notes ?? "");

  const [prefs, setPrefs] = useState({
    betterPay: false, betterHomeTime: false,
    healthInsurance: false, bonuses: false, newEquipment: false,
    ...(saved.prefs ?? {}),
  });
  const [endorse, setEndorse] = useState({
    doublesTriples: false, hazmat: false, tankVehicles: false, tankerHazmat: false,
    ...(saved.endorse ?? {}),
  });
  const [hauler, setHauler] = useState({
    box: false, carHaul: false, dropAndHook: false, dryBulk: false, dryVan: false,
    flatbed: false, hopperBottom: false, intermodal: false, oilField: false,
    oversizeLoad: false, refrigerated: false, tanker: false,
    ...(saved.hauler ?? {}),
  });
  const [route, setRoute] = useState({
    dedicated: false, local: false, ltl: false, otr: false, regional: false,
    ...(saved.route ?? {}),
  });
  const [extra, setExtra] = useState({
    leasePurchase: false, accidents: false, suspended: false, newsletters: false,
    ...(saved.extra ?? {}),
  });

  const tog = <T extends Record<string, boolean>>(setter: React.Dispatch<React.SetStateAction<T>>, key: keyof T) =>
    (v: boolean) => setter((prev) => ({ ...prev, [key]: v }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      firstName, lastName, email, phone, cdlNumber, zipCode, date,
      driverType, licenseClass, yearsExp, licenseState, soloTeam, notes,
      prefs, endorse, hauler, route, extra,
    };
    save(data);

    // Record received application for the company's dashboard
    const KEY_RECEIVED = "cdl-applications-received";
    const received = JSON.parse(localStorage.getItem(KEY_RECEIVED) ?? "[]");
    received.push({ ...data, companyName, submittedAt: new Date().toISOString() });
    localStorage.setItem(KEY_RECEIVED, JSON.stringify(received));

    toast.success(`Application submitted to ${companyName}!`);
    onClose();
  };

  const modal = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-background border border-border w-full max-w-2xl shadow-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div>
            <h2 className="font-display font-bold text-base">Let's Get Started!</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Applying to {companyName}</p>
          </div>
          <button onClick={onClose} className="p-1 hover:text-primary transition-colors" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable form body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-5 py-5 space-y-6">

          {/* Job preferences */}
          <div>
            <SectionHeader>What do you want in your next job selections?</SectionHeader>
            <div className="grid sm:grid-cols-2 gap-x-12 gap-y-1">
              <ToggleRow label="Better pay" checked={prefs.betterPay} onChange={tog(setPrefs, "betterPay")} />
              <ToggleRow label="Better home time" checked={prefs.betterHomeTime} onChange={tog(setPrefs, "betterHomeTime")} />
              <ToggleRow label="Health Insurance" checked={prefs.healthInsurance} onChange={tog(setPrefs, "healthInsurance")} />
              <ToggleRow label="Bonuses" checked={prefs.bonuses} onChange={tog(setPrefs, "bonuses")} />
              <ToggleRow label="New equipment" checked={prefs.newEquipment} onChange={tog(setPrefs, "newEquipment")} />
            </div>
          </div>

          {/* Basic info */}
          <div className="grid sm:grid-cols-2 gap-4">
            <Input placeholder="First name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            <Input placeholder="Last name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
            <Input placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Input placeholder="Phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
            <Input placeholder="CDL #" value={cdlNumber} onChange={(e) => setCdlNumber(e.target.value)} />
            <Input placeholder="Zip Code" value={zipCode} onChange={(e) => setZipCode(e.target.value)} />
            <Input placeholder="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>

          {/* Driving experience */}
          <div>
            <SectionHeader>Tell us about your driving experience.</SectionHeader>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Driver Type</Label>
                <Select value={driverType} onValueChange={setDriverType}>
                  <SelectTrigger><SelectValue placeholder="Owner Operator" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="company">Company Driver</SelectItem>
                    <SelectItem value="owner-operator">Owner Operator</SelectItem>
                    <SelectItem value="lease">Lease Operator</SelectItem>
                    <SelectItem value="student">Student / Trainee</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">License Class</Label>
                <Select value={licenseClass} onValueChange={setLicenseClass}>
                  <SelectTrigger><SelectValue placeholder="Class A" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="a">Class A</SelectItem>
                    <SelectItem value="b">Class B</SelectItem>
                    <SelectItem value="c">Class C</SelectItem>
                    <SelectItem value="permit">Permit Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Years Experience</Label>
                <Select value={yearsExp} onValueChange={setYearsExp}>
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="less-1">Less than 1 year</SelectItem>
                    <SelectItem value="1-3">1–3 years</SelectItem>
                    <SelectItem value="3-5">3–5 years</SelectItem>
                    <SelectItem value="5+">5+ years</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">License State</Label>
                <Select value={licenseState} onValueChange={setLicenseState}>
                  <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
                  <SelectContent>
                    {US_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Endorsements */}
          <div>
            <SectionHeader>Endorsements (optional):</SectionHeader>
            <div className="grid sm:grid-cols-2 gap-x-12 gap-y-1">
              <ToggleRow label="Doubles/Triples (T)" checked={endorse.doublesTriples} onChange={tog(setEndorse, "doublesTriples")} />
              <ToggleRow label="HAZMAT (H)" checked={endorse.hazmat} onChange={tog(setEndorse, "hazmat")} />
              <ToggleRow label="Tank Vehicles (N)" checked={endorse.tankVehicles} onChange={tog(setEndorse, "tankVehicles")} />
              <ToggleRow label="Tanker + HAZMAT (X)" checked={endorse.tankerHazmat} onChange={tog(setEndorse, "tankerHazmat")} />
            </div>
          </div>

          {/* Hauler experience */}
          <div>
            <SectionHeader>Hauler Experience:</SectionHeader>
            <div className="grid sm:grid-cols-3 gap-x-8 gap-y-1">
              <ToggleRow label="Box" checked={hauler.box} onChange={tog(setHauler, "box")} />
              <ToggleRow label="Car Haul" checked={hauler.carHaul} onChange={tog(setHauler, "carHaul")} />
              <ToggleRow label="Drop and Hook" checked={hauler.dropAndHook} onChange={tog(setHauler, "dropAndHook")} />
              <ToggleRow label="Dry Bulk" checked={hauler.dryBulk} onChange={tog(setHauler, "dryBulk")} />
              <ToggleRow label="Dry Van" checked={hauler.dryVan} onChange={tog(setHauler, "dryVan")} />
              <ToggleRow label="Flatbed" checked={hauler.flatbed} onChange={tog(setHauler, "flatbed")} />
              <ToggleRow label="Hopper Bottom" checked={hauler.hopperBottom} onChange={tog(setHauler, "hopperBottom")} />
              <ToggleRow label="Intermodal" checked={hauler.intermodal} onChange={tog(setHauler, "intermodal")} />
              <ToggleRow label="Oil Field" checked={hauler.oilField} onChange={tog(setHauler, "oilField")} />
              <ToggleRow label="Oversize Load" checked={hauler.oversizeLoad} onChange={tog(setHauler, "oversizeLoad")} />
              <ToggleRow label="Refrigerated" checked={hauler.refrigerated} onChange={tog(setHauler, "refrigerated")} />
              <ToggleRow label="Tanker" checked={hauler.tanker} onChange={tog(setHauler, "tanker")} />
            </div>
          </div>

          {/* Route preference */}
          <div>
            <SectionHeader>Route Preference:</SectionHeader>
            <div className="grid sm:grid-cols-3 gap-x-8 gap-y-1">
              <ToggleRow label="Dedicated" checked={route.dedicated} onChange={tog(setRoute, "dedicated")} />
              <ToggleRow label="Local" checked={route.local} onChange={tog(setRoute, "local")} />
              <ToggleRow label="LTL" checked={route.ltl} onChange={tog(setRoute, "ltl")} />
              <ToggleRow label="OTR" checked={route.otr} onChange={tog(setRoute, "otr")} />
              <ToggleRow label="Regional" checked={route.regional} onChange={tog(setRoute, "regional")} />
            </div>
          </div>

          <Separator />

          {/* Additional questions */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground">Interested in solo or team driving?</span>
              <Select value={soloTeam} onValueChange={setSoloTeam}>
                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Solo">Solo</SelectItem>
                  <SelectItem value="Team">Team</SelectItem>
                  <SelectItem value="Either">Either</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <ToggleRow label="Interested in lease purchase?" checked={extra.leasePurchase} onChange={tog(setExtra, "leasePurchase")} />
            <ToggleRow label="Have you had any accidents or violations in the past 3 years?" checked={extra.accidents} onChange={tog(setExtra, "accidents")} />
            <ToggleRow label="Have you had your license suspended or DUI/DWI charges in the past 10 years?" checked={extra.suspended} onChange={tog(setExtra, "suspended")} />
            <ToggleRow label="Yes! Sign me up to receive newsletters and job alerts" checked={extra.newsletters} onChange={tog(setExtra, "newsletters")} />
          </div>

          {/* Notes */}
          <div className="border border-border">
            <div className="flex items-center gap-4 border-b border-border bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground flex-wrap">
              {["Edit","Insert","Format","Table","View"].map((m) => (
                <button key={m} type="button" className="hover:text-foreground transition-colors">{m}</button>
              ))}
              <span className="border-l border-border h-4 mx-1" />
              {["B","I","U","S"].map((f) => (
                <button key={f} type="button" className="font-medium hover:text-foreground transition-colors">{f}</button>
              ))}
            </div>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes..."
              rows={5}
              className="border-0 rounded-none resize-none focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            <div className="flex justify-end border-t border-border px-3 py-1 text-xs text-muted-foreground">
              {notes.trim() ? notes.trim().split(/\s+/).length : 0} WORDS
            </div>
          </div>

          {/* Submit */}
          <div className="flex items-center gap-3 pb-2">
            <Button type="submit" className="px-8">Send</Button>
            <Button type="button" variant="outline" className="px-8" onClick={onClose}>Cancel</Button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
