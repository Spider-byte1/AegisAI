import type { RiskLevel } from "@/services/types";
import { LEVEL_HEX } from "./severity";

/** Half-circle dial. Colour bands mirror the backend thresholds (25 / 50 / 80). */
export default function RiskGauge({ score, level }: { score: number; level: RiskLevel }) {
  const arc = "M 14 110 A 96 96 0 0 1 206 110";
  const band = (from: number, to: number, color: string) => (
    <path
      d={arc}
      pathLength={100}
      fill="none"
      stroke={color}
      strokeOpacity={0.22}
      strokeWidth={14}
      strokeDasharray={`${to - from} ${100 - (to - from)}`}
      strokeDashoffset={-from}
    />
  );
  return (
    <figure className="w-full max-w-[260px]" aria-label={`Risk score ${score} out of 100, ${level}`}>
      <svg viewBox="0 0 220 130" className="w-full">
        {band(0, 25, LEVEL_HEX.Low)}
        {band(25, 50, LEVEL_HEX.Medium)}
        {band(50, 80, LEVEL_HEX.High)}
        {band(80, 100, LEVEL_HEX.Critical)}
        <path
          d={arc}
          pathLength={100}
          fill="none"
          stroke={LEVEL_HEX[level]}
          strokeWidth={14}
          strokeLinecap="butt"
          strokeDasharray={`${score} ${100 - score}`}
          className="motion-safe:transition-[stroke-dasharray] motion-safe:duration-700"
        />
        <text x="110" y="100" textAnchor="middle" className="fill-ink font-display" fontSize="40" fontWeight="700">
          {Math.round(score)}
        </text>
        <text x="110" y="122" textAnchor="middle" fontSize="13" fontWeight="600" fill={LEVEL_HEX[level]}>
          {level} risk
        </text>
      </svg>
    </figure>
  );
}
