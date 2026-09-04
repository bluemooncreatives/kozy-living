import clsx from "clsx";
import Image from "next/image";
import CornerArrow from "./arrow-badge";

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
  alt = "",
  aspect = "4/5",
  sizes = "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw",
  priority,
  arrow,
  arrowTone = "white",
  tag,
  title,
  caption,
  placeholderText,
  tone = 0,
  objectFit = "cover",
  className,
  children,
}: {
  src?: string | null;
  alt?: string;
  /** Any CSS aspect-ratio value, e.g. "4/5", "16/9", "1/1". */
  aspect?: string;
  sizes?: string;
  priority?: boolean;
  /** Draws the corner ↗ button and the notch that receives it. */
  arrow?: boolean;
  arrowTone?: "white" | "yellow";
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
  className?: string;
  children?: React.ReactNode;
}) {
  const ghost = placeholderText ?? title ?? tag ?? "kozy";

  // Four warm greys. Deliberately close together - the placeholders should
  // read as one material, not as four different coloured boxes.
  const washes = [
    "linear-gradient(150deg,#E9E7E1 0%,#D8D5CD 55%,#C9C5BB 100%)",
    "linear-gradient(150deg,#DEDBD3 0%,#CBC7BE 60%,#BAB6AB 100%)",
    "linear-gradient(150deg,#E4E1DA 0%,#D2CEC5 50%,#C0BCB1 100%)",
    "linear-gradient(150deg,#D6D2C9 0%,#C4C0B6 55%,#B2AEA3 100%)",
  ];

  return (
    <div
      className={clsx("plate @container", className)}
      style={{ aspectRatio: aspect }}
    >
      {/* The notch and the media share a wrapper so the cut-out only ever
          removes photograph, never the caption layer above it. */}
      <div className={clsx("absolute inset-0", arrow && "notch-tr")}>
        {src ? (
          <Image
            src={src}
            alt={alt}
            fill
            sizes={sizes}
            priority={priority}
            loading={priority ? undefined : "lazy"}
            className={clsx(
              "transition-transform duration-700 ease-editorial group-hover:scale-[1.04]",
              objectFit === "contain" ? "object-contain p-8" : "object-cover"
            )}
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

      {arrow ? <CornerArrow tone={arrowTone} /> : null}

      {/* Scrim, only where there is copy to protect. */}
      {(tag || title || caption) && src ? (
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/55 to-transparent"
        />
      ) : null}

      {tag || title ? (
        <div className="absolute inset-x-4 bottom-4 z-10 flex flex-col items-start gap-2">
          {tag ? <span className="chip">{tag}</span> : null}
          {title ? (
            <h3
              className={clsx(
                "serif text-display-sm",
                src ? "text-paper" : "text-ink"
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
            src ? "text-paper/85" : "text-ink/60"
          )}
        >
          {caption}
        </p>
      ) : null}

      {children}
    </div>
  );
}
