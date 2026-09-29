import type { Metadata } from "next";
import B2BEnquiryForm from "@/components/b2b/b2b-enquiry-form";
import Breadcrumb from "@/components/ui/breadcrumb";
import CircledWord from "@/components/ui/circled-word";
import { Eyebrow, Headline } from "@/components/ui/section";
import { b2bEnquiry, kozyStory } from "@/lib/site";

/* ---------------------------------------------------------------------------
   /b2b-enquiries

   Like `/founders-note`, a designed route standing over the Shopify page of
   the same handle (`pages/b2b-enquiries`, linked from the live menu under The
   Kozy Story). That page's body is empty; the route shadows it.

   The contact page's composition - copy left, form in an ivory panel right -
   so the two read as one family, with the brief's steps in an indigo panel
   under the copy. The form is the only client component; everything else
   renders on the server and stays in the HTML without JavaScript.

   Submissions go where the contact form's do - see `components/b2b/actions.ts`.
--------------------------------------------------------------------------- */

export const metadata: Metadata = {
  title: "B2B Enquiries",
  description: b2bEnquiry.description,
  openGraph: { type: "website" },
};

export default function B2BEnquiriesPage() {
  const { materials, steps } = b2bEnquiry;

  return (
    <>
      <Breadcrumb
        trail={[
          { title: "Home", href: "/" },
          { title: kozyStory.eyebrow, href: "/the-kozy-story" },
        ]}
        current="B2B Enquiries"
      />

      <section
        aria-labelledby="b2b"
        className="shell b2b-grid pb-14 md:pb-20"
      >
        {/* Three areas, stacked by `.b2b-grid` at every width: copy, then
            materials and steps, then the form underneath. */}
        <div className="b2b-grid-intro py-4 lg:py-8">
          <div data-reveal-group>
            <Eyebrow align="left">{b2bEnquiry.eyebrow}</Eyebrow>
            <Headline as="h1" id="b2b" className="mt-4">
              {ringWord(b2bEnquiry.title, b2bEnquiry.circled)}
            </Headline>
            <div className="mt-5 max-w-measure space-y-4">
              {b2bEnquiry.body.map((paragraph) => (
                <p key={paragraph} className="body-mono text-pretty">
                  {paragraph}
                </p>
              ))}
            </div>
          </div>
        </div>

        <div className="b2b-grid-details flex flex-col gap-8 pb-8 md:pb-10">
          <div data-reveal>
            <p className="micro-mono text-muted">{materials.label}</p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {materials.items.map((item) => (
                <li key={item} className="chip">
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Sage numerals on indigo (6.50) - flat sage on the cream ground
              would measure 1.85. */}
          <div data-reveal className="panel-ink p-6 md:p-8">
            <p className="micro-mono">{steps.label}</p>
            <ol className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-3 sm:gap-6">
              {steps.items.map((step, i) => (
                <li key={step.title} className="border-t border-paper/15 pt-4">
                  <span className="display-face block text-display-sm text-sage">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <p className="ui-mono mt-2 font-semibold">{step.title}</p>
                  <p className="spec-mono mt-1.5 text-pretty">{step.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>

        <div data-reveal className="b2b-grid-form panel p-6 md:p-10">
          <B2BEnquiryForm />
        </div>
      </section>
    </>
  );
}

/** Wraps the ringed phrase where it sits inside the headline. */
function ringWord(line: string, phrase: string) {
  const at = line.indexOf(phrase);
  if (at === -1) return line;

  return (
    <>
      {line.slice(0, at)}
      <CircledWord>{phrase}</CircledWord>
      {line.slice(at + phrase.length)}
    </>
  );
}
