"use client";

import { addKitItem, type CartActionState } from "@/components/cart/actions";
import { fromMinor, toMinor } from "@/components/cart/cart-math";
import { useCart } from "@/components/cart/cart-context";
import Price from "@/components/price";
import Image from "@/components/ui/shop-image";
import Plate from "@/components/ui/plate";
import { cleanInitials } from "@/lib/shop/add-ons";
import {
  findKitVariant,
  fromPrice,
  isFabric,
  pieceAvailable,
  sizeAvailable,
  type KitRequest,
} from "@/lib/shop/kit";
import type {
  Image as ShopifyImage,
  KitBuilder as KitData,
  KitPiece,
  KitThread,
} from "@/lib/shopify/types";
import { kitBuilder as copy } from "@/lib/site";
import { CheckIcon, MinusIcon, PlusIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";
import { useEffect, useState, useTransition } from "react";

/* ---------------------------------------------------------------------------
   The custom kit builder: four steps of choices and a review panel that
   prices them as they are made. docs/custom-kit-builder.md.

   Every choice except the letters is mirrored into the URL with
   `replaceState`, so a built kit can be shared or reloaded; the page reads
   the same parameters on the server to render the first paint already
   chosen. The letters are personal text, not shareable state, and stay here.

   Prices shown are the variants' own, for display. `addKitItem` re-resolves
   every piece on the server and Shopify charges its own prices, so nothing
   computed here is ever trusted.
--------------------------------------------------------------------------- */

export type KitSelection = {
  /** Chosen pieces in the order they were picked, with their sizes. */
  pieces: { id: string; sizes: Record<string, string> }[];
  fabricId: string;
  /** The cloth colour, from the chosen fabric's own list. */
  colourId: string | null;
  threadId: string | null;
};

const MAX_KIT_QUANTITY = 10;

/** The photograph of a piece in a fabric: a variant's own image if it has one. */
function pieceImage(piece: KitPiece, fabricValue: string): ShopifyImage | null {
  const variant = piece.variants.find(
    (candidate) => isFabric(candidate, fabricValue) && candidate.image?.url
  );
  return variant?.image ?? piece.image ?? piece.images[0] ?? null;
}

/**
 * Pale threads (silver, cream) vanish on the oat plate, so their preview sits
 * on indigo instead. Relative luminance, the WCAG formula.
 */
function isPale(hex: string | null) {
  if (!hex) return false;
  const [r, g, b] = [1, 3, 5].map((at) => {
    const channel = parseInt(hex.slice(at, at + 2), 16) / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b! > 0.45;
}

function urlFor(kit: KitData, selection: KitSelection) {
  const params = new URLSearchParams();
  const chosen = selection.pieces
    .map((entry) => kit.pieces.find((piece) => piece.id === entry.id))
    .filter((piece): piece is KitPiece => Boolean(piece));
  if (chosen.length) params.set("pieces", chosen.map((piece) => piece.handle).join(","));
  for (const piece of chosen) {
    const sizes = selection.pieces.find((entry) => entry.id === piece.id)!.sizes;
    const values = piece.sizeOptions.map((option) => sizes[option.name] ?? "");
    if (values.some(Boolean)) params.set(piece.handle, values.join("|"));
  }
  const fabric = kit.fabrics.find((candidate) => candidate.id === selection.fabricId);
  if (fabric && !fabric.isDefault) params.set("fabric", fabric.handle);
  const colour = kit.colours.find((candidate) => candidate.id === selection.colourId);
  if (colour) params.set("colour", colour.handle);
  const thread = kit.threads.find((candidate) => candidate.id === selection.threadId);
  if (thread) params.set("thread", thread.handle);
  const query = params.toString();
  return `${window.location.pathname}${query ? `?${query}` : ""}`;
}

function StepShell({
  number,
  title,
  hint,
  done,
  children,
}: {
  number: number;
  title: string;
  hint?: string;
  done: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      aria-labelledby={`kit-step-${number}`}
      className="panel p-5 sm:p-7"
    >
      <header className="flex items-start gap-4">
        {/* Oat on indigo (9.30), sage on indigo (6.50) once done - sage type
            never sits on the ivory card. */}
        <span
          aria-hidden
          className={clsx(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-sans text-spec font-semibold",
            done ? "bg-ink text-sage" : "bg-ink text-oat"
          )}
        >
          {done ? <CheckIcon className="h-4 w-4" /> : number}
        </span>
        <div className="min-w-0">
          <p className="micro-mono text-muted">Step {number}</p>
          <h2 id={`kit-step-${number}`} className="serif mt-1 text-display-sm">
            {title}
          </h2>
          {hint ? <p className="spec-mono mt-1.5">{hint}</p> : null}
        </div>
      </header>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function OptionPill({
  label,
  active,
  disabled,
  onClick,
  title,
}: {
  label: string;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      title={title}
      className={clsx(
        "ui-mono inline-flex items-center rounded-chip border px-3.5 py-2 transition-colors duration-150",
        active
          ? "border-ink bg-ink font-semibold text-paper"
          : disabled
            ? "cursor-not-allowed border-ink/10 text-muted line-through opacity-50"
            : "border-ink/15 bg-card text-ink hover:border-ink"
      )}
    >
      {label}
    </button>
  );
}

function ThreadSwatch({
  thread,
  active,
  onClick,
}: {
  thread: KitThread;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={thread.title}
      title={thread.title}
      className={clsx(
        "relative h-11 w-11 shrink-0 overflow-hidden rounded-full border border-ink/15 transition-shadow",
        active
          ? "ring-2 ring-ink ring-offset-2 ring-offset-card"
          : "hover:ring-1 hover:ring-ink/40 hover:ring-offset-2 hover:ring-offset-card"
      )}
      style={thread.colour ? { backgroundColor: thread.colour } : undefined}
    >
      {thread.swatch?.url ? (
        <Image src={thread.swatch.url} alt="" fill sizes="44px" className="object-cover" />
      ) : null}
      {active ? (
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-ink text-paper">
            <CheckIcon className="h-3 w-3" />
          </span>
        </span>
      ) : null}
    </button>
  );
}

export default function KitBuilder({
  kit,
  initial,
}: {
  kit: KitData;
  initial: KitSelection;
}) {
  const [selection, setSelection] = useState<KitSelection>(initial);
  const [initials, setInitials] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [attempted, setAttempted] = useState(false);
  const [result, setResult] = useState<CartActionState>(null);
  const [pending, startTransition] = useTransition();
  const { runCartMutation, reportStatus, openCart, flagAdded } = useCart();

  const fabric =
    kit.fabrics.find((candidate) => candidate.id === selection.fabricId) ??
    kit.fabrics[0]!;
  const thread = kit.threads.find((candidate) => candidate.id === selection.threadId);
  // Colours are per fabric: Solid and Block printed each offer their own, and
  // a fabric with none simply skips the step.
  const colours = kit.colours.filter((candidate) => candidate.fabricId === fabric.id);
  const colour = colours.find((candidate) => candidate.id === selection.colourId);
  const chosen = selection.pieces
    .map((entry) => ({
      entry,
      piece: kit.pieces.find((piece) => piece.id === entry.id),
    }))
    .filter((row): row is { entry: (typeof row)["entry"]; piece: KitPiece } =>
      Boolean(row.piece)
    );

  useEffect(() => {
    window.history.replaceState(window.history.state, "", urlFor(kit, selection));
  }, [kit, selection]);

  const update = (next: Partial<KitSelection>) => {
    setResult(null);
    setSelection((current) => ({ ...current, ...next }));
  };

  /** Sizes default to the only value there is; otherwise the shopper picks. */
  const defaultSizes = (piece: KitPiece) =>
    Object.fromEntries(
      piece.sizeOptions
        .filter((option) => option.values.length === 1)
        .map((option) => [option.name, option.values[0]!])
    );

  const togglePiece = (piece: KitPiece) => {
    const has = selection.pieces.some((entry) => entry.id === piece.id);
    update({
      pieces: has
        ? selection.pieces.filter((entry) => entry.id !== piece.id)
        : [...selection.pieces, { id: piece.id, sizes: defaultSizes(piece) }],
    });
  };

  const selectable = kit.pieces.filter((piece) => pieceAvailable(piece, fabric.optionValue));
  const allChosen =
    selectable.length > 0 &&
    selectable.every((piece) => selection.pieces.some((entry) => entry.id === piece.id));

  const chooseAll = () =>
    update({
      pieces: allChosen
        ? []
        : kit.pieces
            .filter((piece) => selectable.includes(piece))
            .map(
              (piece) =>
                selection.pieces.find((entry) => entry.id === piece.id) ?? {
                  id: piece.id,
                  sizes: defaultSizes(piece),
                }
            ),
    });

  const setSize = (pieceId: string, option: string, value: string) =>
    update({
      pieces: selection.pieces.map((entry) =>
        entry.id === pieceId
          ? { ...entry, sizes: { ...entry.sizes, [option]: value } }
          : entry
      ),
    });

  // Each chosen piece resolved against the chosen fabric. A size picked in
  // Solid is kept across a switch to Block printed; when that size is sold
  // out in the new fabric the line says so rather than silently moving it.
  const lines = chosen.map(({ entry, piece }) => {
    const needsSize = piece.sizeOptions.find((option) => !entry.sizes[option.name]);
    const variant = needsSize ? undefined : findKitVariant(piece, fabric.optionValue, entry.sizes);
    return {
      piece,
      entry,
      variant,
      needsSize,
      soldOut: !needsSize && !variant?.availableForSale,
    };
  });

  const embroiderable = chosen.filter(({ piece }) => piece.embroiderable);
  const priceInFabric = (fabricValue: string) =>
    chosen.reduce((sum, { piece, entry }) => {
      const variant = findKitVariant(piece, fabricValue, entry.sizes);
      const price = variant ? Number(variant.price.amount) : fromPrice(piece, fabricValue);
      return sum + toMinor(price ?? 0);
    }, 0);

  const initialsMinor =
    thread && initials && kit.initialsPrice ? toMinor(kit.initialsPrice.amount) : 0;
  const unitMinor =
    lines.reduce((sum, line) => sum + toMinor(line.variant?.price.amount ?? 0), 0) +
    initialsMinor;
  const totalMinor = unitMinor * quantity;

  // The same rules `addKitItem` enforces, in the order a shopper meets them.
  const issue = (() => {
    const errors = copy.errors;
    if (chosen.length < kit.minPieces) return errors.tooFew(kit.minPieces);
    const missing = lines.find((line) => line.needsSize);
    if (missing) return errors.size(missing.piece.title);
    const gone = lines.find((line) => line.soldOut);
    if (gone) return errors.soldOut(gone.piece.title);
    if (colours.length && !colour) return errors.colour;
    if (thread && !initials) return errors.initials;
    if (thread && initials && !embroiderable.length) return errors.noEmbroiderable;
    return null;
  })();

  const reset = () => {
    setSelection({
      pieces: [],
      fabricId: kit.fabrics.find((candidate) => candidate.isDefault)?.id ?? kit.fabrics[0]!.id,
      colourId: null,
      threadId: null,
    });
    setInitials("");
    setQuantity(1);
    setAttempted(false);
    setResult(null);
    document.getElementById("kit-step-1")?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const submit = () => {
    setAttempted(true);
    if (issue || pending) return;

    const request: KitRequest = {
      pieces: chosen.map(({ entry }) => ({ pieceId: entry.id, sizes: entry.sizes })),
      fabricId: fabric.id,
      ...(colour ? { colourId: colour.id } : {}),
      ...(thread && initials ? { threadId: thread.id, initials } : {}),
      quantity,
    };

    setResult(null);
    startTransition(async () => {
      try {
        const outcome = await runCartMutation(() => addKitItem(null, request));
        setResult(
          outcome?.ok ? { ok: true, message: outcome.message || copy.added } : outcome
        );
        if (outcome?.ok) {
          reportStatus(outcome);
          openCart();
          flagAdded(kit.containerVariantId);
        }
      } catch (error) {
        console.error(error);
        setResult({ ok: false, message: copy.errors.failed });
      }
    });
  };

  const leadImage =
    (lines[0] && pieceImage(lines[0].piece, fabric.optionValue)) ??
    (kit.pieces[0] ? pieceImage(kit.pieces[0], fabric.optionValue) : null);
  const pale = isPale(thread?.colour ?? null);
  // Numbered as shown: the colour step exists only for a fabric that has
  // colours, and the embroidery steps only when there are threads.
  let counter = 0;
  const stepNo = {
    pieces: ++counter,
    fabric: ++counter,
    colour: colours.length ? ++counter : 0,
    thread: kit.threads.length ? ++counter : 0,
    initials: kit.threads.length ? ++counter : 0,
    review: ++counter,
  };
  const done = {
    pieces: chosen.length >= kit.minPieces && !lines.some((line) => line.needsSize || line.soldOut),
    // A fabric is always chosen (the default is preselected), and "No
    // embroidery" is a complete answer to the thread step.
    fabric: true,
    colour: Boolean(colour),
    thread: true,
    initials: !thread || Boolean(initials),
  };

  return (
    <div className="grid gap-6 lg:grid-cols-12 lg:items-start lg:gap-8">
      <div className="flex min-w-0 flex-col gap-5 lg:col-span-7">
        {/* ---------------------------------------------------- 1 · pieces */}
        <StepShell
          number={stepNo.pieces}
          title={copy.steps.pieces.title}
          hint={copy.steps.pieces.hint(kit.minPieces)}
          done={done.pieces}
        >
          {kit.pieces.length > 1 ? (
            <button
              type="button"
              onClick={chooseAll}
              aria-pressed={allChosen}
              className={clsx("pill mb-5 gap-2", allChosen && "pill-active")}
            >
              {allChosen ? <CheckIcon className="h-4 w-4" aria-hidden /> : null}
              {copy.fullKit}
              <span className="font-normal opacity-80">
                · {copy.fullKitHint(selectable.length)}
              </span>
            </button>
          ) : null}

          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {kit.pieces.map((piece, index) => {
              const active = selection.pieces.some((entry) => entry.id === piece.id);
              const available = pieceAvailable(piece, fabric.optionValue);
              const from = fromPrice(piece, fabric.optionValue);
              const image = pieceImage(piece, fabric.optionValue);

              return (
                <li key={piece.id} className="relative">
                  <div
                    className={clsx(
                      "rounded-plate transition-shadow",
                      // The contained shots sit on the same ivory as this
                      // panel, so an unchosen tile needs its own hairline to
                      // read as something to tap.
                      active
                        ? "ring-2 ring-ink ring-offset-2 ring-offset-card"
                        : "ring-1 ring-ink/10 hover:ring-ink/40",
                      !available && !active && "opacity-50"
                    )}
                  >
                    <Plate
                      src={image?.url}
                      alt={image?.altText || piece.title}
                      aspect="4/5"
                      sizes="(min-width: 1024px) 14vw, (min-width: 640px) 22vw, 45vw"
                      placeholderText={piece.title}
                      tone={(index % 4) as 0 | 1 | 2 | 3}
                      // Every tile fitted whole. The pieces' studio shots are
                      // mostly landscape (pouch 3:2, mask 2:1, slippers 3:2)
                      // and cover cut both ends off in a portrait tile; the
                      // robe (2:3) follows so the four sit as one set.
                      objectFit="contain"
                      reveal={false}
                    />
                  </div>
                  {active ? (
                    <span className="pointer-events-none absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-ink text-sage">
                      <CheckIcon className="h-4 w-4" aria-hidden />
                    </span>
                  ) : null}
                  <p className="ui-mono mt-3 font-semibold">{piece.title}</p>
                  <p className="spec-mono mt-0.5">
                    {available ? (
                      from !== null ? (
                        <>
                          {copy.from}{" "}
                          <Price amount={String(from)} currencyCode={kit.currencyCode} />
                        </>
                      ) : null
                    ) : (
                      copy.notInFabric
                    )}
                  </p>
                  {/* Over the whole tile, beside the plate rather than around
                      it: a <button> may not contain the plate's block markup. */}
                  <button
                    type="button"
                    onClick={() => togglePiece(piece)}
                    disabled={!available && !active}
                    aria-pressed={active}
                    aria-label={`${piece.title}: ${active ? copy.chosen : copy.choose}`}
                    className="absolute inset-0 rounded-plate focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink disabled:cursor-not-allowed"
                  />
                </li>
              );
            })}
          </ul>

          {/* A lone value ("Free Size") is already chosen by `defaultSizes`;
              a picker with one pill asks for a click that changes nothing. */}
          {lines.some((line) => line.piece.sizeOptions.some((option) => option.values.length > 1)) ? (
            <div className="rule-t mt-6 space-y-5 pt-5">
              {lines.map(({ piece, entry }) =>
                piece.sizeOptions.filter((option) => option.values.length > 1).map((option) => (
                  <fieldset key={`${piece.id}-${option.name}`}>
                    <legend className="eyebrow text-muted">
                      {piece.title} · {option.name}
                    </legend>
                    <div className="mt-2.5 flex flex-wrap gap-2">
                      {option.values.map((value) => {
                        const inStock = sizeAvailable(piece, fabric.optionValue, option.name, value);
                        const active = entry.sizes[option.name] === value;
                        return (
                          <OptionPill
                            key={value}
                            label={value}
                            active={active}
                            // A chosen size stays clickable after a fabric
                            // switch sold it out, so it can be seen and changed.
                            disabled={!inStock && !active}
                            title={inStock ? undefined : `${value} (${copy.unavailable})`}
                            onClick={() => setSize(piece.id, option.name, value)}
                          />
                        );
                      })}
                    </div>
                    {entry.sizes[option.name] &&
                    !sizeAvailable(piece, fabric.optionValue, option.name, entry.sizes[option.name]!) ? (
                      <p className="spec-mono mt-2">{copy.unavailable}</p>
                    ) : null}
                  </fieldset>
                ))
              )}
            </div>
          ) : null}
        </StepShell>

        {/* ---------------------------------------------------- 2 · fabric */}
        <StepShell
          number={stepNo.fabric}
          title={copy.steps.fabric.title}
          hint={copy.steps.fabric.hint}
          done={done.fabric}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            {kit.fabrics.map((candidate) => {
              const active = candidate.id === fabric.id;
              return (
                <button
                  key={candidate.id}
                  type="button"
                  onClick={() =>
                    // A colour belongs to its fabric, so a switch clears it.
                    candidate.id !== fabric.id &&
                    update({ fabricId: candidate.id, colourId: null })
                  }
                  aria-pressed={active}
                  className={clsx(
                    "flex items-start gap-4 rounded-plate border bg-paper p-3.5 text-left transition-colors",
                    active ? "border-ink ring-1 ring-ink" : "border-ink/15 hover:border-ink"
                  )}
                >
                  <span className="relative block h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-tint">
                    {candidate.swatch?.url ? (
                      <Image
                        src={candidate.swatch.url}
                        alt=""
                        fill
                        sizes="80px"
                        className="object-cover"
                      />
                    ) : null}
                    {active ? (
                      <span className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-ink text-sage">
                        <CheckIcon className="h-3.5 w-3.5" aria-hidden />
                      </span>
                    ) : null}
                  </span>
                  <span className="block min-w-0">
                    <span className="ui-mono block font-semibold">{candidate.title}</span>
                    {candidate.description ? (
                      <span className="spec-mono mt-1 block">{candidate.description}</span>
                    ) : null}
                    {chosen.length ? (
                      <span className="ui-mono mt-2 block">
                        <Price
                          amount={fromMinor(priceInFabric(candidate.optionValue))}
                          currencyCode={kit.currencyCode}
                        />
                      </span>
                    ) : null}
                  </span>
                </button>
              );
            })}
          </div>
        </StepShell>

        {/* ---------------------------------------------------- colour */}
        {colours.length ? (
          <StepShell
            number={stepNo.colour}
            title={copy.steps.colour.title}
            hint={copy.steps.colour.hint(fabric.title)}
            done={done.colour}
          >
            {/* The studio's own photographs of the cloth are the swatches:
                a flat dot cannot show a crinkled gauze. */}
            <ul className="grid grid-cols-3 gap-3 sm:grid-cols-5">
              {colours.map((candidate) => {
                const active = candidate.id === colour?.id;
                return (
                  <li key={candidate.id} className="relative">
                    <div
                      className={clsx(
                        "rounded-plate transition-shadow",
                        active
                          ? "ring-2 ring-ink ring-offset-2 ring-offset-card"
                          : "ring-1 ring-ink/10 hover:ring-ink/40"
                      )}
                    >
                      {candidate.swatch?.url ? (
                        <Plate
                          src={candidate.swatch.url}
                          alt={candidate.swatch.altText || candidate.title}
                          aspect="2/3"
                          sizes="(min-width: 1024px) 9vw, (min-width: 640px) 16vw, 30vw"
                          placeholderText={candidate.title}
                          reveal={false}
                        />
                      ) : (
                        <span
                          aria-hidden
                          className="block aspect-[2/3] rounded-plate"
                          style={{ backgroundColor: candidate.colour ?? undefined }}
                        />
                      )}
                    </div>
                    {active ? (
                      <span className="pointer-events-none absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-ink text-sage">
                        <CheckIcon className="h-3.5 w-3.5" aria-hidden />
                      </span>
                    ) : null}
                    <p className="ui-mono mt-2 text-center">{candidate.title}</p>
                    <button
                      type="button"
                      onClick={() => update({ colourId: candidate.id })}
                      aria-pressed={active}
                      aria-label={candidate.title}
                      className="absolute inset-0 rounded-plate focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink"
                    />
                  </li>
                );
              })}
            </ul>
            {attempted && !colour ? (
              <p role="alert" className="spec-mono mt-3">
                {copy.errors.colour}
              </p>
            ) : null}
          </StepShell>
        ) : null}

        {/* ---------------------------------------------------- thread */}
        {kit.threads.length ? (
          <StepShell
            number={stepNo.thread}
            title={copy.steps.thread.title}
            hint={copy.steps.thread.hint}
            done={done.thread}
          >
            <div className="flex flex-wrap items-center gap-3">
              {kit.threads.map((candidate) => (
                <ThreadSwatch
                  key={candidate.id}
                  thread={candidate}
                  active={candidate.id === selection.threadId}
                  onClick={() => update({ threadId: candidate.id })}
                />
              ))}
              <OptionPill
                label={copy.steps.thread.none}
                active={!selection.threadId}
                onClick={() => {
                  update({ threadId: null });
                  setInitials("");
                }}
              />
            </div>
            <p className="spec-mono mt-3" aria-live="polite">
              {thread ? thread.title : copy.steps.thread.none}
            </p>
          </StepShell>
        ) : null}

        {/* -------------------------------------------------- initials */}
        {kit.threads.length ? (
          <StepShell
            number={stepNo.initials}
            title={copy.steps.initials.title}
            hint={copy.steps.initials.hint(kit.initialsMaxLength)}
            done={done.initials}
          >
            <div className="grid gap-5 sm:grid-cols-2 sm:items-center">
              <div>
                <label htmlFor="kit-initials" className="eyebrow text-muted">
                  {copy.steps.initials.title}
                </label>
                <div className="relative mt-2.5">
                  <input
                    id="kit-initials"
                    value={initials}
                    disabled={!thread}
                    onChange={(event) => {
                      setResult(null);
                      setInitials(cleanInitials(event.target.value, kit.initialsMaxLength));
                    }}
                    placeholder={copy.steps.initials.placeholder}
                    autoCapitalize="characters"
                    autoComplete="off"
                    spellCheck={false}
                    maxLength={kit.initialsMaxLength * 2}
                    aria-invalid={attempted && Boolean(thread) && !initials}
                    aria-describedby="kit-initials-help"
                    className="field-bare pr-16 uppercase tracking-[0.3em] disabled:cursor-not-allowed disabled:opacity-50"
                  />
                  <span className="spec-mono pointer-events-none absolute right-5 top-1/2 -translate-y-1/2">
                    {initials.length}/{kit.initialsMaxLength}
                  </span>
                </div>
                <p id="kit-initials-help" className="spec-mono mt-2">
                  {thread
                    ? embroiderable.length
                      ? `${copy.embroideredOn}: ${embroiderable.map(({ piece }) => piece.title).join(", ")}`
                      : copy.errors.noEmbroiderable
                    : copy.steps.initials.skipped}
                </p>
              </div>

              <div>
                <p className="eyebrow text-muted">{copy.previewLabel}</p>
                <div
                  className={clsx(
                    "mt-2.5 flex h-28 items-center justify-center rounded-plate",
                    pale ? "bg-ink" : "bg-tint"
                  )}
                >
                  <span
                    className="font-sans text-[2.75rem] font-semibold italic leading-none tracking-[0.12em]"
                    style={{ color: thread?.colour ?? undefined }}
                  >
                    {thread && initials ? initials : "—"}
                  </span>
                </div>
                <p className="spec-mono mt-2">{copy.previewNote}</p>
              </div>
            </div>
          </StepShell>
        ) : null}
      </div>

      {/* ----------------------------------------------------- 5 · review */}
      <aside
        aria-labelledby="kit-review"
        className="panel p-5 sm:p-7 lg:sticky lg:top-28 lg:col-span-5"
      >
        <p className="micro-mono text-muted">Step {stepNo.review}</p>
        <h2 id="kit-review" className="serif mt-1 text-display-sm">
          {copy.steps.review.title}
        </h2>

        <div className="mt-5">
          <Plate
            src={leadImage?.url}
            alt={leadImage?.altText || kit.title}
            aspect="4/3"
            sizes="(min-width: 1024px) 34vw, 92vw"
            placeholderText={kit.title}
            reveal={false}
            tag={colour ? `${fabric.title} · ${colour.title}` : fabric.title}
          />
        </div>

        {lines.length ? (
          <ul className="rule-b mt-5">
            {lines.map(({ piece, entry, variant, needsSize, soldOut }) => (
              <li
                key={piece.id}
                className="rule-t flex items-baseline justify-between gap-4 py-3"
              >
                <span className="min-w-0">
                  <span className="ui-mono block">{piece.title}</span>
                  <span className="spec-mono block">
                    {[
                      fabric.title,
                      colour?.title,
                      ...piece.sizeOptions.map((option) => entry.sizes[option.name]),
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </span>
                <span className="spec-mono shrink-0 text-right">
                  {needsSize ? (
                    copy.chooseSize
                  ) : soldOut ? (
                    copy.unavailable
                  ) : variant ? (
                    <Price amount={variant.price.amount} currencyCode={variant.price.currencyCode} />
                  ) : null}
                </span>
              </li>
            ))}
            {thread && initials ? (
              <li className="rule-t flex items-baseline justify-between gap-4 py-3">
                <span className="min-w-0">
                  <span className="ui-mono block">
                    {copy.orderLabels.initials} · {initials}
                  </span>
                  <span className="spec-mono block">
                    {copy.orderLabels.thread}: {thread.title}
                  </span>
                </span>
                <span className="spec-mono shrink-0">
                  {kit.initialsPrice ? (
                    <Price amount={kit.initialsPrice.amount} currencyCode={kit.initialsPrice.currencyCode} />
                  ) : (
                    copy.included
                  )}
                </span>
              </li>
            ) : null}
          </ul>
        ) : null}

        <div className="mt-5 flex items-center justify-between gap-4">
          <span className="spec-mono uppercase">{copy.quantity}</span>
          <div className="flex items-center overflow-hidden rounded-full border border-ink/20">
            <button
              type="button"
              aria-label="Fewer kits"
              disabled={quantity <= 1}
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="flex h-9 w-9 items-center justify-center transition-colors hover:bg-ink hover:text-paper disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-ink"
            >
              <MinusIcon className="h-3.5 w-3.5" />
            </button>
            <span className="w-8 text-center font-sans text-spec" aria-live="polite">
              {quantity}
            </span>
            <button
              type="button"
              aria-label="More kits"
              disabled={quantity >= MAX_KIT_QUANTITY}
              onClick={() => setQuantity((q) => Math.min(MAX_KIT_QUANTITY, q + 1))}
              className="flex h-9 w-9 items-center justify-center transition-colors hover:bg-ink hover:text-paper disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-ink"
            >
              <PlusIcon className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="rule-t mt-5 flex items-baseline justify-between pt-4">
          <span className="spec-mono uppercase">{copy.total}</span>
          <Price
            className="serif text-display-sm"
            amount={fromMinor(totalMinor)}
            currencyCode={kit.currencyCode}
          />
        </div>

        <button
          type="button"
          onClick={submit}
          disabled={pending}
          aria-busy={pending}
          aria-disabled={Boolean(issue)}
          className={clsx(
            "btn-solid mt-5 w-full",
            (pending || issue) && "opacity-70",
            pending && "cursor-wait"
          )}
        >
          {pending ? copy.adding : copy.add} <span aria-hidden>&rarr;</span>
        </button>

        {(attempted && issue) || (result && !result.ok) ? (
          <p
            role="alert"
            className="spec-mono mt-3 rounded-full border border-ink/20 px-4 py-2 text-center"
          >
            {result && !result.ok ? result.message : issue}
          </p>
        ) : issue && chosen.length ? (
          <p className="spec-mono mt-3 text-center">{issue}</p>
        ) : null}

        {result?.ok ? (
          <div role="status" className="mt-4 rounded-plate bg-sage-wash px-4 py-3">
            <p className="ui-mono">{result.message}</p>
            <button type="button" onClick={reset} className="link-arrow mt-2">
              {copy.another}
            </button>
          </div>
        ) : null}

        {thread && initials && kit.policyNote ? (
          <p className="spec-mono mt-4">{kit.policyNote}</p>
        ) : null}
        {thread && kit.embroideryNote ? (
          <p className="spec-mono mt-1.5">{kit.embroideryNote}</p>
        ) : null}
      </aside>
    </div>
  );
}
