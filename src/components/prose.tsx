import clsx from "clsx";
import { FunctionComponent } from "react";

interface TextProps {
  html: string;
  className?: string;
}

/**
 * Renders Shopify rich text into the flame type system: serif headings, mono
 * body, hairline rules. Kept as `prose` overrides rather than bespoke selectors
 * so merchant-authored HTML stays predictable.
 */
const Prose: FunctionComponent<TextProps> = ({ html, className }) => {
  return (
    <div
      className={clsx(
        "prose max-w-none font-sans text-body text-ink",
        "prose-headings:font-display prose-headings:font-bold prose-headings:text-ink",
        "prose-h1:text-display-lg prose-h2:text-display-md prose-h3:text-display-sm prose-h4:text-xl",
        "prose-p:font-sans prose-p:text-body prose-p:text-ink",
        "prose-a:text-ink prose-a:underline prose-a:underline-offset-4 hover:prose-a:opacity-70",
        "prose-strong:font-bold prose-strong:text-ink",
        "prose-blockquote:border-l prose-blockquote:border-ink/20 prose-blockquote:pl-6 prose-blockquote:font-display prose-blockquote:text-display-sm prose-blockquote:not-italic prose-blockquote:text-ink",
        "prose-hr:border-rule",
        "prose-li:font-sans prose-li:text-body prose-li:text-ink prose-li:marker:text-ink",
        "prose-img:rounded-plate",
        className
      )}
      dangerouslySetInnerHTML={{ __html: html as string }}
    />
  );
};

export default Prose;
