import Price from "@/components/price";
import Image from "@/components/ui/shop-image";
import { KIT_ATTRIBUTE } from "@/lib/constants";
import type { OrderLineItem } from "@/lib/customer-account";
import { kitBuilder as kitCopy } from "@/lib/site";

/**
 * What an order contained, under its row in the account's order history.
 *
 * A custom kit arrives as separate lines - the container and each piece -
 * because the Customer Account API does not say which line was nested under
 * which. They share the visible `Kit: K-7Q2X` property (written by
 * `addKitItem` for exactly this), so they are grouped by it here: the
 * container's choices as the heading, the pieces under it.
 */

type Group =
  | { kind: "kit"; code: string; head?: OrderLineItem; pieces: OrderLineItem[] }
  | { kind: "line"; line: OrderLineItem };

const attribute = (line: OrderLineItem, key: string) =>
  line.customAttributes.find((entry) => entry.key === key)?.value ?? undefined;

function groupLines(lines: OrderLineItem[]): Group[] {
  const groups: Group[] = [];
  const kits = new Map<string, Extract<Group, { kind: "kit" }>>();

  for (const line of lines) {
    const code = attribute(line, KIT_ATTRIBUTE);
    if (!code) {
      groups.push({ kind: "line", line });
      continue;
    }
    let kit = kits.get(code);
    if (!kit) {
      kit = { kind: "kit", code, pieces: [] };
      kits.set(code, kit);
      groups.push(kit);
    }
    // The container is the line that carries the kit's choices.
    if (!kit.head && attribute(line, kitCopy.orderLabels.fabric)) kit.head = line;
    else kit.pieces.push(line);
  }

  return groups;
}

function Thumb({ line }: { line: OrderLineItem }) {
  return (
    <span className="plate relative block h-14 w-12 shrink-0 rounded-lg">
      {line.image?.url ? (
        <Image
          src={line.image.url}
          alt={line.image.altText || line.name}
          fill
          sizes="48px"
          className="h-full w-full object-cover"
        />
      ) : null}
    </span>
  );
}

export default function OrderItems({ lines }: { lines: OrderLineItem[] }) {
  if (!lines.length) return null;
  const shown = [
    kitCopy.orderLabels.fabric,
    kitCopy.orderLabels.thread,
    kitCopy.orderLabels.initials,
  ];

  return (
    <ul className="mt-4 space-y-3">
      {groupLines(lines).map((group) =>
        group.kind === "line" ? (
          <li key={group.line.id} className="flex items-center gap-3">
            <Thumb line={group.line} />
            <p className="spec-mono min-w-0">
              <span className="text-ink">{group.line.name}</span>
              {group.line.quantity > 1 ? ` × ${group.line.quantity}` : ""}
            </p>
          </li>
        ) : (
          <li key={group.code} className="rounded-plate bg-wash p-3">
            <div className="flex items-center gap-3">
              {group.head ? <Thumb line={group.head} /> : null}
              <div className="min-w-0">
                <p className="micro-mono text-muted">
                  {kitCopy.cartLabel} · {group.code}
                </p>
                <p className="ui-mono mt-0.5">
                  {group.head?.name ?? kitCopy.cartLabel}
                  {group.head && group.head.quantity > 1 ? ` × ${group.head.quantity}` : ""}
                </p>
                {group.head ? (
                  <p className="spec-mono mt-0.5">
                    {shown
                      .map((key) => {
                        const value = attribute(group.head!, key);
                        return value ? `${key}: ${value}` : null;
                      })
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                ) : null}
              </div>
            </div>
            <ul className="mt-2.5 space-y-1 pl-[3.75rem]">
              {group.pieces.map((piece) => (
                <li key={piece.id} className="spec-mono flex justify-between gap-3">
                  <span className="min-w-0">
                    {piece.name}
                    {piece.quantity > 1 ? ` × ${piece.quantity}` : ""}
                  </span>
                  {piece.totalPrice ? (
                    <Price
                      className="shrink-0"
                      amount={piece.totalPrice.amount}
                      currencyCode={piece.totalPrice.currencyCode}
                    />
                  ) : null}
                </li>
              ))}
            </ul>
          </li>
        )
      )}
    </ul>
  );
}
