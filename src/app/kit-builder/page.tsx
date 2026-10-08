import type { Metadata } from "next";
import KitBuilder, { type KitSelection } from "@/components/kit-builder/kit-builder";
import Breadcrumb from "@/components/ui/breadcrumb";
import CircledWord from "@/components/ui/circled-word";
import { Eyebrow, Headline } from "@/components/ui/section";
import { sameOption } from "@/lib/shop/kit";
import { getKitBuilder } from "@/lib/shopify";
import type { KitBuilder as KitData } from "@/lib/shopify/types";
import { kitBuilder as copy } from "@/lib/site";
import Link from "next/link";

/* ---------------------------------------------------------------------------
   /kit-builder

   A designed route standing over the Shopify page of the same handle
   (`pages/kit-builder`, whose body is empty), the way `/b2b-enquiries` does.
   Everything the builder offers - pieces, fabrics, threads, prices, the
   minimum kit - is merchant data in Admin, read by `getKitBuilder()`. See
   docs/custom-kit-builder.md.

   The choices in the URL (`?pieces=bathrobe,slippers&bathrobe=M&fabric=...`)
   are read here so a shared or reloaded kit paints already built. Anything
   that does not match the live kit is dropped, never a 404.
--------------------------------------------------------------------------- */

export const metadata: Metadata = {
  title: copy.eyebrow,
  description: copy.intro,
  openGraph: { type: "website" },
};

type Search = { [key: string]: string | string[] | undefined };

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function initialSelection(kit: KitData, search: Search): KitSelection {
  const fabric =
    kit.fabrics.find((candidate) => candidate.handle === one(search.fabric)) ??
    kit.fabrics.find((candidate) => candidate.isDefault) ??
    kit.fabrics[0]!;
  const thread = kit.threads.find((candidate) => candidate.handle === one(search.thread));

  const handles = (one(search.pieces) ?? "").split(",").filter(Boolean);
  const pieces = kit.pieces
    .filter((piece) => handles.includes(piece.handle))
    .sort((a, b) => handles.indexOf(a.handle) - handles.indexOf(b.handle))
    .map((piece) => {
      const values = (one(search[piece.handle]) ?? "").split("|");
      const sizes: Record<string, string> = {};
      piece.sizeOptions.forEach((option, index) => {
        const value = option.values.find((candidate) => sameOption(candidate, values[index]));
        if (value) sizes[option.name] = value;
        else if (option.values.length === 1) sizes[option.name] = option.values[0]!;
      });
      return { id: piece.id, sizes };
    });

  // Only a colour of the chosen fabric survives a shared link.
  const colour = kit.colours.find(
    (candidate) => candidate.handle === one(search.colour) && candidate.fabricId === fabric.id
  );

  return {
    pieces,
    fabricId: fabric.id,
    colourId: colour?.id ?? null,
    threadId: thread?.id ?? null,
  };
}

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

export default async function KitBuilderPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const [kit, search] = await Promise.all([getKitBuilder(), searchParams]);

  return (
    <>
      <Breadcrumb current={copy.eyebrow} />

      <section aria-labelledby="kit-builder" className="shell pb-16 md:pb-24">
        <div data-reveal-group className="max-w-3xl py-4 lg:py-8">
          <Eyebrow align="left">{copy.eyebrow}</Eyebrow>
          <Headline as="h1" id="kit-builder" className="mt-4">
            {ringWord(copy.title, copy.circled)}
          </Headline>
          <p className="body-mono mt-5 max-w-measure text-pretty">{copy.intro}</p>
        </div>

        <div className="mt-6 md:mt-8">
          {kit ? (
            <KitBuilder kit={kit} initial={initialSelection(kit, search)} />
          ) : (
            <div className="panel mx-auto max-w-xl p-10 text-center">
              <p className="serif text-display-md">{copy.resting.title}</p>
              <p className="body-mono mt-3">{copy.resting.body}</p>
              <Link href="/search" className="btn-solid mt-8">
                {copy.resting.cta}
              </Link>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
