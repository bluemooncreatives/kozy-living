"use client";

import {
  Dialog,
  DialogPanel,
  DialogTitle,
  Transition,
  TransitionChild,
} from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";
import { Fragment, useState, type ReactNode } from "react";
import Image from "@/components/ui/shop-image";
import {
  convertCell,
  sameSize,
  type ProductSizeChart,
  type RichTextNode,
  type SizeUnit,
} from "@/lib/shop/size-chart";
import { sizeGuide } from "@/lib/site";
import { useProduct } from "./product-context";

/**
 * "Size guide" beside the size picker, and the drawer it opens.
 *
 * The row for the size already picked is washed sage, read from the same
 * product state the picker writes, so choosing M on the panel and opening the
 * guide lands on M. Matching goes through `sameSize`, which is what lets a
 * product spelled `s-m` find the chart's `S-M`.
 */
export function SizeGuide({ sizeChart }: { sizeChart: ProductSizeChart }) {
  const [isOpen, setIsOpen] = useState(false);
  const { chart, optionName } = sizeChart;
  const [unit, setUnit] = useState<SizeUnit>(chart.unit);
  const { state } = useProduct();
  const picked = state[optionName.toLowerCase()];
  const converts = chart.columns.some((column) => column.unit);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="spec-mono leading-none text-ink underline decoration-ink/30 underline-offset-4 transition-colors hover:decoration-ink"
      >
        {sizeGuide.open}
      </button>

      <Transition show={isOpen}>
        <Dialog onClose={() => setIsOpen(false)} className="relative z-[1000]">
          <TransitionChild
            as={Fragment}
            enter="transition-opacity ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition-opacity ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-indigo/55" aria-hidden />
          </TransitionChild>

          <TransitionChild
            as={Fragment}
            enter="transition-transform ease-editorial duration-500"
            enterFrom="translate-x-full"
            enterTo="translate-x-0"
            leave="transition-transform ease-in duration-200"
            leaveFrom="translate-x-0"
            leaveTo="translate-x-full"
          >
            <DialogPanel
              data-lenis-prevent
              className="fixed inset-y-0 right-0 flex w-full max-w-xl flex-col bg-paper"
            >
              <div className="rule-b flex items-center justify-between gap-4 px-5 py-4 md:px-8">
                <div>
                  <DialogTitle className="eyebrow">{sizeGuide.title}</DialogTitle>
                  <p className="ui-mono mt-1 font-semibold">{chart.name}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  aria-label={sizeGuide.close}
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-5 pb-10 pt-6 md:px-8">
                {converts ? (
                  <div
                    role="group"
                    aria-label={sizeGuide.units}
                    className="mb-5 inline-flex rounded-chip border border-ink/15 bg-card p-1"
                  >
                    {(["in", "cm"] as const).map((option) => (
                      <button
                        key={option}
                        type="button"
                        aria-pressed={unit === option}
                        onClick={() => setUnit(option)}
                        className={clsx(
                          "ui-mono rounded-chip px-4 py-1.5 transition-colors",
                          unit === option ? "bg-ink font-semibold text-paper" : "text-ink hover:bg-wash"
                        )}
                      >
                        {sizeGuide.unitLabels[option]}
                      </button>
                    ))}
                  </div>
                ) : null}

                {/* Its own horizontal scroll: the bathrobe chart runs to eight
                    columns, which no phone holds. The size column stays pinned
                    so a row can still be read once it has scrolled. */}
                <div className="overflow-x-auto rounded-plate border border-rule bg-card">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="rule-b">
                        {chart.columns.map((column, i) => (
                          <th
                            key={i}
                            scope="col"
                            className={clsx(
                              "spec-mono whitespace-nowrap px-4 py-3 font-semibold",
                              i === 0 && "sticky left-0 bg-card"
                            )}
                          >
                            {column.label}
                            {column.unit ? (
                              <span className="text-muted"> ({unit})</span>
                            ) : null}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {chart.rows.map((row) => {
                        const isPicked = Boolean(picked) && sameSize(row.size, picked!);
                        return (
                          <tr
                            key={row.size}
                            className={clsx(
                              "border-t border-rule",
                              isPicked && "bg-sage-wash"
                            )}
                          >
                            {row.cells.map((cell, i) =>
                              i === 0 ? (
                                <th
                                  key={i}
                                  scope="row"
                                  className={clsx(
                                    "ui-mono sticky left-0 whitespace-nowrap px-4 py-3 font-semibold",
                                    isPicked ? "bg-sage-wash" : "bg-card"
                                  )}
                                >
                                  {cell}
                                  {isPicked ? (
                                    <span className="micro-mono ml-2 text-sage-deep">
                                      {sizeGuide.yourSize}
                                    </span>
                                  ) : null}
                                </th>
                              ) : (
                                <td key={i} className="ui-mono whitespace-nowrap px-4 py-3">
                                  {convertCell(cell, chart.columns[i]?.unit ?? null, unit)}
                                </td>
                              )
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {chart.fitNote ? (
                  <p className="body-mono mt-5 text-pretty">{chart.fitNote}</p>
                ) : null}

                {chart.howToMeasure || chart.guideImage ? (
                  <section className="rule-t mt-8 pt-6">
                    <h3 className="eyebrow">{sizeGuide.howToMeasure}</h3>
                    {chart.howToMeasure ? (
                      <div className="body-mono mt-3 space-y-3">
                        <RichText node={chart.howToMeasure} />
                      </div>
                    ) : null}
                    {chart.guideImage ? (
                      <div className="relative mt-5 aspect-[4/3] overflow-hidden rounded-plate bg-card">
                        <Image
                          src={chart.guideImage.url}
                          alt={chart.guideImage.altText ?? ""}
                          fill
                          sizes="(min-width: 640px) 36rem, 100vw"
                          className="object-contain"
                        />
                      </div>
                    ) : null}
                  </section>
                ) : null}
              </div>
            </DialogPanel>
          </TransitionChild>
        </Dialog>
      </Transition>
    </>
  );
}

/**
 * Shopify's rich text JSON, rendered as plain elements. Only the node types
 * the Admin editor produces; anything unknown renders its children, so a new
 * node type degrades to text rather than vanishing.
 */
function RichText({ node }: { node: RichTextNode }): ReactNode {
  const children = node.children?.map((child, i) => <RichText key={i} node={child} />);

  switch (node.type) {
    case "root":
      return <>{children}</>;
    case "paragraph":
      return <p className="text-pretty">{children}</p>;
    case "heading":
      return <p className="ui-mono font-semibold">{children}</p>;
    case "list":
      return node.listType === "ordered" ? (
        <ol className="list-decimal space-y-1.5 pl-5">{children}</ol>
      ) : (
        <ul className="list-disc space-y-1.5 pl-5">{children}</ul>
      );
    case "list-item":
      return <li className="text-pretty">{children}</li>;
    case "link":
      return (
        <a href={node.url} className="underline underline-offset-4">
          {children}
        </a>
      );
    case "text": {
      let text: ReactNode = node.value ?? "";
      if (node.bold) text = <strong className="font-semibold">{text}</strong>;
      if (node.italic) text = <em>{text}</em>;
      return text;
    }
    default:
      return <>{children}</>;
  }
}
