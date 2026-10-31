// SIMULATED threat telemetry for the "Global Cyber Threat Map" demo widget.
//
// AegisAI has no global sensor network, so nothing here is real attack data, and the UI says
// so. Region names are deliberately generic (not countries) so the demo does not point at any
// nation. To use real data, replace `simulateEvents` with a feed from your firewall/SIEM that
// returns the same `ThreatEvent` shape.

import type { Severity } from "@/lib/types";

export interface ThreatRegion {
  id: string;
  name: string;
  lat: number;
  lon: number;
  weight: number;
}

export interface ThreatEvent {
  id: string;
  region: ThreatRegion;
  kind: string;
  severity: Severity;
}

export const THREAT_REGIONS: ThreatRegion[] = [
  { id: "na-east", name: "North America (East)", lat: 38, lon: -78, weight: 3 },
  { id: "na-west", name: "North America (West)", lat: 37, lon: -120, weight: 2 },
  { id: "sa", name: "South America", lat: -15, lon: -57, weight: 2 },
  { id: "eu-west", name: "Western Europe", lat: 48, lon: 4, weight: 3 },
  { id: "eu-east", name: "Eastern Europe", lat: 52, lon: 30, weight: 3 },
  { id: "nordics", name: "Nordics", lat: 62, lon: 15, weight: 1 },
  { id: "me", name: "Middle East", lat: 29, lon: 45, weight: 2 },
  { id: "af-north", name: "North Africa", lat: 28, lon: 8, weight: 1 },
  { id: "af-south", name: "Southern Africa", lat: -27, lon: 25, weight: 1 },
  { id: "central-asia", name: "Central Asia", lat: 45, lon: 68, weight: 1 },
  { id: "south-asia", name: "South Asia", lat: 23, lon: 78, weight: 2 },
  { id: "east-asia", name: "East Asia", lat: 36, lon: 115, weight: 3 },
  { id: "sea", name: "Southeast Asia", lat: 6, lon: 108, weight: 2 },
  { id: "oceania", name: "Oceania", lat: -28, lon: 140, weight: 1 },
];

/** The fictional asset the simulated attacks are aimed at. */
export const PROTECTED_ASSET = { name: "Primary data centre (simulated)", lat: 50.1, lon: 8.7 };

export const ATTACK_KINDS = ["Port scan", "SSH brute force", "Web exploit attempt", "Credential stuffing", "Malware callback", "Phishing relay", "DDoS probe"];

const SEVERITIES: Severity[] = ["low", "low", "medium", "medium", "high", "critical"];

/** Small seeded PRNG so the simulation is repeatable (and testable). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function simulateEvent(seed: number, index: number): ThreatEvent {
  const rand = mulberry32(seed * 7919 + index * 104729);
  const total = THREAT_REGIONS.reduce((sum, r) => sum + r.weight, 0);
  let pick = rand() * total;
  const region = THREAT_REGIONS.find((r) => (pick -= r.weight) < 0) ?? THREAT_REGIONS[0];
  return {
    id: `sim-${seed}-${index}`,
    region,
    kind: ATTACK_KINDS[Math.floor(rand() * ATTACK_KINDS.length)],
    severity: SEVERITIES[Math.floor(rand() * SEVERITIES.length)],
  };
}

export function simulateEvents(seed: number, count: number, startIndex = 0): ThreatEvent[] {
  return Array.from({ length: count }, (_, i) => simulateEvent(seed, startIndex + i));
}

/** Events per region, busiest first: the "suspicious regions" panel. */
export function regionTotals(events: ThreatEvent[]): { region: ThreatRegion; count: number }[] {
  const counts = new Map<string, { region: ThreatRegion; count: number }>();
  for (const e of events) {
    const entry = counts.get(e.region.id) ?? { region: e.region, count: 0 };
    entry.count += 1;
    counts.set(e.region.id, entry);
  }
  return [...counts.values()].sort((a, b) => b.count - a.count || a.region.name.localeCompare(b.region.name));
}
