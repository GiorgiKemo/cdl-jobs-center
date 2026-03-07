import { useEffect, useRef, useState } from "react";
import { MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";

// Pinned options always shown at top when field is empty / matches
const PINNED = ["Nationwide", "Remote"];

const US_STATES = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado",
  "Connecticut", "Delaware", "Florida", "Georgia", "Hawaii", "Idaho",
  "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana",
  "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota",
  "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada",
  "New Hampshire", "New Jersey", "New Mexico", "New York",
  "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon",
  "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota",
  "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington",
  "West Virginia", "Wisconsin", "Wyoming",
];

// Major trucking hubs (city, state)
const CITIES = [
  "Chicago, IL", "Houston, TX", "Dallas, TX", "Atlanta, GA",
  "Los Angeles, CA", "Memphis, TN", "Louisville, KY", "Indianapolis, IN",
  "Columbus, OH", "Kansas City, MO", "Nashville, TN", "Charlotte, NC",
  "Denver, CO", "Phoenix, AZ", "Seattle, WA", "Portland, OR",
  "Minneapolis, MN", "Detroit, MI", "Cincinnati, OH", "Pittsburgh, PA",
  "St. Louis, MO", "Salt Lake City, UT", "Jacksonville, FL", "Miami, FL",
  "San Antonio, TX", "El Paso, TX", "Laredo, TX", "Albuquerque, NM",
  "Omaha, NE", "Oklahoma City, OK", "Tulsa, OK", "Fresno, CA",
  "Sacramento, CA", "Las Vegas, NV", "Reno, NV", "Boise, ID",
];

const ALL_SUGGESTIONS = [...PINNED, ...US_STATES, ...CITIES];

function getMatches(query: string): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...PINNED, ...US_STATES.slice(0, 8)];
  return ALL_SUGGESTIONS.filter((s) => s.toLowerCase().includes(q)).slice(0, 8);
}

interface Props {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function LocationAutocomplete({ id, value, onChange, placeholder, className }: Props) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleInput = (val: string) => {
    onChange(val);
    const matches = getMatches(val);
    setSuggestions(matches);
    setOpen(matches.length > 0);
  };

  const handleFocus = () => {
    const matches = getMatches(value);
    setSuggestions(matches);
    setOpen(matches.length > 0);
  };

  const handleSelect = (s: string) => {
    onChange(s);
    setOpen(false);
  };

  const detectLocation = () => {
    if (!navigator.geolocation) return;
    setDetecting(true);
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          // Free reverse geocoding via OpenStreetMap Nominatim (no API key needed)
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${coords.latitude}&lon=${coords.longitude}&format=json`,
            { headers: { "Accept-Language": "en" } },
          );
          const data = (await res.json()) as {
            address?: { state?: string; county?: string };
          };
          const state = data.address?.state;
          if (state) onChange(state);
        } catch {
          // silently ignore
        } finally {
          setDetecting(false);
        }
      },
      () => setDetecting(false),
    );
  };

  return (
    <div ref={containerRef} className="relative">
      <Input
        id={id}
        value={value}
        onChange={(e) => handleInput(e.target.value)}
        onFocus={handleFocus}
        placeholder={placeholder}
        className={`pr-8 ${className ?? ""}`}
        autoComplete="off"
      />
      <button
        type="button"
        onClick={detectLocation}
        disabled={detecting}
        title="Detect my location"
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
      >
        <MapPin className={`h-4 w-4 ${detecting ? "animate-pulse" : ""}`} />
      </button>

      {open && suggestions.length > 0 && (
        <ul className="absolute z-50 top-full mt-1 w-full bg-popover border border-border rounded-md shadow-lg overflow-hidden max-h-56 overflow-y-auto">
          {suggestions.map((s) => (
            <li key={s}>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); handleSelect(s); }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
              >
                {s}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
