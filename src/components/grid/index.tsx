import clsx from "clsx";

/**
 * Hairline product grid. A 1px gap over a flame-soft ground draws the dividing
 * rules of the reference layouts without doubling borders between cells, so
 * cards themselves stay border-free.
 */
export default function Grid(props: React.ComponentProps<"ul">) {
  return (
    <ul
      {...props}
      className={clsx(
        "grid grid-flow-row gap-px border-y border-rule bg-rule",
        props.className
      )}
    >
      {props.children}
    </ul>
  );
}

/** Cells paint their own ground so only the 1px gap shows through as a rule. */
function GridItem(props: React.ComponentProps<"li">) {
  return (
    <li {...props} className={clsx("bg-paper", props.className)}>
      {props.children}
    </li>
  );
}

Grid.Item = GridItem;
