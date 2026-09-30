import clsx from "clsx";
import Image from "next/image";
import { splitText } from "@/components/motion/split-text";

/**
 * The giant wordmark, with the block-printed textile "O" standing in for its
 * own first "O".
 *
 * The letter is a photograph of the brand's Dabu print cut to an O
 * (`public/kozy/o.png`), and it is sized from the real glyph rather than by
 * eye. Measured out of Franxurter.ttf, at unitsPerEm 2048, the O is:
 *
 *   width / height  0.586em   (a true circle in this face)
 *   yMin / yMax     -0.005em / 0.581em
 *   advance         0.625em
 *
 * The photograph is NOT that circle: trimmed to its ink box it measures
 * 474 x 512, i.e. 0.9258 wide for 1 tall. So the box is pinned by HEIGHT to
 * the glyph's 0.586em and takes its width from that ratio (0.5425em) - match
 * the width instead and the letter grows taller than the line it sits in.
 *
 * The side bearing is then (0.625 - 0.5425) / 2 = 0.04125em rather than the
 * glyph's own 0.0195em, which keeps the substitution advance-for-advance: the
 * word occupies exactly the width it would with the real O, so the band still
 * fills the frame the way the vw-sized type was tuned to.
 *
 * Alignment is `baseline`, not `center`: the glyph is not centred on the line
 * box, it sits from a hair below the baseline to 0.581em above it. A flex item
 * with no text baseline aligns by its bottom margin edge, so the negative
 * bottom margin drops the letter the same 0.005em the real O overshoots by.
 *
 * Everything is in `em`, so it tracks the type size at every breakpoint with
 * no measurement at runtime.
 *
 * If the word has no "o" the plate is simply omitted rather than guessed at.
 *
 * ENTRANCE. The pieces rise out of their own slots (`data-split`), which is the
 * loading curtain's gesture played in reverse: the curtain's wordmark leaves
 * upward, and this one arrives from below as the panels clear it. Split by
 * WORD, never by glyph - Franxurter carries 2,104 kerning pairs, and a glyph
 * in its own box is a glyph the font can no longer kern, which at 18vw is
 * plainly visible. The letter box travels as one unit with the rest.
 */

/** Trimmed ink box of `public/kozy/o.png`, 474 x 512. */
const O_RATIO = 474 / 512;
const O_HEIGHT_EM = 0.586;
const O_WIDTH_EM = +(O_HEIGHT_EM * O_RATIO).toFixed(4);
const O_BEARING_EM = +((0.625 - O_WIDTH_EM) / 2).toFixed(4);

export default function WordmarkBand({
  text,
  className,
}: {
  text: string;
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
        /* The letter is taken out of flow inside a box sized to the glyph, so
           the box has no line content of its own. That matters: a flex item
           WITH text in it aligns by that text's baseline, and there is none
           here to align to. With no in-flow content the baseline is
           synthesised from the bottom border edge, which is the alignment the
           O actually needs. */
        /* `shrink-0`: a flex item shrinks when the row overflows, and this
           one has no content to hold it open - it would lose width but not
           height and the letter would squash. */
        <span
          className="split-unit relative inline-block shrink-0"
          style={{
            height: `${O_HEIGHT_EM}em`,
            width: `${O_WIDTH_EM}em`,
            marginInline: `${O_BEARING_EM}em`,
            marginBottom: "-0.005em",
          }}
        >
          <Image
            src="/kozy/o.png"
            alt=""
            aria-hidden
            fill
            priority
            /* 0.586em of an 18vw type size is ~10.5vw; without `sizes` a
               `fill` image asks for the viewport width at every breakpoint. */
            sizes="12vw"
            className="object-contain"
          />
        </span>
      )}

      <span aria-hidden>{splitText(after)}</span>

      {/* The wordmark is decorative; the page's real heading is elsewhere. */}
      <span className="sr-only">{text}</span>
    </div>
  );
}
