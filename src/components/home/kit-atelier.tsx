"use client";

import { addKitItem, type CartActionState } from "@/components/cart/actions";
import { fromMinor } from "@/components/cart/cart-math";
import { useCart } from "@/components/cart/cart-context";
import {
  ADVANCE_MS,
  MAX_KIT_QUANTITY,
  derive,
  emptySelection,
  headerOffset,
  isDone,
  isPale,
  kitQuery,
  kitRequest,
  nextAfter,
  pieceImage,
  priceInFabric,
  reducedMotion,
  togglePieceIn,
  unitPrice,
  withSize,
  defaultSizes,
  type KitSelection,
  type StepKey,
} from "@/components/kit-builder/kit-model";
import { TASK_ATTRIBUTE } from "@/components/newsletter/newsletter-state";
import Price from "@/components/price";
import Image from "@/components/ui/shop-image";
import { cleanInitials } from "@/lib/shop/add-ons";
import { fromPrice, pieceAvailable, sizeAvailable } from "@/lib/shop/kit";
import type { KitBuilder as KitData, KitPiece } from "@/lib/shopify/types";
import { kitAtelier as copy, kitBuilder as kitCopy } from "@/lib/site";
import {
  ArrowLeftIcon,
  CheckIcon,
  MinusIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import clsx from "clsx";
import { useLenis } from "lenis/react";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";

/* ---------------------------------------------------------------------------
   The kit atelier: the whole Kustom kit, built and sent to the cart from the
   homepage. CLAUDE.md §15.

   One question at a time on the right, the kit laid out on an ivory table on
   the left as it is answered. The table is not a picture of the answers; it
   is a second way to give them - every place on it is a button, so a
   shopper can build the whole set by touching the table.

   The rules are `kit-model.ts`, shared with `/kit-builder`, so a kit built
   here resolves, prices and validates exactly as one built there. What is
   different is the conversation:

   - Chapters are the model's steps plus a closing "Your kit". A fabric, a
     kolour or "No embroidery" is a complete answer and turns the page by
     itself; pieces (with sizes) and letters wait for Next.
   - Every primary button names where it goes, and it always goes to the
     first unfinished chapter, the same place on every surface.
   - Nothing is written to the URL: this is the homepage. "Open in the full
     builder" carries the kit across as `/kit-builder` parameters instead.
--------------------------------------------------------------------------- */

type Chapter = StepKey | "review";

/** Fixed order, for the direction a page turns in. */
const ORDER: Chapter[] = ["pieces", "fabric", "colour", "embroidery", "review"];

const pad = (n: number) => String(n).padStart(2, "0");

export default function KitAtelier({ kit }: { kit: KitData }) {
  const [selection, setSelection] = useState<KitSelection>(() =>
    emptySelection(kit),
  );
  const [initials, setInitials] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [confirmed, setConfirmed] = useState<StepKey[]>([]);
  const [chapter, setChapter] = useState<Chapter>("pieces");
  const [dir, setDir] = useState(1);
  const [alert, setAlert] = useState<StepKey | null>(null);
  const [result, setResult] = useState<CartActionState>(null);
  const [pending, startTransition] = useTransition();
  const { runCartMutation, reportStatus, openCart, flagAdded } = useCart();
  const lenis = useLenis();

  const stageRef = useRef<HTMLDivElement>(null);
  const paneRef = useRef<HTMLDivElement>(null);
  const questionRef = useRef<HTMLHeadingElement>(null);
  const lettersRef = useRef<HTMLInputElement>(null);
  const advanceTimer = useRef(0);
  const focusTimer = useRef(0);
  const moved = useRef(false);

  const d = derive(kit, selection, initials);
  const { fabric, thread, colours, colour, lines, embroiderable } = d;
  const chapters: Chapter[] = [...d.steps, "review"];
  // A chapter can vanish under the shopper (a fabric with no kolours): fall
  // to the first unfinished one rather than show a page that is not there.
  const current: Chapter = chapters.includes(chapter)
    ? chapter
    : (nextAfter(d, confirmed, null) ?? "review");
  const index = chapters.indexOf(current);
  const guide = nextAfter(d, confirmed, null);
  const doneCount = d.steps.filter((step) => isDone(d, confirmed, step)).length;
  const unitMinor = unitPrice(kit, d, initials);
  const totalMinor = unitMinor * quantity;
  const selectable = kit.pieces.filter((piece) =>
    pieceAvailable(piece, fabric.optionValue),
  );
  const allChosen =
    selectable.length > 0 &&
    selectable.every((piece) =>
      selection.pieces.some((entry) => entry.id === piece.id),
    );
  const noneTakeInitials = lines.length > 0 && embroiderable.length === 0;

  // While a kit is half built, the newsletter card waits (see TASK_ATTRIBUTE).
  const busy = lines.length > 0 && !result?.ok;
  useEffect(() => {
    if (!busy) return;
    const root = document.documentElement;
    root.setAttribute(TASK_ATTRIBUTE, "");
    return () => root.removeAttribute(TASK_ATTRIBUTE);
  }, [busy]);

  useEffect(
    () => () => {
      window.clearTimeout(advanceTimer.current);
      window.clearTimeout(focusTimer.current);
    },
    [],
  );

  // After a turn the shopper did ask for, the new question takes focus, so
  // a keyboard or a screen reader lands on it rather than on <body> (the
  // control that was pressed has just been unmounted with its page).
  useEffect(() => {
    if (!moved.current) return;
    moved.current = false;
    questionRef.current?.focus({ preventScroll: true });
  }, [current]);

  /* ---------------------------------------------------------- navigation */

  /**
   * Keeps the question in view. Beside the table (lg) the whole stage is
   * brought up if it has slipped under the header; on a phone the table
   * sits above the question, so it is the question that is brought up.
   */
  const bring = () => {
    const wide = window.matchMedia("(min-width: 1024px)").matches;
    const el = wide ? stageRef.current : paneRef.current;
    if (!el) return;
    const offset = headerOffset() + 16;
    const top = el.getBoundingClientRect().top;
    if (top >= offset - 4 && top <= window.innerHeight * (wide ? 0.5 : 0.3))
      return;
    const y = Math.max(0, window.scrollY + top - offset);
    const reduce = reducedMotion();
    if (lenis) {
      lenis.scrollTo(y, {
        duration: reduce ? 0 : 1,
        immediate: reduce,
        easing: (t: number) => 1 - Math.pow(1 - t, 4),
      });
    } else {
      window.scrollTo({ top: y, behavior: reduce ? "auto" : "smooth" });
    }
  };

  const go = (target: Chapter) => {
    window.clearTimeout(advanceTimer.current);
    setDir(ORDER.indexOf(target) >= ORDER.indexOf(current) ? 1 : -1);
    setChapter(target);
    setAlert(null);
    moved.current = true;
    bring();
  };

  const confirm = (step: StepKey) => {
    const next = confirmed.includes(step) ? confirmed : [...confirmed, step];
    if (next !== confirmed) setConfirmed(next);
    return next;
  };

  const update = (next: KitSelection) => {
    window.clearTimeout(advanceTimer.current);
    setResult(null);
    setAlert(null);
    setSelection(next);
    return next;
  };

  /** After a complete answer: turn to the next unfinished chapter, soon. */
  const advanceFrom = (
    step: StepKey,
    nextSelection: KitSelection,
    nextConfirmed: StepKey[],
    nextInitials = initials,
  ) => {
    const after = derive(kit, nextSelection, nextInitials);
    const target: Chapter = nextAfter(after, nextConfirmed, step) ?? "review";
    window.clearTimeout(advanceTimer.current);
    advanceTimer.current = window.setTimeout(() => go(target), ADVANCE_MS);
  };

  /** Next: go on if this chapter is answered, say what is missing if not. */
  const proceed = (step: StepKey) => {
    if (d.stepIssue[step]) {
      setAlert(step);
      return;
    }
    go(nextAfter(d, confirm(step), step) ?? "review");
  };

  /* ------------------------------------------------------------ choices */

  const togglePiece = (piece: KitPiece) => {
    const adding = !selection.pieces.some((entry) => entry.id === piece.id);
    update(togglePieceIn(selection, piece));
    confirm("pieces");
    // Laid on the table from another chapter, a piece that still needs a
    // size takes the shopper back to where sizes are chosen.
    if (
      adding &&
      current !== "pieces" &&
      piece.sizeOptions.some(
        (option) => !defaultSizes(piece)[option.name],
      )
    ) {
      go("pieces");
    }
  };

  const chooseAll = () => {
    update({
      ...selection,
      pieces: allChosen
        ? []
        : selectable.map(
            (piece) =>
              selection.pieces.find((entry) => entry.id === piece.id) ?? {
                id: piece.id,
                sizes: defaultSizes(piece),
              },
          ),
    });
    confirm("pieces");
  };

  const chooseFabric = (fabricId: string) => {
    // Choosing the fabric already chosen is still an answer - it is how the
    // default is accepted - so it turns the page too.
    const next =
      fabricId === fabric.id
        ? selection
        : update({ ...selection, fabricId, colourId: null });
    advanceFrom("fabric", next, confirm("fabric"));
  };

  const chooseColour = (colourId: string) => {
    const next = update({ ...selection, colourId });
    advanceFrom("colour", next, confirm("colour"));
  };

  const chooseThread = (threadId: string | null) => {
    const next = update({ ...selection, threadId });
    const nextConfirmed = confirm("embroidery");
    if (!threadId) {
      setInitials("");
      advanceFrom("embroidery", next, nextConfirmed, "");
      return;
    }
    // The letters field takes focus once it has unfolded - on a pointer
    // screen only; on a phone it would throw the keyboard over the threads.
    window.clearTimeout(focusTimer.current);
    if (window.matchMedia("(pointer: fine)").matches) {
      focusTimer.current = window.setTimeout(
        () => lettersRef.current?.focus({ preventScroll: true }),
        380,
      );
    }
  };

  /* ------------------------------------------------------------- submit */

  // With something still missing, the closing chapter's button points at
  // the first unfinished chapter - never later than the one with the problem.
  const ctaTarget = d.issue ? (guide ?? d.issue.step) : null;

  const submit = () => {
    if (pending) return;
    if (ctaTarget) {
      go(ctaTarget);
      return;
    }
    const request = kitRequest(d, initials, quantity);
    setResult(null);
    startTransition(async () => {
      try {
        const outcome = await runCartMutation(() => addKitItem(null, request));
        setResult(
          outcome?.ok
            ? { ok: true, message: outcome.message || kitCopy.added }
            : outcome,
        );
        if (outcome?.ok) {
          reportStatus(outcome);
          openCart();
          flagAdded(kit.containerVariantId);
        }
      } catch (error) {
        console.error(error);
        setResult({ ok: false, message: kitCopy.errors.failed });
      }
    });
  };

  const reset = () => {
    window.clearTimeout(advanceTimer.current);
    setSelection(emptySelection(kit));
    setInitials("");
    setQuantity(1);
    setConfirmed([]);
    setResult(null);
    go("pieces");
  };

  /* -------------------------------------------------------------- parts */

  const shortOf = (step: Chapter) =>
    step === "review" ? copy.reviewShort : kitCopy.steps[step].short;

  const sizeLabel = (piece: KitPiece, sizes: Record<string, string>) =>
    piece.sizeOptions
      .map((option) => sizes[option.name])
      .filter(Boolean)
      .join(" · ");

  const hints: Record<Chapter, string> = {
    pieces: copy.questions.pieces.hint(kit.minPieces),
    fabric: copy.questions.fabric.hint,
    colour: copy.questions.colour.hint(fabric.title),
    embroidery: copy.questions.embroidery.hint,
    review: copy.questions.review.hint,
  };

  const statusFor = (step: StepKey): React.ReactNode => {
    switch (step) {
      case "pieces":
        return lines.length ? (
          <>
            {kitCopy.guide.chosenCount(lines.length)} ·{" "}
            <Price
              amount={fromMinor(priceInFabric(d, fabric.optionValue))}
              currencyCode={kit.currencyCode}
            />
          </>
        ) : (
          copy.tableHint
        );
      case "fabric":
        return fabric.title;
      case "colour":
        // Nothing until a kolour is chosen: the hint above already asks.
        return colour?.title ?? null;
      case "embroidery":
        return thread
          ? [initials, thread.title].filter(Boolean).join(" · ")
          : kitCopy.steps.embroidery.plainSummary;
    }
  };

  const nextLabel = (step: StepKey) => {
    const target = nextAfter(
      d,
      confirmed.includes(step) ? confirmed : [...confirmed, step],
      step,
    );
    return kitCopy.guide.next(shortOf(target ?? "review"));
  };

  const backButton =
    index > 0 ? (
      <button
        type="button"
        onClick={() => go(chapters[index - 1]!)}
        className="btn gap-2 border border-ink/25 text-ink hover:border-ink hover:bg-ink hover:text-paper"
      >
        <ArrowLeftIcon className="h-4 w-4" aria-hidden />
        {copy.back}
      </button>
    ) : null;

  const footer = (step: StepKey) => {
    const message = alert === step ? d.stepIssue[step] : null;
    const ready = !d.stepIssue[step];
    return (
      <div className="mt-8 flex flex-wrap items-center justify-between gap-x-6 gap-y-4 border-t border-ink/10 pt-5">
        <div className="min-w-0 flex-1" aria-live="polite">
          {message ? (
            <p role="alert" className="font-sans text-spec font-semibold text-ink">
              {message}
            </p>
          ) : (
            <p className="font-sans text-spec text-muted">{statusFor(step)}</p>
          )}
        </div>
        <div className="flex items-center gap-3 max-sm:w-full">
          {backButton}
          <button
            type="button"
            onClick={() => proceed(step)}
            aria-disabled={!ready}
            className={clsx(
              "btn-solid gap-2 max-sm:flex-1",
              ready ? "kit-pop" : "opacity-60",
            )}
          >
            {nextLabel(step)} <span aria-hidden>&rarr;</span>
          </button>
        </div>
      </div>
    );
  };

  /* --------------------------------------------------------- chapters */

  const bodies: Record<Chapter, React.ReactNode> = {
    pieces: (
      <>
        {kit.pieces.length > 1 && selectable.length > 1 ? (
          <button
            type="button"
            onClick={chooseAll}
            aria-pressed={allChosen}
            className="atelier-chip mb-5 gap-2 px-4 py-2"
          >
            {allChosen ? <CheckIcon className="h-4 w-4" aria-hidden /> : null}
            {kitCopy.fullKit}
            <span className="font-normal opacity-80">
              · {kitCopy.fullKitHint(selectable.length)}
            </span>
          </button>
        ) : null}

        {!selectable.length ? (
          <p className="mb-5 rounded-plate border border-ink/15 px-4 py-3 font-sans text-spec font-semibold text-ink">
            {kitCopy.steps.pieces.noneInFabric(fabric.title)}
          </p>
        ) : null}

        <ul className="divide-y divide-ink/10 border-y border-ink/10">
          {kit.pieces.map((piece, i) => {
            const line = lines.find((row) => row.piece.id === piece.id);
            const available = pieceAvailable(piece, fabric.optionValue);
            const from = fromPrice(piece, fabric.optionValue);
            const image = pieceImage(piece, fabric.optionValue);
            const flagged =
              alert === "pieces" && line && (line.needsSize || line.soldOut);
            return (
              <li
                key={piece.id}
                className="atelier-in"
                style={{ "--i": i } as React.CSSProperties}
              >
                <button
                  type="button"
                  onClick={() => togglePiece(piece)}
                  disabled={!available && !line}
                  aria-pressed={Boolean(line)}
                  className="group flex w-full items-center gap-4 py-3.5 text-left disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <span className="relative block h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-card">
                    {image?.url ? (
                      <Image
                        src={image.url}
                        alt=""
                        fill
                        sizes="56px"
                        className="object-contain p-1 mix-blend-darken"
                      />
                    ) : null}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-sans text-ui font-semibold text-ink">
                      {piece.title}
                    </span>
                    <span className="block font-sans text-spec text-muted">
                      {available ? (
                        from !== null ? (
                          <>
                            {kitCopy.from}{" "}
                            <Price
                              amount={String(from)}
                              currencyCode={kit.currencyCode}
                            />
                          </>
                        ) : null
                      ) : (
                        kitCopy.notInFabric
                      )}
                    </span>
                  </span>
                  <span className="atelier-mark" aria-hidden>
                    {line ? (
                      <CheckIcon className="kit-pop h-4 w-4" />
                    ) : (
                      <PlusIcon className="h-4 w-4" />
                    )}
                  </span>
                </button>

                {line && piece.sizeOptions.length ? (
                  <div
                    className={clsx(
                      "atelier-in -mt-1 mb-4 ml-[4.5rem] space-y-3 rounded-xl",
                      flagged && "outline outline-2 outline-offset-4 outline-ink",
                    )}
                  >
                    {piece.sizeOptions.map((option) => (
                      <fieldset key={option.name}>
                        <legend
                          className={clsx(
                            "mb-2 font-sans text-micro uppercase tracking-micro",
                            line.needsSize ? "font-semibold text-ink" : "text-muted",
                          )}
                        >
                          {line.needsSize
                            ? kitCopy.chooseSize
                            : copy.sizeLabel(piece.title)}
                          {piece.sizeOptions.length > 1 ? ` · ${option.name}` : ""}
                        </legend>
                        <div className="flex flex-wrap gap-1.5">
                          {option.values.map((value) => {
                            const inStock = sizeAvailable(
                              piece,
                              fabric.optionValue,
                              option.name,
                              value,
                            );
                            const active = line.entry.sizes[option.name] === value;
                            return (
                              <button
                                key={value}
                                type="button"
                                aria-pressed={active}
                                // A chosen size stays clickable after a fabric
                                // switch sold it out, so it can be changed.
                                disabled={!inStock && !active}
                                title={
                                  inStock
                                    ? undefined
                                    : `${value} (${kitCopy.unavailable})`
                                }
                                onClick={() =>
                                  update(
                                    withSize(selection, piece.id, option.name, value),
                                  )
                                }
                                className="atelier-chip"
                              >
                                {value}
                              </button>
                            );
                          })}
                        </div>
                      </fieldset>
                    ))}
                    {line.soldOut ? (
                      <p className="font-sans text-spec font-semibold text-sage-deep">
                        {kitCopy.unavailable}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
        {footer("pieces")}
      </>
    ),

    fabric: (
      <>
        {/* Side by side even on a phone: a choice between two cloths is
            made by comparing them, and stacked the second was off screen. */}
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
          {kit.fabrics.map((candidate, i) => {
            const active = candidate.id === fabric.id;
            const priced = lines.length
              ? priceInFabric(d, candidate.optionValue)
              : 0;
            const diff =
              lines.length && !active
                ? priced - priceInFabric(d, fabric.optionValue)
                : 0;
            return (
              <button
                key={candidate.id}
                type="button"
                onClick={() => chooseFabric(candidate.id)}
                aria-pressed={active}
                className="atelier-option atelier-in flex flex-col p-2.5"
                style={{ "--i": i } as React.CSSProperties}
              >
                <span className="relative block aspect-[4/3] w-full overflow-hidden rounded-[1rem] bg-tint sm:aspect-[16/10]">
                  {candidate.swatch?.url ? (
                    <Image
                      src={candidate.swatch.url}
                      alt=""
                      fill
                      sizes="(min-width: 1024px) 18vw, (min-width: 640px) 40vw, 85vw"
                      className="object-cover transition-transform duration-700 ease-editorial group-hover:scale-105"
                    />
                  ) : null}
                </span>
                <span className="flex w-full items-start justify-between gap-3 px-1.5 pt-3">
                  <span className="min-w-0">
                    <span className="block font-sans text-ui font-semibold">
                      {candidate.title}
                    </span>
                    {candidate.description ? (
                      <span className="mt-1 line-clamp-2 hidden font-sans text-spec text-muted sm:block">
                        {candidate.description}
                      </span>
                    ) : null}
                  </span>
                  <span className="atelier-mark" aria-hidden>
                    {active ? (
                      <CheckIcon className="h-4 w-4" />
                    ) : (
                      <PlusIcon className="h-4 w-4" />
                    )}
                  </span>
                </span>
                {lines.length ? (
                  <span className="flex flex-wrap items-baseline gap-x-2 px-1.5 pb-1 pt-3 font-sans text-spec text-muted">
                    {kitCopy.steps.fabric.kitPrice}
                    <Price
                      className="font-semibold text-ink"
                      amount={fromMinor(priced)}
                      currencyCode={kit.currencyCode}
                    />
                    {diff ? (
                      <span>
                        ({diff > 0 ? "+" : "−"}
                        <Price
                          amount={fromMinor(Math.abs(diff))}
                          currencyCode={kit.currencyCode}
                        />
                        )
                      </span>
                    ) : null}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
        {footer("fabric")}
      </>
    ),

    colour: (
      <>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {colours.map((candidate, i) => {
            const active = candidate.id === colour?.id;
            return (
              <button
                key={candidate.id}
                type="button"
                onClick={() => chooseColour(candidate.id)}
                aria-pressed={active}
                className="atelier-option atelier-in p-2"
                style={{ "--i": i } as React.CSSProperties}
              >
                <span
                  className="relative block aspect-[3/4] w-full overflow-hidden rounded-[0.9rem] bg-tint"
                  style={
                    !candidate.swatch?.url && candidate.colour
                      ? { backgroundColor: candidate.colour }
                      : undefined
                  }
                >
                  {candidate.swatch?.url ? (
                    <Image
                      src={candidate.swatch.url}
                      alt=""
                      fill
                      sizes="(min-width: 1024px) 10vw, 28vw"
                      className="object-cover"
                    />
                  ) : null}
                  {active ? (
                    <span className="kit-pop absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-ink text-sage">
                      <CheckIcon className="h-3.5 w-3.5" aria-hidden />
                    </span>
                  ) : null}
                </span>
                <span className="mt-2 block truncate text-center font-sans text-spec font-semibold">
                  {candidate.title}
                </span>
              </button>
            );
          })}
        </div>
        {footer("colour")}
      </>
    ),

    embroidery: (
      <>
        {noneTakeInitials ? (
          <p className="mb-5 rounded-plate border border-ink/15 px-4 py-3 font-sans text-spec font-semibold text-ink">
            {kitCopy.steps.embroidery.noneTakeInitials}
          </p>
        ) : null}

        <div
          role="group"
          aria-label={kitCopy.steps.embroidery.threadLabel}
          className="flex flex-wrap gap-x-2 gap-y-4"
        >
          <button
            type="button"
            onClick={() => chooseThread(null)}
            aria-pressed={!thread}
            className="group flex w-16 flex-col items-center gap-2"
          >
            <span
              className={clsx(
                "relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border transition-shadow",
                !thread
                  ? "border-ink ring-2 ring-ink ring-offset-2 ring-offset-paper"
                  : "border-ink/20 group-hover:border-ink",
              )}
            >
              <span aria-hidden className="absolute h-px w-[140%] -rotate-45 bg-ink/40" />
            </span>
            <span
              className={clsx(
                "text-center font-sans text-[0.72rem] leading-tight",
                !thread ? "font-semibold text-ink" : "text-muted",
              )}
            >
              {kitCopy.steps.embroidery.none}
            </span>
          </button>
          {kit.threads.map((candidate) => {
            const active = candidate.id === thread?.id;
            const disabled = noneTakeInitials && !active;
            return (
              <button
                key={candidate.id}
                type="button"
                onClick={() => chooseThread(candidate.id)}
                aria-pressed={active}
                disabled={disabled}
                className="group flex w-16 flex-col items-center gap-2 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <span
                  className={clsx(
                    "relative block h-12 w-12 overflow-hidden rounded-full transition-shadow",
                    active
                      ? "ring-2 ring-ink ring-offset-2 ring-offset-paper"
                      : "ring-1 ring-ink/15 group-hover:ring-ink/50",
                  )}
                  style={
                    candidate.colour ? { backgroundColor: candidate.colour } : undefined
                  }
                >
                  {candidate.swatch?.url ? (
                    <Image
                      src={candidate.swatch.url}
                      alt=""
                      fill
                      sizes="48px"
                      className="object-cover"
                    />
                  ) : null}
                </span>
                <span
                  className={clsx(
                    "max-w-full truncate font-sans text-[0.72rem] leading-tight",
                    active ? "font-semibold text-ink" : "text-muted",
                  )}
                >
                  {candidate.title}
                </span>
              </button>
            );
          })}
        </div>

        {/* The letters unfold once there is a thread to stitch them in. */}
        <div
          className="grid transition-[grid-template-rows] duration-500 ease-editorial motion-reduce:transition-none"
          style={{ gridTemplateRows: thread ? "1fr" : "0fr" }}
          inert={!thread}
        >
          <div className="min-h-0 overflow-hidden">
            <div className="pt-8">
              <label
                htmlFor="atelier-initials"
                className="font-sans text-micro uppercase tracking-micro text-muted"
              >
                {copy.initialsLabel}
              </label>
              <div className="relative mt-2">
                <input
                  ref={lettersRef}
                  id="atelier-initials"
                  value={initials}
                  onChange={(event) => {
                    setResult(null);
                    setAlert(null);
                    setInitials(
                      cleanInitials(event.target.value, kit.initialsMaxLength),
                    );
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      proceed("embroidery");
                    }
                  }}
                  placeholder={copy.typeHere}
                  autoCapitalize="characters"
                  autoComplete="off"
                  enterKeyHint="next"
                  spellCheck={false}
                  maxLength={kit.initialsMaxLength * 2}
                  aria-invalid={alert === "embroidery" && Boolean(d.stepIssue.embroidery)}
                  aria-describedby="atelier-initials-help"
                  className="atelier-letters pr-14"
                />
                <span className="pointer-events-none absolute bottom-3 right-0 font-sans text-spec tabular-nums text-muted">
                  {initials.length}/{kit.initialsMaxLength}
                </span>
              </div>
              <p id="atelier-initials-help" className="mt-3 font-sans text-spec text-muted">
                {kitCopy.steps.embroidery.lettersHint(kit.initialsMaxLength)}{" "}
                {embroiderable.length
                  ? `${kitCopy.embroideredOn}: ${embroiderable
                      .map(({ piece }) => piece.title)
                      .join(", ")}.`
                  : null}
              </p>
              {kit.embroideryNote ? (
                <p className="mt-1.5 font-sans text-spec text-muted">
                  {kit.embroideryNote}
                </p>
              ) : null}
              {initials && kit.policyNote ? (
                <p className="mt-1.5 font-sans text-spec text-muted">
                  {kit.policyNote}
                </p>
              ) : null}
            </div>
          </div>
        </div>
        {footer("embroidery")}
      </>
    ),

    review: (
      <>
        {lines.length ? (
          <>
            <ul className="divide-y divide-ink/10 border-y border-ink/10">
              {lines.map(({ piece, entry, variant, needsSize, soldOut }, i) => {
                const size = sizeLabel(piece, entry.sizes);
                return (
                  <li
                    key={piece.id}
                    className="atelier-in flex items-baseline justify-between gap-4 py-3"
                    style={{ "--i": i } as React.CSSProperties}
                  >
                    <span className="min-w-0 truncate font-sans text-ui text-ink">
                      <span className="font-semibold">{piece.title}</span>
                      <span className="text-muted">
                        {[fabric.title, colour?.title, size]
                          .filter(Boolean)
                          .map((part) => ` · ${part}`)
                          .join("")}
                      </span>
                    </span>
                    <span
                      className={clsx(
                        "shrink-0 font-sans text-spec",
                        needsSize || soldOut ? "font-semibold text-ink" : "text-muted",
                      )}
                    >
                      {needsSize ? (
                        kitCopy.chooseSize
                      ) : soldOut ? (
                        kitCopy.unavailable
                      ) : variant ? (
                        <Price
                          amount={variant.price.amount}
                          currencyCode={variant.price.currencyCode}
                        />
                      ) : null}
                    </span>
                  </li>
                );
              })}
              {thread && initials ? (
                <li className="atelier-in flex items-baseline justify-between gap-4 py-3">
                  <span className="min-w-0 truncate font-sans text-ui text-ink">
                    <span className="font-semibold">
                      {kitCopy.orderLabels.initials} · {initials}
                    </span>
                    <span className="text-muted"> · {thread.title}</span>
                  </span>
                  <span className="shrink-0 font-sans text-spec text-muted">
                    {kit.initialsPrice ? (
                      <Price
                        amount={kit.initialsPrice.amount}
                        currencyCode={kit.initialsPrice.currencyCode}
                      />
                    ) : (
                      kitCopy.included
                    )}
                  </span>
                </li>
              ) : null}
            </ul>

            <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
              <div>
                <span
                  id="atelier-quantity"
                  className="block font-sans text-micro uppercase tracking-micro text-muted"
                >
                  {kitCopy.quantity}
                </span>
                <div
                  role="group"
                  aria-labelledby="atelier-quantity"
                  className="mt-2 flex items-center overflow-hidden rounded-full border border-ink/20 text-ink"
                >
                  <button
                    type="button"
                    aria-label="Fewer kits"
                    disabled={quantity <= 1}
                    onClick={() => {
                      setResult(null);
                      setQuantity((q) => Math.max(1, q - 1));
                    }}
                    className="flex h-10 w-10 items-center justify-center transition-colors hover:bg-ink hover:text-paper disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-ink"
                  >
                    <MinusIcon className="h-4 w-4" />
                  </button>
                  <span className="w-8 text-center font-sans text-ui tabular-nums" aria-live="polite">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    aria-label="More kits"
                    disabled={quantity >= MAX_KIT_QUANTITY}
                    onClick={() => {
                      setResult(null);
                      setQuantity((q) => Math.min(MAX_KIT_QUANTITY, q + 1));
                    }}
                    className="flex h-10 w-10 items-center justify-center transition-colors hover:bg-ink hover:text-paper disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-ink"
                  >
                    <PlusIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="text-right">
                <span className="block font-sans text-micro uppercase tracking-micro text-muted">
                  {kitCopy.total}
                </span>
                <Price
                  key={totalMinor}
                  className="kit-tick display-face mt-1 text-display-lg leading-none text-ink"
                  amount={fromMinor(totalMinor)}
                  currencyCode={kit.currencyCode}
                />
                {quantity > 1 && unitMinor ? (
                  <span className="mt-1 block font-sans text-spec text-muted">
                    <Price amount={fromMinor(unitMinor)} currencyCode={kit.currencyCode} />{" "}
                    {kitCopy.guide.each}
                  </span>
                ) : null}
              </div>
            </div>
          </>
        ) : (
          <p className="rounded-plate border border-dashed border-ink/20 px-5 py-6 font-sans text-ui text-muted">
            {copy.questions.review.empty}
          </p>
        )}

        {result?.ok ? (
          <div role="status" className="kit-in mt-8 rounded-plate bg-sage p-5 text-ink">
            <p className="flex items-center gap-3 font-sans text-ui font-semibold">
              <span className="kit-pop flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink text-sage">
                <CheckIcon className="h-4 w-4" aria-hidden />
              </span>
              {result.message}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-3">
              <button type="button" onClick={openCart} className="btn-solid">
                {kitCopy.guide.viewCart}
              </button>
              <button type="button" onClick={reset} className="link-arrow">
                {kitCopy.another} <span aria-hidden>&rarr;</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-8 border-t border-ink/10 pt-5">
            <p className="min-h-[1.25rem] font-sans text-spec" aria-live="polite">
              {d.issue ? (
                <span className="text-muted">{d.issue.message}</span>
              ) : (
                <span className="inline-flex items-center gap-2 font-semibold text-ink-deep">
                  <CheckIcon className="h-4 w-4" aria-hidden />
                  {kitCopy.guide.ready}
                </span>
              )}
            </p>
            <div className="mt-4 flex items-center gap-3">
              {backButton}
              <button
                type="button"
                onClick={submit}
                disabled={pending}
                aria-busy={pending}
                className={clsx(
                  "btn-solid flex-1 gap-2",
                  pending && "cursor-wait opacity-70",
                  !ctaTarget && !pending && "kit-pop",
                )}
              >
                {pending
                  ? kitCopy.adding
                  : ctaTarget
                    ? kitCopy.guide.next(shortOf(ctaTarget))
                    : kitCopy.add}{" "}
                <span aria-hidden>&rarr;</span>
              </button>
            </div>
            {!d.issue && guide && !pending ? (
              <button
                type="button"
                onClick={() => go(guide)}
                className="mt-4 inline-flex items-center gap-1.5 font-sans text-ui font-semibold text-ink transition-opacity hover:opacity-70"
              >
                {kitCopy.guide.beforeYouGo(kitCopy.steps[guide].title)}{" "}
                <span aria-hidden>&rarr;</span>
              </button>
            ) : null}
            {result && !result.ok ? (
              <p
                role="alert"
                className="mt-4 rounded-plate border border-ink/20 px-4 py-2.5 text-center font-sans text-spec font-semibold text-ink"
              >
                {result.message}
              </p>
            ) : null}
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2">
          {lines.length ? (
            <Link
              href={`/kit-builder${kitQuery(kit, selection) ? `?${kitQuery(kit, selection)}` : ""}`}
              className="font-sans text-spec font-semibold text-ink underline decoration-ink/30 underline-offset-4 hover:decoration-ink"
            >
              {copy.fullBuilder}
            </Link>
          ) : (
            <button type="button" onClick={() => go("pieces")} className="btn-solid">
              {copy.questions.review.start}
            </button>
          )}
          {lines.length && !result?.ok ? (
            <button
              type="button"
              onClick={reset}
              className="font-sans text-spec font-semibold text-muted underline decoration-ink/20 underline-offset-4 hover:text-ink"
            >
              {copy.startOver}
            </button>
          ) : null}
        </div>
      </>
    ),
  };

  /* -------------------------------------------------------------- table */

  const tableCount =
    kit.pieces.length > 4 ? "many" : String(kit.pieces.length);
  const sample = colour?.swatch ?? fabric.swatch;
  const pale = isPale(thread?.colour ?? null);

  return (
    <div>
      {/* Derived, not stored: it changes exactly when the chapter does, and
          a live region reads out a change, never its first content. */}
      <p className="sr-only" aria-live="polite">
        {copy.announce(index + 1, chapters.length, copy.questions[current].title)}
      </p>

      {/* The track: every chapter, where the shopper is, what is done. */}
      <nav aria-label={copy.eyebrow}>
        <ol className="flex items-start justify-between gap-2">
          {chapters.map((step, i) => {
            const done = step !== "review" && isDone(d, confirmed, step);
            const here = step === current;
            return (
              <li key={step} className="min-w-0">
                <button
                  type="button"
                  onClick={() => go(step)}
                  aria-current={here ? "step" : undefined}
                  aria-label={kitCopy.guide.jumpTo(shortOf(step))}
                  className="group flex items-center gap-2.5 rounded-full text-left"
                >
                  <span
                    className={clsx(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border font-sans text-[0.7rem] font-semibold tabular-nums transition-colors duration-300",
                      done
                        ? "border-sage bg-sage text-ink"
                        : here
                          ? "border-ink bg-ink text-paper"
                          : "border-ink/20 text-muted group-hover:border-ink",
                    )}
                  >
                    {done ? <CheckIcon className="kit-pop h-4 w-4" aria-hidden /> : pad(i + 1)}
                  </span>
                  <span
                    className={clsx(
                      "truncate font-sans text-spec font-semibold transition-colors",
                      here ? "text-ink" : "hidden text-muted group-hover:text-ink md:inline",
                    )}
                  >
                    {shortOf(step)}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
        <div className="atelier-track-line mt-4">
          <span
            className="atelier-track-fill"
            style={{ transform: `scaleX(${doneCount / Math.max(1, d.steps.length)})` }}
          />
        </div>
      </nav>

      <div
        ref={stageRef}
        aria-busy={pending}
        className={clsx(
          "mt-8 grid gap-8 transition-opacity lg:grid-cols-12 lg:gap-12",
          pending && "pointer-events-none opacity-70",
        )}
      >
        {/* ----------------------------------------------------- the table */}
        <div className="lg:col-span-6">
          <div className="lg:sticky lg:top-[calc(var(--header-h)+1.5rem)]">
            <div className="atelier-table">
              <div className="atelier-props">
                {/* The cloth: the kolour's own photo once chosen, the
                    fabric's before that. */}
                <div
                  key={`${fabric.id}-${colour?.id ?? "none"}`}
                  className="atelier-pin atelier-pin-in min-w-0"
                >
                  <span className="relative block h-10 w-10 shrink-0 overflow-hidden rounded-md bg-tint sm:h-12 sm:w-12">
                    {sample?.url ? (
                      <Image src={sample.url} alt="" fill sizes="48px" className="object-cover" />
                    ) : colour?.colour ? (
                      <span className="absolute inset-0" style={{ backgroundColor: colour.colour }} />
                    ) : null}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-sans text-[0.72rem] font-semibold leading-tight text-ink">
                      {fabric.title}
                    </span>
                    {colour ? (
                      <span className="block truncate font-sans text-[0.68rem] leading-tight text-muted">
                        {colour.title}
                      </span>
                    ) : null}
                  </span>
                </div>

                <div className="flex shrink-0 items-center gap-3 sm:gap-4">
                  {/* The hoop: the letters as they will be stitched. */}
                  {thread ? (
                    <div
                      key={thread.id}
                      className="atelier-hoop atelier-pin-in"
                      style={{ backgroundColor: pale ? "var(--ink)" : "var(--paper)" }}
                      aria-hidden
                    >
                      <span
                        key={initials}
                        className="kit-pop font-sans text-[1rem] font-semibold italic tracking-[0.08em] sm:text-[1.3rem]"
                        style={{ color: thread.colour ?? undefined }}
                      >
                        {initials || "—"}
                      </span>
                    </div>
                  ) : null}

                  {/* The tag: what the kit costs, knocked when it changes. */}
                  <div key={totalMinor} className="atelier-tag atelier-swing">
                    <span aria-hidden className="block h-px w-3 bg-ink/40" />
                    <div className="atelier-tag-card">
                      <span className="block font-sans text-[0.6rem] font-semibold uppercase tracking-micro text-muted">
                        {copy.tag}
                        {quantity > 1 ? ` × ${quantity}` : ""}
                      </span>
                      {/* A dash, not "₹0.00", while a piece still waits for its size. */}
                      {totalMinor > 0 ? (
                        <Price
                          className="display-face mt-0.5 block text-[1.15rem] leading-none text-ink sm:text-[1.35rem]"
                          amount={fromMinor(totalMinor)}
                          currencyCode={kit.currencyCode}
                        />
                      ) : (
                        <span className="display-face mt-0.5 block text-[1.15rem] leading-none text-ink sm:text-[1.35rem]">
                          —
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="atelier-slots" data-count={tableCount}>
                {kit.pieces.map((piece) => {
                  const line = lines.find((row) => row.piece.id === piece.id);
                  const available = pieceAvailable(piece, fabric.optionValue);
                  const image = pieceImage(piece, fabric.optionValue);
                  const size = line ? sizeLabel(piece, line.entry.sizes) : "";
                  return (
                    <button
                      key={piece.id}
                      type="button"
                      className="atelier-slot"
                      data-chosen={Boolean(line)}
                      onClick={() => togglePiece(piece)}
                      disabled={!available && !line}
                      aria-pressed={Boolean(line)}
                      aria-label={
                        line ? copy.removePiece(piece.title) : copy.addPiece(piece.title)
                      }
                    >
                      {image?.url ? (
                        line ? (
                          // Re-keyed by fabric: switching cloth lays every
                          // piece down again in its new photograph. The blend
                          // sits on the animated wrapper - the element that
                          // makes the stacking context - so the shots' white
                          // grounds resolve against the ivory, not against
                          // nothing.
                          <span
                            key={`${piece.id}-${fabric.id}`}
                            className="atelier-drop absolute inset-0 mix-blend-darken"
                          >
                            <Image
                              src={image.url}
                              alt=""
                              fill
                              sizes="(min-width: 1024px) 26vw, 60vw"
                              className="object-contain p-[5%] pb-[10%]"
                            />
                          </span>
                        ) : (
                          <span className="atelier-ghost absolute inset-0 mix-blend-darken">
                            <Image
                              src={image.url}
                              alt=""
                              fill
                              sizes="(min-width: 1024px) 26vw, 60vw"
                              className="object-contain p-[12%]"
                            />
                          </span>
                        )
                      ) : null}
                      {line ? (
                        <span className="atelier-label">
                          {piece.title}
                          {size ? ` · ${size}` : line.needsSize ? ` · ${kitCopy.chooseSize}` : ""}
                        </span>
                      ) : (
                        <span className="relative flex flex-col items-center gap-1.5 px-2 text-center">
                          <span className="flex h-9 w-9 items-center justify-center rounded-full border border-ink/30 bg-paper/80 text-ink">
                            <PlusIcon className="h-4 w-4" aria-hidden />
                          </span>
                          <span className="font-sans text-[0.72rem] font-semibold leading-tight text-ink/80">
                            {available ? piece.title : copy.notInFabric}
                          </span>
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* ------------------------------------------------ the conversation */}
        <div
          ref={paneRef}
          className="min-w-0 scroll-mt-[calc(var(--header-h)+1rem)] lg:col-span-6"
        >
          <div
            key={current}
            className="atelier-pane"
            style={{ "--dir": dir } as React.CSSProperties}
          >
            <div className="flex items-baseline gap-3">
              <span className="display-face text-display-lg leading-none text-sage-deep">
                {pad(index + 1)}
              </span>
              <span className="font-sans text-spec font-semibold text-muted">
                / {pad(chapters.length)} · {shortOf(current)}
              </span>
            </div>
            <h3
              ref={questionRef}
              tabIndex={-1}
              className="serif atelier-q mt-4 text-balance text-display-md text-ink outline-none"
            >
              {copy.questions[current].title}
            </h3>
            <p className="mt-2 max-w-prose font-sans text-body text-muted">
              {hints[current]}
            </p>
            <div className="mt-7">{bodies[current]}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
