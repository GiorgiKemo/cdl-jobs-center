import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Link, useParams, useNavigate } from "react-router-dom";
import { User, MapPin, Award, Truck } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

interface Driver {
  id: number;
  name: string;
  type: string;
  licenseClass: string;
  experience: string;
  state: string;
  doubles: string;
  hazmat: string;
  tank: string;
  tankerHazmat: string;
}

const mockDrivers: Driver[] = [
  { id: 1, name: "Vladislav Vitalievich", type: "Owner Operator", licenseClass: "Class A", experience: "2-5 years", state: "Delaware", doubles: "Yes", hazmat: "Yes", tank: "Yes", tankerHazmat: "No" },
  { id: 2, name: "James R. Mitchell", type: "Company Driver", licenseClass: "Class A", experience: "5-10 years", state: "Texas", doubles: "Yes", hazmat: "No", tank: "No", tankerHazmat: "No" },
  { id: 3, name: "Carlos Mendez", type: "Lease Purchase", licenseClass: "Class A", experience: "2-5 years", state: "Florida", doubles: "No", hazmat: "Yes", tank: "Yes", tankerHazmat: "Yes" },
  { id: 4, name: "David L. Patterson", type: "Team Driver", licenseClass: "Class A", experience: "10+ years", state: "Illinois", doubles: "Yes", hazmat: "Yes", tank: "No", tankerHazmat: "No" },
  { id: 5, name: "Michael T. Brown", type: "Company Driver", licenseClass: "Class B", experience: "1-2 years", state: "Georgia", doubles: "No", hazmat: "No", tank: "No", tankerHazmat: "No" },
  { id: 6, name: "Kevin S. Thompson", type: "Owner Operator", licenseClass: "Class A", experience: "10+ years", state: "California", doubles: "Yes", hazmat: "Yes", tank: "Yes", tankerHazmat: "Yes" },
  { id: 7, name: "Robert A. Garcia", type: "Company Driver", licenseClass: "Class A", experience: "2-5 years", state: "Ohio", doubles: "No", hazmat: "No", tank: "Yes", tankerHazmat: "No" },
  { id: 8, name: "Anthony J. Williams", type: "Lease Purchase", licenseClass: "Class A", experience: "Less than 1 year", state: "Pennsylvania", doubles: "No", hazmat: "No", tank: "No", tankerHazmat: "No" },
];

const EndorsementBadge = ({ label, active }: { label: string; active: boolean }) => (
  <span className={`inline-flex items-center px-2.5 py-1 text-xs font-medium border ${
    active
      ? "border-primary bg-primary/10 text-primary"
      : "border-border bg-muted/30 text-muted-foreground line-through"
  }`}>
    {label}
  </span>
);

const DriverProfile = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user || user.role !== "company") {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto py-8 max-w-3xl text-center">
          <p className="text-muted-foreground">Company access required.</p>
          <Button className="mt-4" asChild><Link to="/">Go Home</Link></Button>
        </main>
        <Footer />
      </div>
    );
  }

  const driver = mockDrivers.find((d) => d.id === Number(id));

  if (!driver) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto py-8 max-w-3xl text-center">
          <p className="text-muted-foreground">Driver not found.</p>
          <Button className="mt-4" onClick={() => navigate("/drivers")}>Back to Drivers</Button>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto py-6 max-w-3xl">
        {/* Breadcrumb */}
        <p className="text-sm text-muted-foreground mb-4">
          <Link to="/" className="text-primary hover:underline">Main</Link>
          <span className="mx-1">»</span>
          <Link to="/drivers" className="text-primary hover:underline">Drivers</Link>
          <span className="mx-1">»</span>
          {driver.name}
        </p>

        {/* Header card */}
        <div className="border border-border bg-card mb-4">
          <div className="bg-foreground text-background dark:bg-muted dark:text-foreground px-6 py-5 flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
              <User className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h1 className="font-display font-bold text-xl">{driver.name}</h1>
              <p className="text-sm opacity-70 mt-0.5">{driver.type} · {driver.licenseClass}</p>
            </div>
          </div>

          <div className="px-6 py-5 space-y-6">
            {/* Key info */}
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="flex items-center gap-2.5">
                <MapPin className="h-4 w-4 text-primary shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">License State</p>
                  <p className="font-medium text-sm">{driver.state}</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <Truck className="h-4 w-4 text-primary shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Experience</p>
                  <p className="font-medium text-sm">{driver.experience}</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <Award className="h-4 w-4 text-primary shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Driver Type</p>
                  <p className="font-medium text-sm">{driver.type}</p>
                </div>
              </div>
            </div>

            {/* Endorsements */}
            <div>
              <p className="text-sm font-semibold text-foreground mb-3 border-l-4 border-primary pl-3">Endorsements</p>
              <div className="flex flex-wrap gap-2">
                <EndorsementBadge label="Doubles/Triples (T)" active={driver.doubles === "Yes"} />
                <EndorsementBadge label="HAZMAT (H)" active={driver.hazmat === "Yes"} />
                <EndorsementBadge label="Tank Vehicles (N)" active={driver.tank === "Yes"} />
                <EndorsementBadge label="Tanker + HAZMAT (X)" active={driver.tankerHazmat === "Yes"} />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2 border-t border-border">
              <Button
                onClick={() => toast.success(`Contact request sent to ${driver.name}`)}
              >
                Contact Driver
              </Button>
              <Button variant="outline" onClick={() => navigate("/drivers")}>
                Back to Directory
              </Button>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default DriverProfile;
