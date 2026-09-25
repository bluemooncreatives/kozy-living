import Image from "@/components/ui/shop-image";
import { founderReel } from "@/lib/site";

type ReelItem = (typeof founderReel)[number];

/**
 * The auto-scrolling strip that fills the blank space below the founder's
 * letter - the paragraphs run shorter than the sticky quote card beside
 * them, and an empty gap there read as unfinished layout rather than as
 * white space.
 *
 * HORIZONTAL, ON THE SITE'S OWN TICKER INFRASTRUCTURE. This reuses
 * `.marquee-track` / `-reverse` exactly as `IconMarquee` does - the loop
 * (each row rendered twice, translated by -50%) and the scroll-coupled speed
 * in `motion-provider.tsx` both come for free, rather than a parallel
 * vertical system with its own keyframes to maintain.
 *
 * TWO ROWS, drifting opposite directions at different speeds, so they never
 * lap in sync - the same trick `StandardsTicker` pairs use on the homepage.
 *
 * DECORATIVE, NOT CONTENT. The masthead portrait already carries the real
 * `alt` text for who Khushi is; a strip repeating photographs forever would
 * otherwise announce each one twice to a screen reader for no reason. The
 * whole reel is `aria-hidden`.
 *
 * ONE TILE IS A CLIP, NOT A PHOTOGRAPH - `ShopImage` only handles Shopify's
 * image transform, so the video entry renders as a plain, silent, looping
 * `<video>` instead, with the one non-portrait still in the set standing in
 * as its `poster` so the tile never shows blank before the first frame
 * decodes.
 */
export default function FounderReel({
  className,
  duration = 30,
}: {
  className?: string;
  /** Seconds for the top row's full pass - the second row runs 20% slower
      in reverse, so the two never lap in sync. */
  duration?: number;
}) {
  const top = founderReel.filter((_, i) => i % 2 === 0);
  const bottom = founderReel.filter((_, i) => i % 2 === 1);

  return (
    <div aria-hidden className={`founder-reel ${className ?? ""}`}>
      <div
        className="marquee-track pb-3"
        style={{ "--marquee-duration": `${duration}s` } as React.CSSProperties}
      >
        <ReelStrip items={top} />
        <ReelStrip items={top} />
      </div>
      <div
        className="marquee-track-reverse"
        style={{ "--marquee-duration": `${duration * 1.2}s` } as React.CSSProperties}
      >
        <ReelStrip items={bottom} />
        <ReelStrip items={bottom} />
      </div>
    </div>
  );
}

function ReelStrip({ items }: { items: readonly ReelItem[] }) {
  return (
    <>
      {items.map((item, i) => (
        <div key={`${item.url}-${i}`} className="founder-reel-tile">
          {"type" in item && item.type === "video" ? (
            <video
              src={item.url}
              poster={item.poster}
              muted
              loop
              autoPlay
              playsInline
              preload="metadata"
              className="h-full w-full object-cover"
            />
          ) : (
            <Image
              src={item.url}
              alt=""
              fill
              sizes="12rem"
              className="object-cover"
            />
          )}
        </div>
      ))}
    </>
  );
}
