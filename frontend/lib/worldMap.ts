import { feature } from "topojson-client";
import type { Topology } from "topojson-specification";

/** Equirectangular projection onto a 1000 x 460 canvas, cropped to lat 84 .. -58 (no Antarctica). */
export const MAP_WIDTH = 1000;
export const MAP_HEIGHT = 460;
const LAT_MAX = 84;
const LAT_MIN = -58;

export function project(lon: number, lat: number): [number, number] {
  const x = ((lon + 180) / 360) * MAP_WIDTH;
  const y = ((LAT_MAX - lat) / (LAT_MAX - LAT_MIN)) * MAP_HEIGHT;
  return [Math.round(x * 10) / 10, Math.round(y * 10) / 10];
}

type Ring = number[][];

function ringToPath(ring: Ring): string {
  return ring.map(([lon, lat], i) => `${i === 0 ? "M" : "L"}${project(lon, lat).join(" ")}`).join("") + "Z";
}

/** One SVG path string per country, from a world-atlas TopoJSON topology. */
export function landPaths(topology: Topology): string[] {
  const countries = topology.objects.countries;
  if (!countries) return [];
  const collection = feature(topology, countries);
  const features = "features" in collection ? collection.features : [collection];
  const paths: string[] = [];
  for (const f of features) {
    const g = f.geometry;
    if (!g) continue;
    if (g.type === "Polygon") paths.push((g.coordinates as Ring[]).map(ringToPath).join(""));
    else if (g.type === "MultiPolygon") paths.push((g.coordinates as Ring[][]).map((poly) => poly.map(ringToPath).join("")).join(""));
  }
  return paths;
}
