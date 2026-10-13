import clsx from "clsx";
import Newsletter from "@/components/ui/newsletter";
import Plate from "@/components/ui/plate";
import { displayFace } from "@/components/ui/section";
import { splitText } from "@/components/motion/split-text";
import { letterBand } from "@/lib/site";

/**
 * The newsletter, standing on its own above the footer: a narrow studio
 * photograph (a fifth of the width) beside an indigo panel, the hero's bento
 * gap between them.
 *
 * Inside the panel the copy and the form sit SIDE BY SIDE from `lg`, which is
 * what keeps the band short - stacked, heading over body over form, it stood
 * taller than most sections on the page for one email field.
 *
 * On indigo: oat heading (9.30), cream body, and the ivory `outline` pill -
 * the solid indigo pill would be indigo on indigo. The photograph is `md` and
 * up only; on a phone it would push the field a screen further down.
 */
export default function NewsletterBand() {
  return (
    <section aria-labelledby="letter-band" className="shell mt-6">
      <div className="letter-band">
        <Plate
          src={letterBand.image.url}
          alt={letterBand.image.alt}
          aspect={null}
          tone={2}
          sizes="(min-width: 768px) 20vw, 1px"
          className="letter-band-photo"
        />

        <div className="letter-band-panel panel-ink">
          <div>
            <p className="eyebrow flex items-center gap-2">
              <span aria-hidden className="text-[1.1em] leading-none text-sage">
                &#9679;
              </span>
              {letterBand.label}
            </p>
            <h2
              id="letter-band"
              data-split=""
              className={clsx(
                displayFace,
                "mt-4 text-balance text-display-lg text-oat"
              )}
            >
              {splitText(letterBand.heading)}
            </h2>
            <p className="body-mono mt-3 max-w-measure">{letterBand.body}</p>
          </div>

          <div>
            <Newsletter buttonVariant="outline" />
            <p className="spec-mono mt-3">{letterBand.note}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
