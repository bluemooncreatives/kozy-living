/**
 * Size charts - the `size_chart` metaobjects the merchant edits in Admin,
 * referenced by `custom.size_chart` on a product or on a collection.
 *
 * Pure and React-free: the server picks the chart, the drawer converts units,
 * and both must agree on what "the same size" means.
 *
 * The table is a plain multi-line text field rather than JSON, because the
 * people typing it are copying from a printed chart:
 *
 *   Size, Chest (in), Waist (in), Ideal height
 *   S-M, 34-40, 28-32, 5'0" - 5'4"
 *
 * A heading ending in `(in)` or `(cm)` marks a MEASUREMENT column, the only
 * kind the cm/in toggle converts. The slipper chart is why this cannot be
 * per-chart: its US / UK / EU columns are size systems, and converting
 * "35-36" from inches would print nonsense beside the foot length that
 * really is in inches.
 */

export const SIZE_CHART_METAOBJECT_TYPE = "size_chart";

export type SizeUnit = "cm" | "in";

export type SizeChartColumn = {
  label: string;
  /** Set only on measurement columns; everything else renders verbatim. */
  unit: SizeUnit | null;
};

export type SizeChartRow = {
  /** The first cell - what the product's size option has to match. */
  size: string;
  cells: string[];
};

/** Shopify rich text, as stored: a tree of typed nodes. */
export type RichTextNode = {
  type: string;
  value?: string;
  bold?: boolean;
  italic?: boolean;
  url?: string;
  level?: number;
  listType?: "ordered" | "unordered";
  children?: RichTextNode[];
};

export type SizeChart = {
  handle: string;
  name: string;
  /** The unit the drawer opens in. */
  unit: SizeUnit;
  columns: SizeChartColumn[];
  rows: SizeChartRow[];
  fitNote: string | null;
  howToMeasure: RichTextNode | null;
  guideImage: { url: string; altText: string | null; width: number; height: number } | null;
};

/** What the product page receives: the chart and the option it sizes. */
export type ProductSizeChart = {
  chart: SizeChart;
  /** The option the guide sits under ("Size", "Slipper size", "His Size"…). */
  optionName: string;
};

const UNIT_HEADING = /\s*\((cm|in)\)\s*$/i;

/**
 * Parses the Measurements field. Returns null for anything that is not a
 * table - one line, one column - so a half-typed entry hides the guide rather
 * than rendering a broken one.
 */
export function parseMeasurements(
  text: string | null | undefined
): Pick<SizeChart, "columns" | "rows"> | null {
  const lines = (text ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split(",").map((cell) => cell.replace(/\s+/g, " ").trim()));

  const [head, ...body] = lines;
  if (!head || head.length < 2 || !body.length) return null;

  const columns = head.map((heading) => {
    const unit = heading.match(UNIT_HEADING)?.[1]?.toLowerCase() as SizeUnit | undefined;
    return { label: heading.replace(UNIT_HEADING, ""), unit: unit ?? null };
  });

  const rows = body
    .filter((cells) => cells[0])
    .map((cells) => {
      // A short row is padded and a long one cut, so one stray comma costs a
      // cell rather than shifting every value after it under the wrong heading.
      const fitted = columns.map((_, i) => cells[i] ?? "");
      return { size: fitted[0]!, cells: fitted };
    });

  return rows.length ? { columns, rows } : null;
}

/**
 * The comparison key for a size, forgiving of how the store actually spells
 * them (measured 2026-10-28): `S-M` / `s-m` / `L- XL`, `UK 3-4` / `uk-3-4` /
 * `3-4`, and `XXL` beside a chart that says `2XL`.
 */
export function sizeKey(value: string): string {
  const key = value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/^uk\b/, "")
    .replace(/[^a-z0-9.]/g, "");
  // XXS / XXL / XXXL -> 2xs / 2xl / 3xl. A single X stays as it is.
  return key.replace(/^(x{2,})(s|l)$/, (_, xs: string, end: string) => `${xs.length}x${end}`);
}

export function sameSize(a: string, b: string): boolean {
  return sizeKey(a) === sizeKey(b);
}

/** The option whose values the chart's rows cover best, or null for none. */
export function optionForChart(
  chart: SizeChart,
  options: { name: string; values: string[] }[]
): string | null {
  const sizes = new Set(chart.rows.map((row) => sizeKey(row.size)));
  let best: { name: string; hits: number } | null = null;
  for (const option of options) {
    const hits = option.values.filter((value) => sizes.has(sizeKey(value))).length;
    if (hits && (!best || hits > best.hits)) best = { name: option.name, hits };
  }
  return best?.name ?? null;
}

/**
 * Picks the chart for a product. The product's own chart wins outright - the
 * merchant chose it for this Kompanion. A collection chart counts only if its
 * sizes match one of the product's options: `ritual-kits` carries the
 * bathrobe chart and also holds kits sized in UK slipper sizes, which must
 * not be offered a robe table.
 */
export function pickSizeChart(
  own: SizeChart | null,
  fromCollections: SizeChart[],
  options: { name: string; values: string[] }[]
): ProductSizeChart | null {
  const choosable = options.filter((option) => option.values.length > 1);
  if (!choosable.length) return null;

  if (own) {
    const optionName =
      optionForChart(own, choosable) ??
      choosable.find((option) => /size|fit/i.test(option.name))?.name ??
      choosable[0]!.name;
    return { chart: own, optionName };
  }

  for (const chart of fromCollections) {
    const optionName = optionForChart(chart, choosable);
    if (optionName) return { chart, optionName };
  }
  return null;
}

const CM_PER_INCH = 2.54;
const MEASURE = /^\d+(?:\.\d+)?(?:\s*[-–—]\s*\d+(?:\.\d+)?)?$/;

/**
 * One cell in the unit the shopper asked for. Only a bare number or range is
 * converted; anything else in a measurement column (a note, a "—") is shown
 * as typed rather than half-converted.
 */
export function convertCell(cell: string, from: SizeUnit | null, to: SizeUnit): string {
  if (!from || from === to || !MEASURE.test(cell)) return cell;
  const factor = to === "cm" ? CM_PER_INCH : 1 / CM_PER_INCH;
  // Precision follows the source: a chart typed in whole inches reads in whole
  // centimetres (34 -> 86, not 86.4), while a foot length of 8.7 keeps its
  // decimal, because there the tenth is the difference between two sizes.
  return cell.replace(/\d+(?:\.\d+)?/g, (n) => {
    const step = n.includes(".") ? 10 : 1;
    return String(Math.round(Number(n) * factor * step) / step);
  });
}
