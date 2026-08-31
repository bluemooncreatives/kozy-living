import Image from "next/image";
import Link from "next/link";
import { Metadata } from "next";
import Breadcrumb from "@/components/ui/breadcrumb";
import { Eyebrow, Headline } from "@/components/ui/section";
import {
  aboutCta,
  aboutImages,
  family,
  familyNote,
  farmToCup,
  heritage,
  site,
  sustainability,
  whyRobusta,
} from "@/lib/site";

export const metadata: Metadata = {
  title: "About",
  description: `Four generations of shade-grown Robusta from ${site.origin}. The estate's history, its case for Robusta, and how the coffee gets from the cherry row to your cup.`,
  openGraph: { type: "website" },
};

/**
 * The estate story. Section order is the argument itself: who we are
 * (heritage) → why this bean (Robusta) → how we make it (farm to cup) → what
 * that costs the land (sustainability) → who is behind it (family) → the shop.
 *
 * Entirely static - every band reads from `site.ts`, so the page never waits on
 * Shopify and the copy is revised in one file.
 *
 * Photography carries two bands and no more: the two-up masthead row and the
 * shop hand-off at the foot. The available frames are all product and lifestyle
 * shots (see `aboutImages`), so they sit where the page talks about the coffee.
 * The timeline, the Robusta argument, the family and the sustainability band
 * stay type- and hairline-led, which is both the system's own instruction
 * (DESIGN.md §3) and the honest option: a packshot under a headline about a
 * hundred-year-old hillside, or standing in for a real person's portrait, would
 * be a lie the layout tells on the copy's behalf.
 */
export default function AboutPage() {
  return (
    <>
      <Breadcrumb current="About us" />
      <Masthead />
      <Timeline />
      <WhyRobusta />
      <FarmToCup />
      <Sustainability />
      <TheFamily />
      <FamilyNote />
      <ShopCta />
    </>
  );
}

/* ---------------------------------------------------------------- masthead */

function Masthead() {
  return (
    <section aria-labelledby="heritage" className="rule-b">
      <div className="shell flex flex-col items-center py-12 text-center md:py-16">
        <Eyebrow>{heritage.eyebrow}</Eyebrow>
        <Headline as="h1" id="heritage" className="mt-5 max-w-4xl">
          {heritage.title}
        </Headline>
        {/* Wider than `max-w-measure`, matching the homepage philosophy band:
            centred copy under a display heading needs the extra width, or it
            stacks into a narrow ragged column under a very wide title. */}
        <p className="body-mono mt-6 max-w-4xl text-pretty">{heritage.body}</p>
      </div>

      {/* Two-up opening row, split by the vertical hairline the system uses
          between every other pair of cells. Both sources are square and both
          subjects sit centred, so the 4:3 crop takes evenly off the top and
          bottom of each. */}
      <div className="rule-t grid grid-cols-1 md:grid-cols-2 md:divide-x md:divide-rule">
        {[aboutImages.morning, aboutImages.grounds].map((image, index) => (
          <div key={image.src} className="p-3">
            <div className="plate aspect-[4/3] w-full">
              <Image
                src={image.src}
                alt={image.alt}
                fill
                // The first cell is the page's LCP - load it eagerly rather
                // than waiting on the lazy observer.
                priority={index === 0}
                sizes="(min-width: 768px) 50vw, 100vw"
                className="object-cover"
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- timeline */

/**
 * Five dates, one per row, ruled apart. The year hangs in its own column on
 * desktop so the dates read as a single vertical spine down the left edge -
 * the point being that they are a hundred years apart but one continuous line.
 */
function Timeline() {
  return (
    <section aria-label="Estate history" className="rule-b">
      <ol>
        {heritage.timeline.map((entry, index) => (
          <li
            key={entry.year}
            className={index < heritage.timeline.length - 1 ? "rule-b" : ""}
          >
            <div className="shell grid gap-3 py-8 md:grid-cols-[9rem_1fr] md:gap-12 md:py-12">
              <p className="serif text-display-md leading-none">{entry.year}</p>
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

/* ------------------------------------------------------------ why robusta */

function WhyRobusta() {
  return (
    <section aria-labelledby="robusta" className="rule-b">
      {/* Centred, like every other head on the page. The grounds shot that used
          to hang beside this one moved up to the masthead row; the stats and the
          comparison table are the section's evidence and they carry it alone. */}
      <div className="shell flex flex-col items-center py-12 text-center md:py-16">
        <Eyebrow>{whyRobusta.eyebrow}</Eyebrow>
        <Headline id="robusta" className="mt-5 max-w-4xl">
          {whyRobusta.title}
        </Headline>
        <p className="body-mono mt-6 max-w-4xl text-pretty">{whyRobusta.body}</p>
      </div>

      {/* Cell borders rather than `divide-*`: the grid rewraps from 1 to 2 to 4
          columns, and `divide-x` alone leaves the wrapped rows unruled. */}
      <dl className="rule-t grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {whyRobusta.stats.map((stat) => (
          <div
            key={stat.value}
            className="border-b border-rule p-6 md:p-8 sm:[&:nth-child(odd)]:border-r lg:border-r lg:last:border-r-0"
          >
            <dt className="sr-only">{stat.label}</dt>
            <dd>
              <span className="serif block text-display-lg leading-none">
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

      {/* Lenis is told to keep its hands off the horizontal axis here, the same
          way the single-origin table does - otherwise the smooth-scroll
          provider swallows the sideways drag on a narrow screen. */}
      <div data-lenis-prevent-horizontal className="overflow-x-auto">
        <table className="w-full min-w-[36rem] border-collapse text-left">
          <caption className="sr-only">
            Arabica and Robusta compared, trait by trait
          </caption>
          <thead>
            <tr className="rule-b">
              <th scope="col" className="spec-mono px-4 py-4 uppercase md:px-6">
                Trait
              </th>
              <th scope="col" className="spec-mono px-4 py-4 uppercase md:px-6">
                Arabica
              </th>
              <th scope="col" className="spec-mono px-4 py-4 uppercase md:px-6">
                Robusta
              </th>
            </tr>
          </thead>
          <tbody>
            {whyRobusta.comparison.map((row) => (
              <tr key={row.trait} className="rule-b transition-colors hover:bg-wash">
                <th scope="row" className="spec-mono px-4 py-4 font-normal md:px-6">
                  {row.trait}
                </th>
                <td className="spec-mono px-4 py-4 md:px-6">{row.arabica}</td>
                {/* The estate's own bean carries the ink weight - this column is
                    the reason the table exists. */}
                <td className="ui-mono px-4 py-4 normal-case tracking-normal md:px-6">
                  {row.robusta}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------- farm to cup */

function FarmToCup() {
  return (
    <section aria-labelledby="farm-to-cup" className="rule-b">
      <div className="shell flex flex-col items-center py-14 text-center md:py-20">
        <Eyebrow>{farmToCup.eyebrow}</Eyebrow>
        <Headline id="farm-to-cup" className="mt-5">
          {farmToCup.title}
        </Headline>
      </div>

      {/* Five cells will not halve or third cleanly, so the grid goes straight
          from stacked to five-up rather than passing through a ragged row. */}
      <ol className="rule-t grid grid-cols-1 lg:grid-cols-5">
        {farmToCup.steps.map((step, index) => (
          <li
            key={step.title}
            className="border-b border-rule p-6 md:p-8 lg:border-r lg:last:border-r-0"
          >
            <span className="micro-mono block text-oxblood">
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

/**
 * The page's one dark band. `.on-dark` promotes the display and meta type to
 * amber and the body copy to paper - on coal, oxblood measures 1.6:1 and
 * disappears (DESIGN.md §1, Rule 2).
 */
function Sustainability() {
  return (
    <section aria-labelledby="sustainability" className="on-dark bg-coal">
      <div className="shell py-12 md:py-16">
        <Eyebrow>{sustainability.eyebrow}</Eyebrow>
        <Headline id="sustainability" className="mt-5 max-w-4xl">
          {/* Authored break: at display-xl a balanced break lands mid-phrase. */}
          {sustainability.title.map((line) => (
            <span key={line} className="block">
              {line}
            </span>
          ))}
        </Headline>
        <p className="body-mono mt-6 max-w-measure text-pretty">
          {sustainability.body}
        </p>

        <ul className="mt-12 grid grid-cols-1 gap-px border-t border-paper/20 sm:grid-cols-2 lg:grid-cols-4">
          {sustainability.pillars.map((pillar) => (
            <li key={pillar.title} className="border-b border-paper/20 py-8 pr-6">
              <h3 className="serif text-display-sm">{pillar.title}</h3>
              <p className="body-mono mt-3 text-pretty">{pillar.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ family */

function TheFamily() {
  return (
    <section aria-labelledby="family" className="rule-b">
      <div className="shell flex flex-col items-center py-14 text-center md:py-20">
        <Eyebrow>{family.eyebrow}</Eyebrow>
        <Headline id="family" className="mt-5">
          {family.title}
        </Headline>
        <p className="spec-mono mt-5">{family.strapline}</p>
      </div>

      <ul className="rule-t grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {family.members.map((member) => (
          <li
            key={member.name}
            className="border-b border-rule p-6 md:p-8 sm:[&:nth-child(odd)]:border-r lg:border-r lg:last:border-r-0"
          >
            {/* Standing in for a portrait we do not have: the generation
                ordinal set on the plate ground, which keeps the row's rhythm
                without inventing a face for a real person. */}
            <div className="plate flex aspect-[4/5] w-full items-center justify-center">
              <span aria-hidden className="serif text-display-xl leading-none">
                {member.generation.split(" ")[0]}
              </span>
            </div>
            <p className="micro-mono mt-5 text-oxblood">{member.generation}</p>
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

/* -------------------------------------------------------------- the letter */

function FamilyNote() {
  return (
    <section aria-labelledby="note" className="rule-b">
      <div className="shell flex flex-col items-center py-14 text-center md:py-20">
        <Eyebrow>{familyNote.eyebrow}</Eyebrow>
        <Headline id="note" size="lg" className="mt-5 max-w-4xl">
          {familyNote.title}
        </Headline>
        <div className="mt-6 max-w-measure space-y-5">
          {familyNote.body.map((paragraph) => (
            <p key={paragraph} className="body-mono text-pretty">
              {paragraph}
            </p>
          ))}
        </div>
        {/* A signature, so it is set in the display italic rather than the mono
            the rest of the meta uses. */}
        <p className="serif mt-10 text-display-sm italic">
          {familyNote.signature}
        </p>
        <p className="spec-mono mt-2">{familyNote.signatureRole}</p>
      </div>
    </section>
  );
}

/* --------------------------------------------------------------- shop cta */

function ShopCta() {
  return (
    <section aria-labelledby="shop" className="rule-b">
      <div className="grid grid-cols-1 items-center lg:grid-cols-2">
        {/* Image first in the source and on the left at width - the page has
            just finished the story, and the product is what the last band is
            handing over to. `lg:order-*` is not needed: the natural order is
            already the reading order we want. */}
        <div className="p-3">
          {/* The source is 2:3; a 4:5 plate crops the empty headroom above the
              pouch rather than the pouch itself. */}
          <div className="plate aspect-[4/5] w-full">
            <Image
              src={aboutImages.pouch.src}
              alt={aboutImages.pouch.alt}
              fill
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="object-cover"
            />
          </div>
        </div>

        <div className="flex flex-col items-start px-[var(--gutter)] py-12 md:py-16 lg:pl-10">
          <Eyebrow align="left">{aboutCta.eyebrow}</Eyebrow>
          <Headline id="shop" className="mt-5">
            {aboutCta.title.map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </Headline>
          <p className="body-mono mt-6 max-w-measure text-pretty">
            {aboutCta.body}
          </p>
          <Link href={aboutCta.href} className="btn-outline mt-8">
            {aboutCta.cta} <span aria-hidden>&rarr;</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
