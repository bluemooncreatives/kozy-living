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
import {
  CheckIcon,
  ChevronDownIcon,
  MinusIcon,
  PlusIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import clsx from "clsx";
import { useLenis } from "lenis/react";
import { useEffect, useRef, useState, useTransition } from "react";

/* ---------------------------------------------------------------------------
   The custom kit builder, as a guided flow. docs/custom-kit-builder.md.

   One step is open at a time. Choosing a fabric, a kolour or "No embroidery"
   is a complete answer, so the guide folds that step and opens the next one
   by itself; steps that take several choices (Kompanions and sizes, thread
   and letters) wait for Continue. A folded step shows what was chosen and
   opens again on a tap, so nothing is ever locked behind the guide.

   "Done" is valid AND answered. Fabric and embroidery are valid before the
   shopper has touched them (a default fabric, no thread), so validity alone
   would tick steps nobody has looked at. `confirmed` records the answer.
   Adding to the cart needs validity only: a shopper who skips ahead is not
   stopped, just told what is still worth a look.

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

type StepKey = "pieces" | "fabric" | "colour" | "embroidery";
type Target = StepKey | "review";

const MAX_KIT_QUANTITY = 10;

/** Long enough to see the tick land on the choice before the step folds. */
const ADVANCE_MS = 480;

/** How long a pulse is left on before its class is dropped. */
const FLASH_MS = 3000;

/** The photograph of a piece in a fabric: a variant's own image if it has one. */
function pieceImage(piece: KitPiece, fabricValue: string): ShopifyImage | null {
  const variant = piece.variants.find(
    (candidate) => isFabric(candidate, fabricValue) && candidate.image?.url,
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
    return channel <= 0.03928
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b! > 0.45;
}

function urlFor(kit: KitData, selection: KitSelection) {
  const params = new URLSearchParams();
  const chosen = selection.pieces
    .map((entry) => kit.pieces.find((piece) => piece.id === entry.id))
    .filter((piece): piece is KitPiece => Boolean(piece));
  if (chosen.length)
    params.set("pieces", chosen.map((piece) => piece.handle).join(","));
  for (const piece of chosen) {
    const sizes = selection.pieces.find(
      (entry) => entry.id === piece.id,
    )!.sizes;
    const values = piece.sizeOptions.map((option) => sizes[option.name] ?? "");
    if (values.some(Boolean)) params.set(piece.handle, values.join("|"));
  }
  const fabric = kit.fabrics.find(
    (candidate) => candidate.id === selection.fabricId,
  );
  if (fabric && !fabric.isDefault) params.set("fabric", fabric.handle);
  const colour = kit.colours.find(
    (candidate) => candidate.id === selection.colourId,
  );
  if (colour) params.set("colour", colour.handle);
  const thread = kit.threads.find(
    (candidate) => candidate.id === selection.threadId,
  );
  if (thread) params.set("thread", thread.handle);
  const query = params.toString();
  return `${window.location.pathname}${query ? `?${query}` : ""}`;
}

/** Sizes default to the only value there is; otherwise the shopper picks. */
function defaultSizes(piece: KitPiece) {
  return Object.fromEntries(
    piece.sizeOptions
      .filter((option) => option.values.length === 1)
      .map((option) => [option.name, option.values[0]!]),
  );
}

/**
 * Everything the page knows about a selection, as a pure function of it.
 * Pure on purpose: an auto-advance has to know where the guide goes NEXT,
 * which means reading the state a click is about to create, before React
 * has rendered it.
 */
function derive(kit: KitData, selection: KitSelection, initials: string) {
  const fabric =
    kit.fabrics.find((candidate) => candidate.id === selection.fabricId) ??
    kit.fabrics[0]!;
  const thread =
    kit.threads.find((candidate) => candidate.id === selection.threadId) ??
    null;
  // Colours are per fabric: Solid and Block printed each offer their own, and
  // a fabric with none simply skips the step.
  const colours = kit.colours.filter(
    (candidate) => candidate.fabricId === fabric.id,
  );
  const colour =
    colours.find((candidate) => candidate.id === selection.colourId) ?? null;

  // Each chosen piece resolved against the chosen fabric. A size picked in
  // Solid is kept across a switch to Block printed; when that size is sold
  // out in the new fabric the line says so rather than silently moving it.
  const lines = selection.pieces.flatMap((entry) => {
    const piece = kit.pieces.find((candidate) => candidate.id === entry.id);
    if (!piece) return [];
    const needsSize = piece.sizeOptions.find(
      (option) => !entry.sizes[option.name],
    );
    const variant = needsSize
      ? undefined
      : findKitVariant(piece, fabric.optionValue, entry.sizes);
    return [
      {
        piece,
        entry,
        variant,
        needsSize,
        soldOut: !needsSize && !variant?.availableForSale,
      },
    ];
  });
  const embroiderable = lines.filter(({ piece }) => piece.embroiderable);

  // A single fabric is a fact, not a question; no colours, no colour step;
  // no threads, no embroidery step.
  const steps: StepKey[] = ["pieces"];
  if (kit.fabrics.length > 1) steps.push("fabric");
  if (colours.length) steps.push("colour");
  if (kit.threads.length) steps.push("embroidery");

  // The same rules `addKitItem` enforces, filed under the step that answers
  // them, so the guide can send the shopper to exactly that step.
  const errors = copy.errors;
  const minPieces = Math.max(1, kit.minPieces);
  const missing = lines.find((line) => line.needsSize);
  const gone = lines.find((line) => line.soldOut);
  const stepIssue: Record<StepKey, string | null> = {
    pieces:
      lines.length < minPieces
        ? errors.tooFew(minPieces)
        : missing
          ? errors.size(missing.piece.title)
          : gone
            ? errors.soldOut(gone.piece.title)
            : null,
    fabric: null,
    colour: colours.length && !colour ? errors.colour : null,
    embroidery:
      thread && !initials
        ? errors.initials
        : thread && !embroiderable.length
          ? errors.noEmbroiderable
          : null,
  };
  const issueStep = steps.find((step) => stepIssue[step]) ?? null;

  return {
    fabric,
    thread,
    colours,
    colour,
    lines,
    embroiderable,
    steps,
    stepIssue,
    issue: issueStep
      ? { step: issueStep, message: stepIssue[issueStep]! }
      : null,
  };
}

type Derived = ReturnType<typeof derive>;

function isDone(d: Derived, confirmed: StepKey[], step: StepKey) {
  return !d.stepIssue[step] && confirmed.includes(step);
}

/** The first unfinished step after `from`, wrapping round; null when all are done. */
function nextAfter(d: Derived, confirmed: StepKey[], from: StepKey | null) {
  const todo = d.steps.filter((step) => !isDone(d, confirmed, step));
  const at = from ? d.steps.indexOf(from) : -1;
  return (
    d.steps.slice(at + 1).find((step) => todo.includes(step)) ?? todo[0] ?? null
  );
}

/** The steps a selection read from the URL counts as already answered. */
function resumed(kit: KitData, initial: KitSelection): StepKey[] {
  if (!initial.pieces.length) return [];
  const first = derive(kit, initial, "");
  return first.issue ? ["pieces"] : first.steps;
}

/** `--header-h` is a rem estimate until `HeaderHeight` writes the measured px. */
function headerOffset() {
  const root = document.documentElement;
  const raw = getComputedStyle(root).getPropertyValue("--header-h").trim();
  const value = parseFloat(raw);
  if (!Number.isFinite(value)) return 96;
  return raw.endsWith("rem")
    ? value * parseFloat(getComputedStyle(root).fontSize)
    : value;
}

const reducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ------------------------------------------------------------------ parts */

function StepPanel({
  step,
  index,
  total,
  title,
  summary,
  state,
  open,
  flash,
  onToggle,
  headRef,
  children,
}: {
  step: StepKey;
  index: number;
  total: number;
  title: string;
  summary: React.ReactNode;
  state: "todo" | "open" | "done";
  open: boolean;
  flash: boolean;
  onToggle: () => void;
  headRef: (node: HTMLButtonElement | null) => void;
  children: React.ReactNode;
}) {
  const bodyId = `kit-step-${step}-body`;
  return (
    <section
      id={`kit-${step}`}
      data-kit-step={step}
      data-open={open}
      aria-labelledby={`kit-step-${step}`}
      className={clsx("kit-step", flash && "kit-flash")}
    >
      <h2>
        <button
          ref={headRef}
          id={`kit-step-${step}`}
          type="button"
          aria-expanded={open}
          aria-controls={bodyId}
          onClick={onToggle}
          className="flex w-full items-center gap-4 rounded-plate p-5 text-left focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink sm:px-7 sm:py-6"
        >
          <span className="kit-step-num" data-state={state} aria-hidden>
            {state === "done" ? (
              <CheckIcon className="kit-pop h-4 w-4" />
            ) : (
              String(index + 1).padStart(2, "0")
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span className="micro-mono block text-muted">
              {copy.guide.stepOf(index + 1, total)}
            </span>
            <span className="serif mt-1 block text-display-sm">{title}</span>
            <span
              className={clsx(
                "mt-1 block truncate font-sans text-spec",
                state === "done" && !open
                  ? "font-medium text-ink"
                  : "text-muted",
              )}
            >
              {summary}
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-3">
            {state === "done" && !open ? (
              <span className="ui-mono hidden font-semibold underline decoration-ink/30 underline-offset-4 sm:inline">
                {copy.guide.change}
              </span>
            ) : null}
            <span className="flex h-9 w-9 items-center justify-center rounded-full border border-ink/15">
              <ChevronDownIcon className="kit-chevron h-4 w-4" aria-hidden />
            </span>
          </span>
        </button>
      </h2>
      {/* `inert` while folded: the content is still laid out (it animates
          open), but it must leave the tab order with the fold. */}
      <div id={bodyId} className="kit-step-body" inert={!open}>
        <div className="kit-step-clip">
          <div className="kit-step-inner px-5 pb-6 pt-1 sm:px-7 sm:pb-7">
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}

/** The foot of every step: where it stands, and the way on. */
function StepFooter({
  status,
  alert,
  ready,
  label,
  onContinue,
}: {
  status: React.ReactNode;
  alert: string | null;
  ready: boolean;
  label: string;
  onContinue: () => void;
}) {
  return (
    <div className="rule-t mt-7 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 pt-5">
      <div className="min-w-0 flex-1" aria-live="polite">
        {alert ? (
          <p role="alert" className="ui-mono font-semibold text-ink">
            {alert}
          </p>
        ) : (
          <p className="spec-mono">{status}</p>
        )}
      </div>
      <button
        type="button"
        onClick={onContinue}
        aria-disabled={!ready}
        className={clsx(
          "btn-solid gap-2 max-sm:w-full",
          ready ? "kit-pop" : "opacity-60",
        )}
      >
        {label} <span aria-hidden>&rarr;</span>
      </button>
    </div>
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
        "ui-mono inline-flex min-w-11 items-center justify-center rounded-chip border px-3.5 py-2 transition-colors duration-150",
        active
          ? "border-ink bg-ink font-semibold text-paper"
          : disabled
            ? "cursor-not-allowed border-ink/10 text-muted line-through opacity-50"
            : "border-ink/15 bg-card text-ink hover:border-ink",
      )}
    >
      {label}
    </button>
  );
}

function ThreadSwatch({
  thread,
  active,
  disabled,
  onClick,
}: {
  thread: KitThread;
  active: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      data-active={active}
      data-disabled={disabled}
      className="kit-choice group flex w-16 flex-col items-center gap-2 rounded-plate disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink"
    >
      <span
        className="kit-tile relative block h-12 w-12 overflow-hidden rounded-full"
        style={thread.colour ? { backgroundColor: thread.colour } : undefined}
      >
        {thread.swatch?.url ? (
          <Image
            src={thread.swatch.url}
            alt=""
            fill
            sizes="48px"
            className="object-cover"
          />
        ) : null}
        {active ? (
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="kit-pop flex h-6 w-6 items-center justify-center rounded-full bg-ink text-sage">
              <CheckIcon className="h-3.5 w-3.5" aria-hidden />
            </span>
          </span>
        ) : null}
      </span>
      <span
        className={clsx(
          "max-w-full truncate font-sans text-[0.72rem] leading-tight text-ink",
          active && "font-semibold",
        )}
      >
        {thread.title}
      </span>
    </button>
  );
}

/** The initials as they will be stitched, on a ground the thread shows on. */
function Monogram({
  thread,
  initials,
  className,
  size,
}: {
  thread: KitThread | null;
  initials: string;
  className?: string;
  size: string;
}) {
  return (
    <span
      className={clsx(
        "flex items-center justify-center",
        isPale(thread?.colour ?? null) ? "bg-ink" : "bg-tint",
        className,
      )}
    >
      <span
        // Re-keyed on each letter so every keystroke lands visibly.
        key={`${thread?.id}-${initials}`}
        className={clsx(
          "kit-pop font-sans font-semibold italic leading-none tracking-[0.12em]",
          size,
        )}
        style={{ color: thread?.colour ?? undefined }}
      >
        {initials || "—"}
      </span>
    </span>
  );
}

/* ---------------------------------------------------------------- builder */

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
  // A shared or reloaded kit that is complete arrives answered, every step
  // folded and the button ready. A partial one only vouches for its pieces:
  // a link with no thread is not the same as having chosen No embroidery,
  // so the guide still walks through the rest. A fresh visit starts at the top.
  const [confirmed, setConfirmed] = useState<StepKey[]>(() =>
    resumed(kit, initial),
  );
  const [open, setOpen] = useState<StepKey | null>(() =>
    initial.pieces.length
      ? nextAfter(derive(kit, initial, ""), resumed(kit, initial), null)
      : "pieces",
  );
  const [alert, setAlert] = useState<StepKey | null>(null);
  const [flash, setFlash] = useState<Target | null>(null);
  const [ctaVisible, setCtaVisible] = useState(false);
  const [result, setResult] = useState<CartActionState>(null);
  const [pending, startTransition] = useTransition();
  const {
    cart,
    isCartOpen,
    runCartMutation,
    reportStatus,
    openCart,
    flagAdded,
  } = useCart();
  const lenis = useLenis();

  const heads = useRef<Partial<Record<StepKey, HTMLButtonElement | null>>>({});
  const rootRef = useRef<HTMLDivElement>(null);
  const reviewRef = useRef<HTMLElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLButtonElement>(null);
  const initialsRef = useRef<HTMLInputElement>(null);
  const advanceTimer = useRef(0);
  const flashTimer = useRef(0);
  const focusTimer = useRef(0);

  const d = derive(kit, selection, initials);
  const {
    fabric,
    thread,
    colours,
    colour,
    lines,
    embroiderable,
    steps,
    stepIssue,
    issue,
  } = d;
  const openStep = open && steps.includes(open) ? open : null;
  const guideStep = nextAfter(d, confirmed, null);
  const doneCount = steps.filter((step) => isDone(d, confirmed, step)).length;

  useEffect(() => {
    window.history.replaceState(
      window.history.state,
      "",
      urlFor(kit, selection),
    );
  }, [kit, selection]);

  useEffect(
    () => () => {
      window.clearTimeout(advanceTimer.current);
      window.clearTimeout(flashTimer.current);
      window.clearTimeout(focusTimer.current);
    },
    [],
  );

  // The phone's action bar stands down while the review's own button is on
  // screen: two buttons saying the same thing is one too many.
  useEffect(() => {
    const node = actionsRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) =>
      setCtaVisible(Boolean(entry?.isIntersecting)),
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  /* ---------------------------------------------------------- navigation */

  /**
   * Scroll so `el` sits under the header. `shift` is how far `el` will move
   * up while this scroll runs - the open step above it folding - so the glide
   * aims at where the element ends up, not where it is now. Left alone when
   * it is already comfortably in view.
   */
  const glide = (el: HTMLElement, shift = 0, force = false) => {
    const offset = headerOffset() + 16;
    const landing = el.getBoundingClientRect().top - shift;
    if (!force && landing >= offset - 4 && landing <= window.innerHeight * 0.4)
      return;
    const y = Math.max(0, window.scrollY + landing - offset);
    const reduce = reducedMotion();
    // Through Lenis when it runs: a native scroll under it is overwritten
    // on its next frame.
    if (lenis) {
      lenis.scrollTo(y, {
        duration: reduce ? 0 : 1.1,
        immediate: reduce,
        easing: (t: number) => 1 - Math.pow(1 - t, 4),
      });
    } else {
      window.scrollTo({ top: y, behavior: reduce ? "auto" : "smooth" });
    }
  };

  /** Height the currently open step will give back above `el` as it folds. */
  const foldShift = (el: HTMLElement) => {
    const body = rootRef.current?.querySelector<HTMLElement>(
      '[data-kit-step][data-open="true"] .kit-step-body',
    );
    if (!body || body.parentElement?.contains(el)) return 0;
    return body.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING
      ? body.getBoundingClientRect().height
      : 0;
  };

  const pulse = (target: Target) => {
    window.clearTimeout(flashTimer.current);
    setFlash(null);
    // Two frames: the class has to be painted off before it goes back on,
    // or a second pulse on the same target never replays.
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        setFlash(target);
        flashTimer.current = window.setTimeout(() => setFlash(null), FLASH_MS);
      }),
    );
  };

  /**
   * Opens a step (or brings the review forward) and takes the page to it.
   * DOM-measured rather than state-read, because it also runs from a timer
   * scheduled a render ago.
   */
  const goTo = (target: Target) => {
    window.clearTimeout(advanceTimer.current);
    if (target === "review") {
      setOpen(null);
      pulse("review");
      const review = reviewRef.current;
      if (review && !window.matchMedia("(min-width: 1024px)").matches) {
        glide(review, foldShift(review), true);
      } else if (rootRef.current) {
        // Beside the steps the review is sticky, but with every step folded
        // the column shrinks under a page still scrolled for the open one.
        glide(rootRef.current);
      }
      ctaRef.current?.focus({ preventScroll: true });
      return;
    }
    const section = document.getElementById(`kit-${target}`);
    if (section) glide(section, foldShift(section));
    setOpen(target);
    // The control that was clicked has just been folded away (and made
    // inert), so focus follows the guide rather than falling to <body>.
    heads.current[target]?.focus({ preventScroll: true });
  };

  const toggle = (step: StepKey) => {
    window.clearTimeout(advanceTimer.current);
    if (openStep === step) setOpen(null);
    else goTo(step);
  };

  /** Records an answer and returns the confirmed list the click creates. */
  const confirm = (step: StepKey) => {
    const next = confirmed.includes(step) ? confirmed : [...confirmed, step];
    if (next !== confirmed) setConfirmed(next);
    return next;
  };

  /** After a complete answer: fold this step and open the next one, soon. */
  const advanceFrom = (
    step: StepKey,
    nextSelection: KitSelection,
    nextConfirmed: StepKey[],
    nextInitials = initials,
    delay = ADVANCE_MS,
  ) => {
    const after = derive(kit, nextSelection, nextInitials);
    const target: Target = nextAfter(after, nextConfirmed, step) ?? "review";
    window.clearTimeout(advanceTimer.current);
    advanceTimer.current = window.setTimeout(() => goTo(target), delay);
  };

  const update = (next: Partial<KitSelection>) => {
    window.clearTimeout(advanceTimer.current);
    setResult(null);
    setAlert(null);
    const merged = { ...selection, ...next };
    setSelection(merged);
    return merged;
  };

  /** Continue: go on if the step is answered, say what is missing if not. */
  const proceed = (step: StepKey) => {
    if (stepIssue[step]) {
      setAlert(step);
      pulse(step);
      return;
    }
    const nextConfirmed = confirm(step);
    window.clearTimeout(advanceTimer.current);
    goTo(nextAfter(d, nextConfirmed, step) ?? "review");
  };

  const continueLabel = (step: StepKey) => {
    const target = nextAfter(
      d,
      confirmed.includes(step) ? confirmed : [...confirmed, step],
      step,
    );
    return target
      ? copy.guide.next(copy.steps[target].short)
      : copy.guide.review;
  };

  /* ------------------------------------------------------------ choices */

  const togglePiece = (piece: KitPiece) => {
    const has = selection.pieces.some((entry) => entry.id === piece.id);
    update({
      pieces: has
        ? selection.pieces.filter((entry) => entry.id !== piece.id)
        : [...selection.pieces, { id: piece.id, sizes: defaultSizes(piece) }],
    });
    confirm("pieces");
  };

  const selectable = kit.pieces.filter((piece) =>
    pieceAvailable(piece, fabric.optionValue),
  );
  const allChosen =
    selectable.length > 0 &&
    selectable.every((piece) =>
      selection.pieces.some((entry) => entry.id === piece.id),
    );

  const chooseAll = () => {
    update({
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

  const setSize = (pieceId: string, option: string, value: string) =>
    update({
      pieces: selection.pieces.map((entry) =>
        entry.id === pieceId
          ? { ...entry, sizes: { ...entry.sizes, [option]: value } }
          : entry,
      ),
    });

  const chooseFabric = (fabricId: string) => {
    // A colour belongs to its fabric, so a switch clears it. Choosing the
    // fabric already chosen is still an answer - it is how the default is
    // accepted - so it confirms and moves on too.
    const next =
      fabricId === fabric.id ? selection : update({ fabricId, colourId: null });
    advanceFrom("fabric", next, confirm("fabric"));
  };

  const chooseColour = (colourId: string) => {
    const next = update({ colourId });
    advanceFrom("colour", next, confirm("colour"));
  };

  const chooseThread = (threadId: string | null) => {
    const next = update({ threadId });
    const nextConfirmed = confirm("embroidery");
    if (!threadId) {
      setInitials("");
      advanceFrom("embroidery", next, nextConfirmed, "");
      return;
    }
    // A thread asks for letters next. On a keyboard-and-mouse screen the
    // field takes focus once it has unfolded; on a phone that would throw up
    // the keyboard over the swatches before the shopper has seen the field.
    window.clearTimeout(focusTimer.current);
    if (window.matchMedia("(pointer: fine)").matches) {
      focusTimer.current = window.setTimeout(
        () => initialsRef.current?.focus({ preventScroll: true }),
        360,
      );
    }
  };

  /* ------------------------------------------------------------- prices */

  const priceInFabric = (fabricValue: string) =>
    lines.reduce((sum, { piece, entry }) => {
      const variant = findKitVariant(piece, fabricValue, entry.sizes);
      const price = variant
        ? Number(variant.price.amount)
        : fromPrice(piece, fabricValue);
      return sum + toMinor(price ?? 0);
    }, 0);

  const initialsMinor =
    thread && initials && kit.initialsPrice
      ? toMinor(kit.initialsPrice.amount)
      : 0;
  const unitMinor =
    lines.reduce(
      (sum, line) => sum + toMinor(line.variant?.price.amount ?? 0),
      0,
    ) + initialsMinor;
  const totalMinor = unitMinor * quantity;

  /* ------------------------------------------------------------- submit */

  const reset = () => {
    window.clearTimeout(advanceTimer.current);
    setSelection({
      pieces: [],
      fabricId:
        kit.fabrics.find((candidate) => candidate.isDefault)?.id ??
        kit.fabrics[0]!.id,
      colourId: null,
      threadId: null,
    });
    setInitials("");
    setQuantity(1);
    setConfirmed([]);
    setAlert(null);
    setResult(null);
    setOpen("pieces");
    const first = document.getElementById("kit-pieces");
    if (first) glide(first, 0, true);
    heads.current.pieces?.focus({ preventScroll: true });
  };

  const submit = () => {
    if (pending) return;
    if (issue) {
      setAlert(issue.step);
      goTo(issue.step);
      pulse(issue.step);
      return;
    }

    const request: KitRequest = {
      pieces: lines.map(({ entry }) => ({
        pieceId: entry.id,
        sizes: entry.sizes,
      })),
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
          outcome?.ok
            ? { ok: true, message: outcome.message || copy.added }
            : outcome,
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

  /* ------------------------------------------------------------- render */

  const stateOf = (step: StepKey): "todo" | "open" | "done" =>
    openStep === step ? "open" : isDone(d, confirmed, step) ? "done" : "todo";

  const alertFor = (step: StepKey) => (alert === step ? stepIssue[step] : null);

  const sizeLabel = (piece: KitPiece, sizes: Record<string, string>) =>
    piece.sizeOptions
      .map((option) => sizes[option.name])
      .filter(Boolean)
      .join(" · ");

  const summaries: Record<StepKey, React.ReactNode> = {
    pieces: lines.length
      ? lines
          .map(({ piece, entry }) =>
            [piece.title, sizeLabel(piece, entry.sizes)]
              .filter(Boolean)
              .join(" "),
          )
          .join(", ")
      : copy.steps.pieces.hint(kit.minPieces),
    fabric: confirmed.includes("fabric")
      ? fabric.title
      : copy.steps.fabric.hint,
    colour: colour ? colour.title : copy.steps.colour.hint(fabric.title),
    embroidery: thread
      ? [initials, thread.title].filter(Boolean).join(" · ")
      : confirmed.includes("embroidery")
        ? copy.steps.embroidery.plainSummary
        : copy.steps.embroidery.hint,
  };

  const titles: Record<StepKey, string> = {
    pieces: copy.steps.pieces.title,
    fabric: copy.steps.fabric.title,
    colour: copy.steps.colour.title,
    embroidery: copy.steps.embroidery.title,
  };

  // Every piece in the kit refuses initials: the threads have nothing to
  // stitch on. An empty kit is not that case - pieces may still come.
  const noneTakeInitials = lines.length > 0 && embroiderable.length === 0;
  const otherFabrics = kit.fabrics.filter(
    (candidate) =>
      candidate.id !== fabric.id &&
      kit.pieces.some((piece) => pieceAvailable(piece, candidate.optionValue)),
  );
  const cartShowing = (cart?.totalQuantity ?? 0) > 0;

  const hintFor = (step: StepKey) => {
    switch (step) {
      case "pieces":
        return copy.steps.pieces.hint(kit.minPieces);
      case "fabric":
        return copy.steps.fabric.hint;
      case "colour":
        return copy.steps.colour.hint(fabric.title);
      case "embroidery":
        return copy.steps.embroidery.hint;
    }
  };

  const panel = (step: StepKey, body: React.ReactNode) => (
    <StepPanel
      key={step}
      step={step}
      index={steps.indexOf(step)}
      total={steps.length}
      title={titles[step]}
      summary={openStep === step ? hintFor(step) : summaries[step]}
      state={stateOf(step)}
      open={openStep === step}
      flash={flash === step}
      onToggle={() => toggle(step)}
      headRef={(node) => {
        heads.current[step] = node;
      }}
    >
      {body}
    </StepPanel>
  );

  const bodies: Record<StepKey, React.ReactNode> = {
    /* ------------------------------------------------------------ pieces */
    pieces: (
      <>
        {kit.pieces.length > 1 && selectable.length > 1 ? (
          <button
            type="button"
            onClick={chooseAll}
            aria-pressed={allChosen}
            className={clsx("pill mb-5 gap-2", allChosen && "pill-active")}
          >
            {allChosen ? (
              <CheckIcon className="kit-pop h-4 w-4" aria-hidden />
            ) : null}
            {copy.fullKit}
            <span className="font-normal opacity-80">
              · {copy.fullKitHint(selectable.length)}
            </span>
          </button>
        ) : null}

        {!selectable.length ? (
          <div className="mb-5 rounded-plate bg-paper px-4 py-3.5">
            <p className="ui-mono font-semibold">
              {copy.steps.pieces.noneInFabric(fabric.title)}
            </p>
            {otherFabrics.length ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {otherFabrics.map((candidate) => (
                  <button
                    key={candidate.id}
                    type="button"
                    className="btn-outline"
                    onClick={() =>
                      update({ fabricId: candidate.id, colourId: null })
                    }
                  >
                    {copy.steps.pieces.tryFabric(candidate.title)}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {kit.pieces.map((piece, index) => {
            const active = selection.pieces.some(
              (entry) => entry.id === piece.id,
            );
            const available = pieceAvailable(piece, fabric.optionValue);
            const from = fromPrice(piece, fabric.optionValue);
            const image = pieceImage(piece, fabric.optionValue);

            return (
              <li
                key={piece.id}
                className="kit-choice relative"
                data-active={active}
                data-disabled={!available && !active}
              >
                <div className="kit-tile">
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
                <span className="kit-mark" aria-hidden>
                  {active ? (
                    <CheckIcon className="h-4 w-4" />
                  ) : (
                    <PlusIcon className="h-4 w-4" />
                  )}
                </span>
                <p className="ui-mono mt-3 font-semibold">{piece.title}</p>
                <p className="spec-mono mt-0.5">
                  {available ? (
                    from !== null ? (
                      <>
                        {copy.from}{" "}
                        <Price
                          amount={String(from)}
                          currencyCode={kit.currencyCode}
                        />
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

        {/* Sizes sit under the tiles as the pieces are picked, one row per
            piece, so the next question appears where the eye already is. A
            lone value ("Free Size") is shown too, already chosen - the owner
            wants every piece to state its size. */}
        {lines.some((line) => line.piece.sizeOptions.length) ? (
          <div className="mt-8">
            <p className="eyebrow text-muted">{copy.steps.pieces.sizes}</p>
            <ul className="mt-3 space-y-2.5">
              {lines
                .filter((line) => line.piece.sizeOptions.length)
                .map(({ piece, entry, needsSize, soldOut, variant }) => {
                  const image = pieceImage(piece, fabric.optionValue);
                  const flagged = alert === "pieces" && (needsSize || soldOut);
                  return (
                    <li
                      key={piece.id}
                      className={clsx(
                        "kit-in flex flex-wrap items-center gap-x-4 gap-y-3 rounded-plate bg-paper p-3 transition-shadow sm:flex-nowrap",
                        flagged && "ring-2 ring-ink",
                      )}
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <div className="w-14 shrink-0">
                          <Plate
                            src={image?.url}
                            alt=""
                            aspect="1/1"
                            sizes="56px"
                            placeholderText={piece.title}
                            objectFit="contain"
                            reveal={false}
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="ui-mono truncate font-semibold">
                            {piece.title}
                          </p>
                          <p
                            className={clsx(
                              "font-sans text-spec",
                              needsSize || soldOut
                                ? "font-semibold text-ink"
                                : "text-muted",
                            )}
                          >
                            {needsSize ? (
                              copy.chooseSize
                            ) : soldOut ? (
                              copy.unavailable
                            ) : variant ? (
                              <Price
                                amount={variant.price.amount}
                                currencyCode={variant.price.currencyCode}
                              />
                            ) : null}
                          </p>
                        </div>
                      </div>
                      <div className="flex w-full flex-col gap-2 sm:w-auto">
                        {piece.sizeOptions.map((option) => (
                          <fieldset key={option.name} className="min-w-0">
                            <legend
                              className={clsx(
                                "mb-1.5 font-sans text-micro uppercase tracking-micro text-muted",
                                piece.sizeOptions.length === 1 && "sr-only",
                              )}
                            >
                              {piece.title} · {option.name}
                            </legend>
                            <div className="flex flex-wrap gap-1.5">
                              {option.values.map((value) => {
                                const inStock = sizeAvailable(
                                  piece,
                                  fabric.optionValue,
                                  option.name,
                                  value,
                                );
                                const active =
                                  entry.sizes[option.name] === value;
                                return (
                                  <OptionPill
                                    key={value}
                                    label={value}
                                    active={active}
                                    // A chosen size stays clickable after a
                                    // fabric switch sold it out, so it can be
                                    // seen and changed.
                                    disabled={!inStock && !active}
                                    title={
                                      inStock
                                        ? undefined
                                        : `${value} (${copy.unavailable})`
                                    }
                                    onClick={() =>
                                      setSize(piece.id, option.name, value)
                                    }
                                  />
                                );
                              })}
                            </div>
                          </fieldset>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => togglePiece(piece)}
                        aria-label={`${piece.title}: ${copy.chosen}. Remove`}
                        className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-ink hover:text-paper sm:flex"
                      >
                        <XMarkIcon className="h-4 w-4" aria-hidden />
                      </button>
                    </li>
                  );
                })}
            </ul>
          </div>
        ) : null}

        <StepFooter
          status={
            lines.length ? (
              <>
                {copy.guide.chosenCount(lines.length)} ·{" "}
                <Price
                  amount={fromMinor(priceInFabric(fabric.optionValue))}
                  currencyCode={kit.currencyCode}
                />
              </>
            ) : (
              copy.steps.pieces.hint(kit.minPieces)
            )
          }
          alert={alertFor("pieces")}
          ready={!stepIssue.pieces}
          label={continueLabel("pieces")}
          onContinue={() => proceed("pieces")}
        />
      </>
    ),

    /* ------------------------------------------------------------ fabric */
    fabric: (
      <>
        <div className="grid gap-3 sm:grid-cols-2">
          {kit.fabrics.map((candidate) => {
            const active = candidate.id === fabric.id;
            const diff =
              lines.length && !active
                ? priceInFabric(candidate.optionValue) -
                  priceInFabric(fabric.optionValue)
                : 0;
            return (
              <button
                key={candidate.id}
                type="button"
                onClick={() => chooseFabric(candidate.id)}
                aria-pressed={active}
                data-active={active}
                className={clsx(
                  "kit-choice group relative flex items-stretch gap-4 rounded-plate border bg-paper p-3.5 text-left transition-[border-color,box-shadow] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink",
                  active
                    ? "border-ink ring-1 ring-ink"
                    : "border-ink/15 hover:border-ink",
                )}
              >
                <span className="relative block h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-tint">
                  {candidate.swatch?.url ? (
                    <Image
                      src={candidate.swatch.url}
                      alt=""
                      fill
                      sizes="96px"
                      className="object-cover transition-transform duration-700 ease-editorial group-hover:scale-105"
                    />
                  ) : null}
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="ui-mono block pr-9 font-semibold">
                    {candidate.title}
                  </span>
                  {candidate.description ? (
                    <span className="spec-mono mt-1 block">
                      {candidate.description}
                    </span>
                  ) : null}
                  {lines.length ? (
                    <span className="mt-auto flex flex-wrap items-baseline gap-x-2 pt-3">
                      <span className="spec-mono">
                        {copy.steps.fabric.kitPrice}
                      </span>
                      <Price
                        className="ui-mono font-semibold"
                        amount={fromMinor(priceInFabric(candidate.optionValue))}
                        currencyCode={kit.currencyCode}
                      />
                      {diff ? (
                        <span className="spec-mono">
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
                </span>
                <span className="kit-mark" aria-hidden>
                  {active ? (
                    <CheckIcon className="h-4 w-4" />
                  ) : (
                    <PlusIcon className="h-4 w-4" />
                  )}
                </span>
              </button>
            );
          })}
        </div>
        <StepFooter
          status={fabric.title}
          alert={null}
          ready
          label={continueLabel("fabric")}
          onContinue={() => proceed("fabric")}
        />
      </>
    ),

    /* ------------------------------------------------------------ colour */
    colour: (
      <>
        {/* The studio's own photographs of the cloth are the swatches: a
            flat dot cannot show a crinkled gauze. */}
        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-5">
          {colours.map((candidate, index) => {
            const active = candidate.id === colour?.id;
            return (
              <li
                key={candidate.id}
                className="kit-choice relative"
                data-active={active}
              >
                <div className="kit-tile">
                  {candidate.swatch?.url ? (
                    <Plate
                      src={candidate.swatch.url}
                      alt={candidate.swatch.altText || candidate.title}
                      aspect="2/3"
                      sizes="(min-width: 1024px) 9vw, (min-width: 640px) 16vw, 30vw"
                      placeholderText={candidate.title}
                      tone={(index % 4) as 0 | 1 | 2 | 3}
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
                <span className="kit-mark !h-7 !w-7" aria-hidden>
                  {active ? (
                    <CheckIcon className="h-3.5 w-3.5" />
                  ) : (
                    <PlusIcon className="h-3.5 w-3.5" />
                  )}
                </span>
                <p
                  className={clsx(
                    "ui-mono mt-2 text-center",
                    active && "font-semibold",
                  )}
                >
                  {candidate.title}
                </p>
                <button
                  type="button"
                  onClick={() => chooseColour(candidate.id)}
                  aria-pressed={active}
                  aria-label={candidate.title}
                  className="absolute inset-0 rounded-plate focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink"
                />
              </li>
            );
          })}
        </ul>
        <StepFooter
          status={colour ? colour.title : copy.steps.colour.hint(fabric.title)}
          alert={alertFor("colour")}
          ready={!stepIssue.colour}
          label={continueLabel("colour")}
          onContinue={() => proceed("colour")}
        />
      </>
    ),

    /* -------------------------------------------------------- embroidery */
    embroidery: (
      <>
        {noneTakeInitials ? (
          <p className="ui-mono mb-5 rounded-plate bg-paper px-4 py-3">
            {copy.steps.embroidery.noneTakeInitials}
          </p>
        ) : null}

        <fieldset>
          <legend className="eyebrow text-muted">
            {copy.steps.embroidery.threadLabel}
          </legend>
          <div className="mt-4 flex flex-wrap gap-x-2 gap-y-4">
            <button
              type="button"
              onClick={() => chooseThread(null)}
              aria-pressed={!thread}
              data-active={!thread}
              className="kit-choice group flex w-16 flex-col items-center gap-2 rounded-plate focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink"
            >
              <span className="kit-tile relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-paper">
                {/* A struck-through ring: plain cloth, nothing stitched. */}
                <span
                  aria-hidden
                  className="absolute h-px w-[140%] -rotate-45 bg-ink/40"
                />
                {!thread ? (
                  <span className="kit-pop relative flex h-6 w-6 items-center justify-center rounded-full bg-ink text-sage">
                    <CheckIcon className="h-3.5 w-3.5" aria-hidden />
                  </span>
                ) : null}
              </span>
              <span
                className={clsx(
                  "max-w-full text-center font-sans text-[0.72rem] leading-tight text-ink",
                  !thread && "font-semibold",
                )}
              >
                {copy.steps.embroidery.none}
              </span>
            </button>
            {kit.threads.map((candidate) => (
              <ThreadSwatch
                key={candidate.id}
                thread={candidate}
                active={candidate.id === thread?.id}
                disabled={noneTakeInitials && candidate.id !== thread?.id}
                onClick={() => chooseThread(candidate.id)}
              />
            ))}
          </div>
        </fieldset>

        {/* The letters unfold once there is a thread to stitch them in. */}
        <div
          className="grid transition-[grid-template-rows] duration-500 ease-editorial motion-reduce:transition-none"
          style={{ gridTemplateRows: thread ? "1fr" : "0fr" }}
          inert={!thread}
        >
          <div className="min-h-0 overflow-hidden">
            <div className="grid gap-5 px-1 pb-1 pt-7 sm:grid-cols-2 sm:items-stretch">
              <div>
                <label htmlFor="kit-initials" className="eyebrow text-muted">
                  {copy.steps.embroidery.label}
                </label>
                <div className="relative mt-2.5">
                  <input
                    ref={initialsRef}
                    id="kit-initials"
                    value={initials}
                    onChange={(event) => {
                      setResult(null);
                      setAlert(null);
                      setInitials(
                        cleanInitials(
                          event.target.value,
                          kit.initialsMaxLength,
                        ),
                      );
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        proceed("embroidery");
                      }
                    }}
                    placeholder={copy.steps.embroidery.placeholder}
                    autoCapitalize="characters"
                    autoComplete="off"
                    enterKeyHint="next"
                    spellCheck={false}
                    maxLength={kit.initialsMaxLength * 2}
                    aria-invalid={
                      alert === "embroidery" && Boolean(stepIssue.embroidery)
                    }
                    aria-describedby="kit-initials-help"
                    className="field-bare pr-16 uppercase tracking-[0.3em]"
                  />
                  <span className="spec-mono pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 tabular-nums">
                    {initials.length}/{kit.initialsMaxLength}
                  </span>
                </div>
                <p id="kit-initials-help" className="spec-mono mt-2">
                  {copy.steps.embroidery.lettersHint(kit.initialsMaxLength)}{" "}
                  {embroiderable.length
                    ? `${copy.embroideredOn}: ${embroiderable.map(({ piece }) => piece.title).join(", ")}.`
                    : null}
                </p>
              </div>
              <div className="flex flex-col">
                <p className="eyebrow text-muted">{copy.previewLabel}</p>
                <Monogram
                  thread={thread}
                  initials={initials}
                  className="mt-2.5 min-h-[7.5rem] flex-1 rounded-plate"
                  size="text-[3rem]"
                />
                <p className="spec-mono mt-2">{copy.previewNote}</p>
              </div>
            </div>
            {kit.embroideryNote || (initials && kit.policyNote) ? (
              <div className="space-y-1.5 px-1 pt-4">
                {kit.embroideryNote ? (
                  <p className="spec-mono">{kit.embroideryNote}</p>
                ) : null}
                {initials && kit.policyNote ? (
                  <p className="spec-mono">{kit.policyNote}</p>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        <StepFooter
          status={summaries.embroidery}
          alert={alertFor("embroidery")}
          ready={!stepIssue.embroidery}
          label={continueLabel("embroidery")}
          onContinue={() => proceed("embroidery")}
        />
      </>
    ),
  };

  /* -------------------------------------------------------- the review */

  const collageCount = lines.length > 4 ? "many" : String(lines.length);
  // With something still missing, the review points at the first unfinished
  // step - the same one each step's Continue leads to - which is never later
  // than the step holding the problem.
  const ctaTarget = issue ? (guideStep ?? issue.step) : null;
  const ctaLabel = pending
    ? copy.adding
    : ctaTarget
      ? copy.guide.next(copy.steps[ctaTarget].title)
      : copy.add;

  // The phone bar names the one next thing, the same way the review does.
  const bar: { label: string; action: () => void } = result?.ok
    ? { label: copy.guide.viewCart, action: openCart }
    : ctaTarget && openStep === ctaTarget
      ? { label: copy.guide.continue, action: () => proceed(ctaTarget) }
      : ctaTarget
        ? {
            label: copy.guide.next(copy.steps[ctaTarget].short),
            action: () => goTo(ctaTarget),
          }
        : guideStep && guideStep === openStep
          ? { label: copy.guide.continue, action: () => proceed(guideStep) }
          : guideStep
            ? {
                label: copy.guide.next(copy.steps[guideStep].short),
                action: () => goTo(guideStep),
              }
            : { label: copy.guide.review, action: () => goTo("review") };
  const barHidden = ctaVisible || isCartOpen;

  const progress = (compact: boolean) => (
    <ol
      className={clsx("grid", compact ? "gap-1" : "gap-2")}
      style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}
    >
      {steps.map((step) => (
        <li key={step} className="min-w-0">
          {compact ? (
            <span className="kit-seg" data-state={stateOf(step)} />
          ) : (
            <button
              type="button"
              onClick={() => goTo(step)}
              aria-label={copy.guide.jumpTo(copy.steps[step].short)}
              aria-current={openStep === step ? "step" : undefined}
              className="group block w-full rounded-sm pt-1 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              <span className="kit-seg" data-state={stateOf(step)} />
              <span
                className={clsx(
                  "mt-2 block truncate font-sans text-micro uppercase tracking-micro transition-colors group-hover:text-ink",
                  stateOf(step) === "todo" ? "text-muted" : "text-ink",
                )}
              >
                {copy.steps[step].short}
              </span>
            </button>
          )}
        </li>
      ))}
    </ol>
  );

  return (
    <div
      ref={rootRef}
      className="grid gap-6 lg:grid-cols-12 lg:items-start lg:gap-8"
    >
      <div
        aria-busy={pending}
        className={clsx(
          // At least as tall as the review beside it: a sticky element only
          // sticks while its grid row has room to travel in.
          "flex min-w-0 flex-col gap-4 transition-opacity lg:col-span-7 lg:min-h-[calc(100vh-var(--header-h)-2rem)]",
          pending && "pointer-events-none opacity-60",
        )}
      >
        {steps.map((step) => panel(step, bodies[step]))}
      </div>

      {/* ------------------------------------------------------- review */}
      <aside
        ref={reviewRef}
        id="kit-review"
        aria-labelledby="kit-review-title"
        // Beside the steps the review is a column capped at the screen: the
        // heading and the footer (quantity, total, the button) keep their
        // height, and only the flat lay and the lines between them give way.
        // The footer used to be pinned over a scrolling panel and covered the
        // quantity and total on a short laptop screen.
        className={clsx(
          "panel scroll-mt-[calc(var(--header-h)+1rem)] p-5 sm:p-7 lg:sticky lg:top-[calc(var(--header-h)+1rem)] lg:col-span-5 lg:flex lg:max-h-[calc(100vh-var(--header-h)-2rem)] lg:flex-col",
          flash === "review" && "kit-flash",
        )}
      >
        <div className="flex items-baseline justify-between gap-4">
          <h2 id="kit-review-title" className="serif text-display-sm">
            {copy.steps.review.title}
          </h2>
          <span className="spec-mono shrink-0 tabular-nums">
            {copy.guide.progress(doneCount, steps.length)}
          </span>
        </div>
        <div className="mt-4">{progress(false)}</div>

        {/* Lenis would otherwise take the wheel over this region and scroll
            the page, leaving the overflowing part unreachable. */}
        <div
          data-lenis-prevent=""
          className="kit-stage lg:-mx-2 lg:mt-5 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:px-2"
        >
          {/* The flat lay: the kit as it is being built. */}
          <div className="relative mt-5 lg:mt-0">
            <div className="kit-collage" data-count={collageCount}>
              {lines.length ? (
                lines.map(({ piece, entry }, index) => {
                  const image = pieceImage(piece, fabric.optionValue);
                  const size = sizeLabel(piece, entry.sizes);
                  return (
                    <div
                      key={piece.id}
                      className="kit-in relative"
                      style={{ "--i": index } as React.CSSProperties}
                    >
                      <Plate
                        src={image?.url}
                        alt={image?.altText || piece.title}
                        aspect={null}
                        className="h-full"
                        sizes="(min-width: 1024px) 18vw, 45vw"
                        placeholderText={piece.title}
                        objectFit="contain"
                        reveal={false}
                      />
                      <span className="pointer-events-none absolute bottom-2 left-2 max-w-[calc(100%-1rem)] truncate rounded-chip bg-paper/90 px-2.5 py-1 font-sans text-[0.7rem] font-semibold text-ink">
                        {piece.title}
                        {size ? ` · ${size}` : ""}
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="relative">
                  <Plate
                    aspect={null}
                    className="h-full"
                    placeholderText={copy.cartLabel}
                    reveal={false}
                  />
                  <div className="absolute inset-x-3 bottom-3 rounded-plate bg-paper/90 px-4 py-3 backdrop-blur-sm">
                    <p className="ui-mono font-semibold">
                      {copy.guide.emptyTitle}
                    </p>
                    <p className="spec-mono mt-0.5">{copy.guide.emptyBody}</p>
                  </div>
                </div>
              )}
            </div>

            {lines.length ? (
              <span className="pointer-events-none absolute left-4 top-4 inline-flex max-w-[calc(100%-6rem)] items-center gap-2 rounded-chip bg-paper/95 py-1 pl-1 pr-3 font-sans text-[0.72rem] font-semibold text-ink shadow-chip">
                <span className="relative block h-6 w-6 shrink-0 overflow-hidden rounded-full bg-tint">
                  {(colour?.swatch ?? fabric.swatch)?.url ? (
                    <Image
                      src={(colour?.swatch ?? fabric.swatch)!.url}
                      alt=""
                      fill
                      sizes="24px"
                      className="object-cover"
                    />
                  ) : colour?.colour ? (
                    <span
                      className="absolute inset-0"
                      style={{ backgroundColor: colour.colour }}
                    />
                  ) : null}
                </span>
                <span className="truncate">
                  {colour ? `${fabric.title} · ${colour.title}` : fabric.title}
                </span>
              </span>
            ) : null}

            {thread && initials ? (
              <Monogram
                thread={thread}
                initials={initials}
                className="absolute right-4 top-4 h-14 w-14 rounded-full shadow-lift"
                size="text-[1.1rem]"
              />
            ) : null}
          </div>

          {lines.length ? (
            <ul className="mt-4">
              {lines.map(({ piece, entry, variant, needsSize, soldOut }) => {
                const size = sizeLabel(piece, entry.sizes);
                return (
                  <li
                    key={piece.id}
                    className="rule-t flex items-baseline justify-between gap-4 py-2"
                  >
                    {/* Fabric and kolour are on the flat lay's chip, so a
                      line carries only what is its own. */}
                    <span className="min-w-0 truncate">
                      <span className="ui-mono">{piece.title}</span>
                      {size ? (
                        <span className="spec-mono"> · {size}</span>
                      ) : null}
                    </span>
                    <span
                      className={clsx(
                        "shrink-0 text-right font-sans text-spec",
                        needsSize || soldOut
                          ? "font-semibold text-ink"
                          : "text-muted",
                      )}
                    >
                      {needsSize ? (
                        copy.chooseSize
                      ) : soldOut ? (
                        copy.unavailable
                      ) : variant ? (
                        <Price
                          key={variant.id}
                          className="kit-tick"
                          amount={variant.price.amount}
                          currencyCode={variant.price.currencyCode}
                        />
                      ) : null}
                    </span>
                  </li>
                );
              })}
              {thread && initials ? (
                <li className="rule-t flex items-baseline justify-between gap-4 py-2">
                  <span className="min-w-0 truncate">
                    <span className="ui-mono">
                      {copy.orderLabels.initials} · {initials}
                    </span>
                    <span className="spec-mono"> · {thread.title}</span>
                  </span>
                  <span className="spec-mono shrink-0">
                    {kit.initialsPrice ? (
                      <Price
                        amount={kit.initialsPrice.amount}
                        currencyCode={kit.initialsPrice.currencyCode}
                      />
                    ) : (
                      copy.included
                    )}
                  </span>
                </li>
              ) : null}
            </ul>
          ) : null}
        </div>

        <div className="lg:shrink-0">
          <div className="rule-t mt-1 flex items-end justify-between gap-4 pt-4">
            <div>
              <span id="kit-quantity" className="spec-mono block uppercase">
                {copy.quantity}
              </span>
              <div
                role="group"
                aria-labelledby="kit-quantity"
                className="mt-2 flex items-center overflow-hidden rounded-full border border-ink/20"
              >
                <button
                  type="button"
                  aria-label="Fewer kits"
                  disabled={quantity <= 1}
                  onClick={() => {
                    setResult(null);
                    setQuantity((q) => Math.max(1, q - 1));
                  }}
                  className="flex h-9 w-9 items-center justify-center transition-colors hover:bg-ink hover:text-paper disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-ink"
                >
                  <MinusIcon className="h-3.5 w-3.5" />
                </button>
                <span
                  className="w-8 text-center font-sans text-spec tabular-nums"
                  aria-live="polite"
                >
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
                  className="flex h-9 w-9 items-center justify-center transition-colors hover:bg-ink hover:text-paper disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-ink"
                >
                  <PlusIcon className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <div className="text-right">
              <span className="spec-mono block uppercase">{copy.total}</span>
              <Price
                key={totalMinor}
                className="kit-tick serif mt-0.5 text-display-md"
                amount={fromMinor(totalMinor)}
                currencyCode={kit.currencyCode}
              />
              {quantity > 1 && unitMinor ? (
                <span className="spec-mono mt-1 block">
                  <Price
                    amount={fromMinor(unitMinor)}
                    currencyCode={kit.currencyCode}
                  />{" "}
                  {copy.guide.each}
                </span>
              ) : null}
            </div>
          </div>

          <div ref={actionsRef}>
            {result?.ok ? (
              <div
                role="status"
                className="kit-in mt-5 rounded-plate bg-sage-wash p-4"
              >
                <p className="ui-mono flex items-center gap-2.5 font-semibold">
                  <span className="kit-pop flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink text-sage">
                    <CheckIcon className="h-4 w-4" aria-hidden />
                  </span>
                  {result.message}
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-3">
                  <button
                    type="button"
                    onClick={openCart}
                    className="btn-solid"
                  >
                    {copy.guide.viewCart}
                  </button>
                  <button type="button" onClick={reset} className="link-arrow">
                    {copy.another} <span aria-hidden>&rarr;</span>
                  </button>
                </div>
              </div>
            ) : (
              <>
                <p
                  className="min-h-[1.25rem] pt-4 font-sans text-spec"
                  aria-live="polite"
                >
                  {issue ? (
                    <span className="text-muted">{issue.message}</span>
                  ) : (
                    <span className="kit-in inline-flex items-center gap-2 font-semibold text-ink">
                      <CheckIcon className="h-4 w-4" aria-hidden />
                      {copy.guide.ready}
                    </span>
                  )}
                </p>
                <button
                  ref={ctaRef}
                  type="button"
                  onClick={ctaTarget ? () => goTo(ctaTarget) : submit}
                  disabled={pending}
                  aria-busy={pending}
                  className={clsx(
                    "btn-solid mt-3 w-full gap-2",
                    pending && "cursor-wait opacity-70",
                    flash === "review" && "kit-flash",
                  )}
                >
                  {ctaLabel} <span aria-hidden>&rarr;</span>
                </button>
                {!issue && guideStep && !pending ? (
                  <button
                    type="button"
                    onClick={() => goTo(guideStep)}
                    className="link-arrow mt-3"
                  >
                    {copy.guide.beforeYouGo(copy.steps[guideStep].title)}{" "}
                    <span aria-hidden>&rarr;</span>
                  </button>
                ) : null}
                {result && !result.ok ? (
                  <p
                    role="alert"
                    className="ui-mono mt-3 rounded-plate border border-ink/20 px-4 py-2.5 text-center"
                  >
                    {result.message}
                  </p>
                ) : null}
              </>
            )}
          </div>
        </div>
      </aside>

      {/* -------------------------------------------- the phone's next step */}
      <div aria-hidden className="h-20 lg:hidden" />
      <div
        className="kit-bar"
        data-hidden={barHidden}
        {...(cartShowing ? { "data-above-cart-bar": "" } : {})}
        aria-hidden={barHidden}
        inert={barHidden}
      >
        <div className="flex h-[4.5rem] items-center gap-4 px-4">
          <div className="min-w-0 flex-1">
            {progress(true)}
            <p className="mt-2 flex items-baseline gap-2">
              {lines.length ? (
                <Price
                  key={totalMinor}
                  className="kit-tick serif text-display-sm"
                  amount={fromMinor(totalMinor)}
                  currencyCode={kit.currencyCode}
                />
              ) : null}
              <span className="spec-mono truncate">
                {copy.guide.progress(doneCount, steps.length)}
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={bar.action}
            className="btn-solid shrink-0 gap-2 px-5"
          >
            {bar.label} <span aria-hidden>&rarr;</span>
          </button>
        </div>
      </div>
    </div>
  );
}
