import Link from "next/link";
import ActionButton from "@/components/ui/action-button";
import { Metadata } from "next";
import Breadcrumb from "@/components/ui/breadcrumb";
import Plate from "@/components/ui/plate";
import Seal from "@/components/ui/seal";
import clsx from "clsx";
import { displayFace, Eyebrow, Headline } from "@/components/ui/section";
import {
  aboutCta,
  aboutImages,
  collective,
  heritage,
  site,
  studioNote,
  studioToEveryday,
  sustainability,
  whyKraft,
} from "@/lib/site";

export const metadata: Metadata = {
  title: "About Us",
  description: `The ${site.name} story: what we make, the natural fibres we work in, and how our Kompanions are made with craft clusters across India.`,
  openGraph: { type: "website" },
};

/**
 * The Kozy Living story. Section order:
 * what we make (the four collections) → why kraft-led (fibre & process) →
 * studio to everyday (five steps) → conscious-by-default pillars →
 * the collective → a note from the studio → shop CTA.
 */
export default function AboutPage() {
  return (
    <>
      <Breadcrumb current="About us" />
      <Masthead />
      <Collections />
      <WhyKraft />
      <StudioToEveryday />
      <Sustainability />
      <Collective />
      <StudioNote />
      <ShopCta />
    </>
  );
}

/* ---------------------------------------------------------------- masthead */

function Masthead() {
  return (
    <section
      aria-labelledby="heritage"
      className="shell overflow-x-clip pb-10 md:pb-14"
    >
      <div className="max-w-4xl pb-8 pt-2">
        <Eyebrow align="left">{heritage.eyebrow}</Eyebrow>
        <Headline as="h1" id="heritage" className="mt-4">
          {heritage.title}
        </Headline>
        <p className="body-mono mt-5 max-w-measure text-pretty">
          {heritage.body}
        </p>
      </div>

      {/* The wordmark straddles the paired frames exactly as it does on the
          homepage hero - the one gesture that ties every landing page
          together. */}
      <div className="relative pb-[8.5vw]">
        <div className="relative">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {[aboutImages.studio, aboutImages.kraft].map((image, index) => (
              <Plate
                key={image.alt}
                src={image.src}
                alt={image.alt}
                aspect="4/3"
                arrow
                tone={index === 0 ? 0 : 2}
                priority={index === 0}
                placeholderText={index === 0 ? "studio" : "kraft"}
                sizes="(min-width: 768px) 50vw, 100vw"
              />
            ))}
          </div>

          <p
            aria-hidden
            className="wordmark pointer-events-none absolute inset-x-0 bottom-0 z-10 translate-y-[46%] select-none whitespace-nowrap text-center leading-[0.78] text-ink"
          >
            kompanions
          </p>

          <div className="absolute bottom-0 hidden md:block left-4 z-20 translate-y-[28%] md:left-12">
            <Seal text="handcrafted · sustainable · made to last · " size="sm" />
          </div>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------- collections */

function Collections() {
  return (
    <section aria-label="What we make" className="shell pb-10 md:pb-14">
      <ol>
        {heritage.collections.map((entry) => (
          <li key={entry.index} className="panel mb-3 last:mb-0">
            <div className="grid gap-3 p-6 md:grid-cols-[9rem_1fr] md:gap-12 md:p-8">
              <p className="serif text-display-md leading-none text-ink/35">
                {entry.index}
              </p>
              <div>
                <h2 className="serif text-display-sm">{entry.title}</h2>
                <p className="body-mono mt-3 max-w-measure text-pretty">
                  {entry.body}
                </p>
              </div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

/* ---------------------------------------------------------------- why kraft */

function WhyKraft() {
  return (
    <section aria-labelledby="why-kraft" className="shell pb-10 md:pb-14">
      <div className="max-w-4xl pb-8">
        <Eyebrow align="left">{whyKraft.eyebrow}</Eyebrow>
        <Headline id="why-kraft" size="lg" className="mt-4">
          {whyKraft.title}
        </Headline>
        <p className="body-mono mt-5 max-w-measure text-pretty">
          {whyKraft.body}
        </p>
      </div>

      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {whyKraft.stats.map((stat) => (
          <div
            key={stat.value}
            className="panel p-6 md:p-8"
          >
            <dt className="sr-only">{stat.label}</dt>
            <dd>
              <span className={clsx(displayFace, "block text-display-lg leading-none")}>
                {stat.value}
              </span>
              <span className="ui-mono mt-4 block normal-case tracking-normal">
                {stat.label}
              </span>
              <span className="spec-mono mt-2 block">{stat.note}</span>
            </dd>
          </div>
        ))}
      </dl>

      <div
        data-lenis-prevent-horizontal
        className="panel mt-3 overflow-x-auto p-2"
      >
        <table className="w-full min-w-[36rem] border-collapse text-left">
          <caption className="sr-only">
            Conventional Mass Decor vs Kozy Living Mindful Craft
          </caption>
          <thead>
            <tr>
              <th scope="col" className="spec-mono px-4 py-4 uppercase md:px-6">
                Standard
              </th>
              <th scope="col" className="spec-mono px-4 py-4 uppercase md:px-6">
                Conventional Mass Decor
              </th>
              <th scope="col" className="spec-mono px-4 py-4 uppercase md:px-6">
                Kozy Living Mindful Craft
              </th>
            </tr>
          </thead>
          <tbody>
            {whyKraft.comparison.map((row) => (
              <tr key={row.trait} className="rule-t transition-colors hover:bg-wash">
                <th scope="row" className="spec-mono px-4 py-4 font-normal md:px-6">
                  {row.trait}
                </th>
                <td className="spec-mono px-4 py-4 md:px-6">{row.conventional}</td>
                <td className="ui-mono px-4 py-4 font-semibold md:px-6">
                  {row.kozy}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------- studio to everyday */

function StudioToEveryday() {
  return (
    <section aria-labelledby="studio-to-everyday" className="shell pb-10 md:pb-14">
      <div className="max-w-4xl pb-8">
        <Eyebrow align="left">{studioToEveryday.eyebrow}</Eyebrow>
        <Headline id="studio-to-everyday" size="lg" className="mt-4">
          {studioToEveryday.title}
        </Headline>
      </div>

      <ol className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {studioToEveryday.steps.map((step, index) => (
          <li
            key={step.title}
            className="panel p-6 md:p-8"
          >
            <span className="micro-mono block text-ink/35">
              {String(index + 1).padStart(2, "0")}
            </span>
            <h3 className="serif mt-5 text-display-sm">{step.title}</h3>
            <p className="body-mono mt-3 text-pretty">{step.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

/* ---------------------------------------------------------- sustainability */

function Sustainability() {
  return (
    <section aria-labelledby="sustainability" className="shell pb-10 md:pb-14">
      <div className="panel-ink p-8 md:p-12">
        <Eyebrow align="left">{sustainability.eyebrow}</Eyebrow>
        <Headline id="sustainability" size="lg" className="mt-4 max-w-4xl">
          {sustainability.title.map((line) => (
            <span key={line} className="block">
              {line}
            </span>
          ))}
        </Headline>
        <p className="body-mono mt-6 max-w-measure text-pretty">
          {sustainability.body}
        </p>

        <ul className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {sustainability.pillars.map((pillar) => (
            <li key={pillar.title} className="border-t border-paper/20 pt-6">
              <h3 className="serif text-display-sm">{pillar.title}</h3>
              <p className="body-mono mt-3 text-pretty">{pillar.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------- the collective */

function Collective() {
  return (
    <section aria-labelledby="collective" className="shell pb-10 md:pb-14">
      <div className="max-w-4xl pb-8">
        <Eyebrow align="left">{collective.eyebrow}</Eyebrow>
        <Headline id="collective" size="lg" className="mt-4">
          {collective.title}
        </Headline>
        <p className="spec-mono mt-4">{collective.strapline}</p>
      </div>

      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {collective.members.map((member) => (
          <li
            key={member.name}
            className="panel p-6 md:p-8"
          >
            <div className="plate flex aspect-[4/5] w-full items-center justify-center bg-sage-wash">
              <span aria-hidden className="wordmark text-[5rem] leading-none text-ink/70">
                {member.name.charAt(0)}
              </span>
            </div>
            <p className="micro-mono mt-5 text-muted">{member.role}</p>
            <h3 className="serif mt-2 text-display-sm">{member.name}</h3>
            {member.credential ? (
              <p className="spec-mono mt-2">{member.credential}</p>
            ) : null}
            <p className="body-mono mt-3 text-pretty">{member.body}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* -------------------------------------------------------------- the note */

function StudioNote() {
  return (
    <section aria-labelledby="note" className="shell pb-10 md:pb-14">
      <div className="panel p-8 md:p-12">
        <Eyebrow align="left">{studioNote.eyebrow}</Eyebrow>
        <Headline id="note" size="lg" className="mt-4 max-w-4xl">
          {studioNote.title}
        </Headline>
        <div className="mt-5 max-w-measure space-y-4">
          {studioNote.body.map((paragraph) => (
            <p key={paragraph} className="body-mono text-pretty">
              {paragraph}
            </p>
          ))}
        </div>
        <p className="serif mt-10 text-display-md">{studioNote.signature}</p>
        <p className="spec-mono mt-1">{studioNote.signatureRole}</p>
      </div>
    </section>
  );
}

/* --------------------------------------------------------------- shop cta */

function ShopCta() {
  return (
    <section aria-labelledby="shop" className="shell pb-14 pt-4">
      <div className="grid grid-cols-1 items-stretch gap-3 lg:grid-cols-2">
        <Plate
          src={aboutImages.lounge.src}
          alt={aboutImages.lounge.alt}
          aspect="4/5"
          arrow
          tone={3}
          placeholderText="lounge"
          sizes="(min-width: 1024px) 50vw, 100vw"
        />

        <div className="panel-sage flex flex-col items-start justify-center p-8 md:p-12">
          <Eyebrow align="left">{aboutCta.eyebrow}</Eyebrow>
          <Headline id="shop" size="lg" className="mt-4">
            {aboutCta.title.map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </Headline>
          <p className="mt-5 max-w-measure text-body text-ink/70 text-pretty">
            {aboutCta.body}
          </p>
          <Link href={aboutCta.href} className="btn-solid mt-8">
            {aboutCta.cta}
          </Link>
        </div>
      </div>
    </section>
  );
}
