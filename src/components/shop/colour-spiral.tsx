import clsx from "clsx";
import type { Swatch } from "@/lib/shop/colours";

/**
 * The colour mark: one thick spiral, drawn in the colour it stands for.
 *
 * It is the brand's own swatch device - the same coil that appears on the
 * palette sheet - and it does a job a square chip cannot. A flat square of Oat
 * Milk against a cream page is almost invisible; a coil is a shape first, so it
 * reads at a glance and the colour is the second thing you notice rather than
 * the only thing there is to notice.
 *
 * Pure SVG, no client JavaScript, no image request. Each size's path is built
 * once at module load and shared by every instance on the page - the six marks
 * on the picker differ only by `stroke`.
 */

/* ------------------------------------------------------------------ geometry
   An Archimedean spiral, r = k·θ, on a 100x100 viewBox centred at (50,50).

   Three numbers decide how one looks:

     turns   how many times the coil wraps. Fractional rather than whole so the
             tail stops at roughly five o'clock, which is what leaves the loose
             end reading as a tail rather than as a seam.
     OUTER   radius at the tail. 43 keeps the stroke's round cap (half its
             width) inside the box.
     width   stroke weight, derived from the turn count so line and gap stay
             equal - the even rhythm the reference sheet has.

   TWO SIZES, because a coil does not scale. The full mark's four windings are
   the brand's swatch and are what the picker paints at 240px; the same path at
   40px collapses into a dot, so the small mark trades two windings for a
   heavier stroke and stays a recognisable spiral. The alternative - shrinking
   the full mark - looked like a smudge in the step-two header, which is what
   sent this here rather than into a `scale` on the caller.
--------------------------------------------------------------------------- */

const OUTER = 43;

/** Samples per turn. 32 is smooth past 400px and keeps the path under 1KB. */
const SAMPLES_PER_TURN = 32;

function spiralPath(turns: number): string {
  const end = Math.PI * 2 * turns;
  const k = OUTER / end;
  const steps = Math.round(SAMPLES_PER_TURN * turns);
  const points: string[] = [];

  for (let step = 0; step <= steps; step += 1) {
    const theta = (end * step) / steps;
    const radius = k * theta;
    const x = 50 + radius * Math.cos(theta);
    const y = 50 + radius * Math.sin(theta);

    points.push(`${x.toFixed(2)} ${y.toFixed(2)}`);
  }

  return `M ${points.join(" L ")}`;
}

/**
 * Line and gap are equal when the stroke is half the distance between windings,
 * and that distance is the outer radius spread over however many there are.
 */
function strokeWidth(turns: number): number {
  return (OUTER / turns) * 0.5;
}

const MARKS = {
  full: { d: spiralPath(4.18), width: strokeWidth(4.18) },
  compact: { d: spiralPath(2.18), width: strokeWidth(2.18) },
} as const;

export default function ColourSpiral({
  swatch,
  size = "full",
  className,
}: {
  swatch: Swatch;
  /** "compact" below about 64px, where four windings stop resolving. */
  size?: "full" | "compact";
  className?: string;
}) {
  const mark = MARKS[size];

  return (
    <svg
      viewBox="0 0 100 100"
      aria-hidden
      focusable="false"
      className={clsx("h-full w-full", className)}
    >
      {/* An outline colour - white - is drawn twice: a hairline of ink first,
          then the colour laid over it slightly narrower. Without it a white
          coil on a cream page is a blank square. */}
      {swatch.outline ? (
        <path
          d={mark.d}
          fill="none"
          stroke="currentColor"
          strokeWidth={mark.width + 0.55}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-ink/45"
        />
      ) : null}
      <path
        d={mark.d}
        fill="none"
        stroke={swatch.hex}
        strokeWidth={mark.width}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
