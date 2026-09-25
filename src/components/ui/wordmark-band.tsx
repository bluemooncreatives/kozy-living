import clsx from "clsx";
import { splitText } from "@/components/motion/split-text";
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
 *
 * ENTRANCE. The pieces rise out of their own slots (`data-split`), which is the
 * loading curtain's gesture played in reverse: the curtain's wordmark leaves
 * upward, and this one arrives from below as the panels clear it. Split by
 * WORD, never by glyph - Franxurter carries 2,104 kerning pairs, and a glyph
 * in its own box is a glyph the font can no longer kern, which at 18vw is
 * plainly visible. The seal box travels as one unit with the rest.
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
      data-split=""
      className={clsx(
        // `nowrap` because this is one line or nothing: a band that runs long
        // must bleed past the frame (the signature), never break - a flex row
        // that does not fit wraps the text INSIDE the last span, so the
        // second line starts under that span rather than at the margin.
        "wordmark flex select-none items-baseline justify-center whitespace-nowrap leading-[0.9] text-ink",
        className
      )}
    >
      <span aria-hidden>{splitText(before)}</span>

      {at === -1 ? null : (
        /* The seal is taken out of flow inside a box sized to the glyph, so
           the box has no line content of its own. That matters: a flex item
           WITH text in it aligns by that text's baseline, and the seal has a
           glyph at its centre - which is what dropped the disc half a letter
           low. With no in-flow content the baseline is synthesised from the
           bottom border edge, which is the alignment the O actually needs. */
        /* `shrink-0`: a flex item shrinks when the row overflows, and this
           one has no content to hold it open - it lost width but not height
           and the disc became an oval with its ring clipped. */
        <span className="split-unit relative mx-[0.0195em] mb-[-0.005em] inline-block h-[0.586em] w-[0.586em] shrink-0">
          <Seal
            text={seal}
            tone="ink"
            size="fit"
            className="absolute inset-0 h-full w-full"
          />
        </span>
      )}

      <span aria-hidden>{splitText(after)}</span>

      {/* The wordmark is decorative; the page's real heading is elsewhere. */}
      <span className="sr-only">{text}</span>
    </div>
  );
}
