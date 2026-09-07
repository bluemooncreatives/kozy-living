import clsx from "clsx";
import Image from "next/image";
import CornerArrow from "./arrow-badge";
import ClipRotator from "./clip-rotator";

/**
 * The photographic card. Every image on the site goes through this so the
 * radius, the notch, the corner arrow and the caption all stay consistent.
 *
 * `src` is optional on purpose. Until the studio photography lands, a plate
 * without a source renders a toned placeholder carrying the plate's own label
 * as ghosted display type - which reads as a deliberate graphic panel rather
 * than as a broken image, and keeps the layout honest at every breakpoint.
 */
export default function Plate({
  src,
  gallery,
  galleryIndex = 0,
  video,
  videos,
  videoStart = 0,
  videoDelay,
  videoControls,
  alt = "",
  aspect = "4/5",
  sizes = "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw",
  priority,
  arrow,
  arrowTone = "card",
  tag,
  title,
  caption,
  placeholderText,
  tone = 0,
  objectFit = "cover",
  parallax,
  reveal = true,
  className,
  children,
}: {
  src?: string | null;
  /**
   * Several stills for one plate, stacked and cross-faded. The plate does not
   * own which one shows - `galleryIndex` does - so the card above it can put
   * that on whatever control it likes without this file knowing about paging.
   */
  gallery?: readonly { url: string; altText?: string }[] | null;
  /** Which of `gallery` is on top. Anything out of range shows the first. */
  galleryIndex?: number;
  /** Silent looping clip. Takes priority over `src` when both are given. */
  video?: string | null;
  /**
   * A shared film list to rotate through instead of a single `video`. The
   * plate opens on `videoStart` and then takes the next free film from the
   * queue the other plates are drawing on, blending between them rather than
   * cutting, and never landing on a film another plate is showing.
   */
  videos?: readonly string[];
  /** Which film in `videos` this plate opens on. */
  videoStart?: number;
  /** Offsets this plate's rotation so a cluster of them never moves as one. */
  videoDelay?: number;
  /** Draws prev/next buttons over a rotating plate. For large frames only. */
  videoControls?: boolean;
  alt?: string;
  /**
   * Any CSS aspect-ratio value, e.g. "4/5", "16/9", "1/1". Pass `null` when
   * the height comes from `className` instead - the hero is sized to the
   * viewport, not to a ratio.
   */
  aspect?: string | null;
  sizes?: string;
  priority?: boolean;
  /** Draws the corner ↗ button and the notch that receives it. */
  arrow?: boolean;
  arrowTone?: "card" | "sage";
  /** Small white pill sitting low-left on the photograph. */
  tag?: string;
  /** Heavy display title under the tag, inside the frame. */
  title?: string;
  /** Muted line pinned to the bottom-right of the frame. */
  caption?: string;
  /** Ghost type for the placeholder. Falls back to `title` then `tag`. */
  placeholderText?: string;
  /** 0-3. Varies the placeholder wash so a cluster of plates is not flat. */
  tone?: 0 | 1 | 2 | 3;
  objectFit?: "cover" | "contain";
  /** Drifts the photograph against the scroll. For large frames only. */
  parallax?: number;
  /** Opt out where the plate is inside an already-staggered group. */
  reveal?: boolean;
  className?: string;
  children?: React.ReactNode;
}) {
  const ghost = placeholderText ?? title ?? tag ?? "kozy";

  // Shared by the still, the single clip and every layer of a rotating one, so
  // the hover push and the fit stay identical whichever media the plate holds.
  const mediaClass = clsx(
    "absolute inset-0 h-full w-full transition-transform duration-700 ease-editorial group-hover:scale-[1.04]",
    objectFit === "contain" ? "object-contain p-8" : "object-cover"
  );

  // Four gradients built off oat milk, deliberately close together - the
  // placeholders should read as one material, not four different boxes. Every
  // stop stays in the oat family so a wall of plates reads as warm cloth
  // rather than as a colour swatch grid.
  const washes = [
    "linear-gradient(150deg,#F0E7D9 0%,#E8D9C4 55%,#DCCBB2 100%)",
    "linear-gradient(150deg,#E8DBC8 0%,#DCCAB0 60%,#CDB897 100%)",
    "linear-gradient(150deg,#EFEAE0 0%,#E4DCCB 50%,#D5C9B3 100%)",
    "linear-gradient(150deg,#E0D0B8 0%,#D2BFA2 55%,#C2AC8B 100%)",
  ];

  return (
    <div
      {...(reveal ? { "data-reveal": "" } : {})}
      /* w-full/min-w-0: a box with an aspect ratio takes `justify-self: normal`
         as `start`, not `stretch`, so a plate given a definite height (h-full,
         or min-h against a shorter ratio) sized its WIDTH from that height and
         pushed whole sections past the page edge. Pinning the width to the
         track makes the ratio drive the height, which is the intent. */
      className={clsx("relative @container w-full min-w-0", className)}
      style={aspect ? { aspectRatio: aspect } : undefined}
    >
      {/* The notch is masked onto THIS element, the one carrying the plate's
          own background - not onto an inner media wrapper. Masking only the
          media left `bg-tint` sitting in the cut, so the scoop showed oat
          rather than the page behind it.

          A mask applies to an element and all its descendants, which is why
          the arrow button is a sibling further down rather than a child: put
          it in here and the notch would erase the very button it is cut for. */}
      <div className={clsx("plate absolute inset-0", arrow && "notch-tr")}>
        <div
          {...(parallax ? { "data-parallax": String(parallax) } : {})}
          className={clsx(
            "absolute inset-0",
            // Parallax moves the layer, so it needs room to move into.
            parallax && "-inset-y-[8%] h-[116%]"
          )}
        >
          {gallery?.length ? (
            gallery.map((image, index) => (
              <Image
                key={image.url}
                src={image.url}
                alt={image.altText || alt}
                fill
                sizes={sizes}
                // Only the shot on screen is worth the priority hint; the
                // rest are a browse the visitor may never open.
                priority={priority && index === 0}
                loading={priority && index === 0 ? undefined : "lazy"}
                className={clsx(
                  mediaClass,
                  "transition-opacity duration-500 ease-editorial",
                  // Modulo rather than a clamp: paging past either end wraps,
                  // so the caller can just keep counting in one direction.
                  index ===
                    ((galleryIndex % gallery.length) + gallery.length) %
                      gallery.length
                    ? "opacity-100"
                    : "opacity-0"
                )}
              />
            ))
          ) : videos?.length ? (
            <ClipRotator
              films={videos}
              start={videoStart}
              delay={videoDelay}
              controls={videoControls}
              className={mediaClass}
            />
          ) : video ? (
            <video
              src={video}
              aria-hidden
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              className={mediaClass}
            />
          ) : src ? (
            <Image
              src={src}
              alt={alt}
              fill
              sizes={sizes}
              priority={priority}
              loading={priority ? undefined : "lazy"}
              className={mediaClass}
            />
          ) : (
            <div
              aria-hidden
              className="absolute inset-0 flex items-center justify-center overflow-hidden"
              style={{ background: washes[tone] }}
            >
              <span className="wordmark whitespace-nowrap px-4 text-[22cqw] leading-none text-ink/[0.09]">
                {ghost}
              </span>
            </div>
          )}
        </div>

        {/* Scrim, only where there is copy to protect. */}
        {(tag || title || caption) &&
        (src || video || videos?.length || gallery?.length) ? (
          <div
            aria-hidden
            className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-indigo/60 to-transparent"
          />
        ) : null}

        {tag || title ? (
          <div className="absolute inset-x-2.5 bottom-2.5 sm:inset-x-4 sm:bottom-4 z-10 flex flex-col items-start gap-1.5 sm:gap-2">
            {tag ? (
              <span className="chip text-[0.625rem] sm:text-spec py-0.5 sm:py-1.5 px-2 sm:px-3">
                {tag}
              </span>
            ) : null}
            {title ? (
              <h3
                className={clsx(
                  "serif text-display-sm",
                  src || video || videos?.length || gallery?.length
                    ? "text-paper"
                    : "text-ink"
                )}
              >
                {title}
              </h3>
            ) : null}
          </div>
        ) : null}

        {caption ? (
          <p
            className={clsx(
              "absolute bottom-4 right-4 z-10 max-w-[16rem] text-right text-spec",
              src || video || videos?.length || gallery?.length
                ? "text-paper/85"
                : "text-ink/60"
            )}
          >
            {caption}
          </p>
        ) : null}
      </div>

      {arrow ? <CornerArrow tone={arrowTone} /> : null}

      {children}
    </div>
  );
}
