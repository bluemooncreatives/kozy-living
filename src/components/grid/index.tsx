import clsx from "clsx";

/**
 * Product grid. A plain gapped grid - the cards' own rounded plates read as
 * the cell edges, so no rules are needed between them.
 *
 * This replaces the hairline 1px-gap trick of the previous system, which drew
 * dividing rules through the layout. Those rules fought the rounded corners
 * the moment the cards gained a radius.
 */
export default function Grid(props: React.ComponentProps<"ul">) {
  return (
    <ul {...props} className={clsx("grid grid-flow-row gap-3", props.className)}>
      {props.children}
    </ul>
  );
}

function GridItem(props: React.ComponentProps<"li">) {
  return (
    <li {...props} className={clsx("h-full", props.className)}>
      {props.children}
    </li>
  );
}

Grid.Item = GridItem;
