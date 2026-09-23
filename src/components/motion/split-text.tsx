import {
  cloneElement,
  Fragment,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from "react";

/**
 * Splits text into masked words (or glyphs) for the motion layer's headline
 * reveal - `data-split` in `motion-provider.tsx`.
 *
 * PRE-SPLIT IN THE MARKUP, NEVER AT RUNTIME. A runtime splitter rewrites text
 * nodes React owns, and the next server re-render of that heading (a cart
 * action revalidating the page is enough) reconciles against DOM that is no
 * longer there. Emitting the spans from the render - the same idea as the
 * loader's glyphs - means the split is part of the tree React knows about,
 * identical on the server and the client, and it ships in the HTML so the
 * hidden start state is right on the first painted frame.
 *
 * Whitespace stays REAL text between the masks, so wrapping, `text-balance`,
 * copy-paste, find-in-page and screen readers all see an ordinary sentence.
 *
 * What gets split:
 *   - strings and numbers, anywhere in the tree;
 *   - the children of plain elements (`<span className="block">` lines, an
 *     `<em>`), recursively, with the element itself kept;
 *   - NOT components. `CircledWord`, a client island, anything with its own
 *     markup: it is wrapped whole in a `.split-unit` and rises as one piece.
 *     Its internals are its own business, and a ring clipped by a word mask
 *     would be clipped for the whole entrance.
 */

export type SplitMode = "words" | "chars";

function splitString(text: string, mode: SplitMode, path: string): ReactNode[] {
  const out: ReactNode[] = [];
  text.split(/(\s+)/).forEach((part, i) => {
    if (!part) return;
    if (/^\s+$/.test(part)) {
      out.push(part);
      return;
    }
    const pieces = mode === "chars" ? Array.from(part) : [part];
    pieces.forEach((piece, j) =>
      out.push(
        <span key={`${path}-${i}-${j}`} className="split-mask">
          <span className="split-word">{piece}</span>
        </span>,
      ),
    );
  });
  return out;
}

function splitNode(node: ReactNode, mode: SplitMode, path: string): ReactNode {
  if (typeof node === "string" || typeof node === "number") {
    return splitString(String(node), mode, path);
  }

  if (Array.isArray(node)) {
    return node.map((child, i) => splitNode(child, mode, `${path}.${i}`));
  }

  if (isValidElement(node)) {
    const element = node as ReactElement<{ children?: ReactNode }>;

    if (element.type === Fragment) {
      return (
        <Fragment key={element.key ?? path}>
          {splitNode(element.props.children, mode, path)}
        </Fragment>
      );
    }

    if (typeof element.type === "string") {
      if (element.type === "br" || element.props.children == null) {
        return element;
      }
      return cloneElement(
        element,
        undefined,
        splitNode(element.props.children, mode, path),
      );
    }

    return (
      <span key={element.key ?? path} className="split-unit">
        {element}
      </span>
    );
  }

  return node;
}

/** The split children. Put `data-split` (or `data-split="chars"`) on the parent. */
export function splitText(children: ReactNode, mode: SplitMode = "words") {
  return splitNode(children, mode, "s");
}
