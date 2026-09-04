import clsx from "clsx";
import Seal from "./seal";

/**
 * The giant wordmark, with the rotating seal standing in for its first "O".
 *
 * The word is split on that letter and the seal is dropped into the gap at
 * `1em`, so it tracks the type size exactly and needs no measurement at any
 * breakpoint. It is set in the reversed tone - indigo disc, sage ring - so it
 * reads as a letter of an indigo word rather than as a badge stuck on top of
 * one.
 *
 * If the word has no "o" the seal is simply omitted rather than guessed at.
 */
export default function WordmarkBand({
  text,
  seal,
  className,
}: {
  text: string;
  seal: string;
  className?: string;
}) {
  const at = text.toLowerCase().indexOf("o");
  const before = at === -1 ? text : text.slice(0, at);
  const after = at === -1 ? "" : text.slice(at + 1);

  return (
    <div
      className={clsx(
        "wordmark flex select-none items-center justify-center leading-[0.9] text-ink",
        className
      )}
    >
      <span aria-hidden>{before}</span>

      {at === -1 ? null : (
        <Seal
          text={seal}
          tone="ink"
          size="fit"
          /* Slightly under 1em: the disc has to match the O's counter, not the
             full cap height, or it reads a size too large in the word. */
          className="mx-[0.02em] h-[0.82em] w-[0.82em]"
        />
      )}

      <span aria-hidden>{after}</span>

      {/* The wordmark is decorative; the page's real heading is elsewhere. */}
      <span className="sr-only">{text}</span>
    </div>
  );
}
