// Gives the bundled world-map data a precise type instead of an inferred ~100 KB JSON type.
declare module "world-atlas/countries-110m.json" {
  import type { Topology } from "topojson-specification";
  const topology: Topology;
  export default topology;
}
