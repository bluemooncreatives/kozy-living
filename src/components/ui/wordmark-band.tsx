import clsx from "clsx";
import Seal from "./seal";

/**
 * The giant wordmark, with the rotating seal standing in for its first "O".
 *
 * The word is split on that letter and the seal takes its place, sized from
 * the real glyph rather than by eye. Measured out of Franxurter.ttf, at
 * unitsPerEm 2048, the O is:
 *
 *   width / height  0.586em   (a true circle, which is why this works at all)
 *   yMin / yMax     -0.005em / 0.581em
 *   advance         0.625em   -> 0.0195em of side bearing per side
 *
 * So the disc is 0.586em, not the eyeballed 0.82em it started as, and the
 * alignment is `baseline`, not `center`: the glyph is not centred on the line
 * box, it sits from a hair below the baseline to 0.581em above it. A flex item
 * with no text baseline aligns by its bottom margin edge, so the negative
 * bottom margin drops the disc the same 0.005em the real O overshoots by.
 *
 * Everything is in `em`, so it tracks the type size at every breakpoint with
 * no measurement at runtime.
 *
 * If the word has no "o" the seal is simply omitted rather than guessed at.
 */
export default function WordmarkBand({
  text,
  seal,
  className,
}: {
  text: string;
  seal: string;
  className?: string;
}) {
  const at = text.toLowerCase().indexOf("o");
  const before = at === -1 ? text : text.slice(0, at);
  const after = at === -1 ? "" : text.slice(at + 1);

  return (
    <div
      className={clsx(
        "wordmark flex select-none items-baseline justify-center leading-[0.9] text-ink",
        className
      )}
    >
      <span aria-hidden>{before}</span>

      {at === -1 ? null : (
        /* The seal is taken out of flow inside a box sized to the glyph, so
           the box has no line content of its own. That matters: a flex item
           WITH text in it aligns by that text's baseline, and the seal has a
           glyph at its centre - which is what dropped the disc half a letter
           low. With no in-flow content the baseline is synthesised from the
           bottom border edge, which is the alignment the O actually needs. */
        <span className="relative mx-[0.0195em] mb-[-0.005em] inline-block h-[0.586em] w-[0.586em]">
          <Seal
            text={seal}
            tone="ink"
            size="fit"
            className="absolute inset-0 h-full w-full"
          />
        </span>
      )}

      <span aria-hidden>{after}</span>

      {/* The wordmark is decorative; the page's real heading is elsewhere. */}
      <span className="sr-only">{text}</span>
    </div>
  );
}
