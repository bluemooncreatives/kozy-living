import clsx from "clsx";
import Image from "next/image";
import Label from "../label";

/**
 * Image tile used by the product gallery and its thumbnail rail. Rounded plate
 * on the tint ground, with an ink ring when active.
 */
export function GridTileImage({
  isInteractive = true,
  active,
  label,
  className,
  ...props
}: {
  isInteractive?: boolean;
  active?: boolean;
  className?: string;
  label?: {
    title: string;
    amount: string;
    currencyCode: string;
    position?: "bottom" | "center";
  };
} & React.ComponentProps<typeof Image>) {
  return (
    <div
      className={clsx(
        "group flex h-full w-full items-center justify-center overflow-hidden rounded-plate bg-tint",
        {
          relative: label,
          "ring-2 ring-ink ring-offset-2 ring-offset-paper": active,
        },
        className
      )}
    >
      {props.src ? (
        <Image
          {...props}
          className={clsx("relative h-full w-full object-contain p-4", {
            "transition-transform duration-700 ease-editorial group-hover:scale-[1.04]":
              isInteractive,
          })}
          alt={props.alt}
        />
      ) : null}
      {label ? (
        <Label
          title={label.title}
          amount={label.amount}
          currencyCode={label.currencyCode}
          position={label.position}
        />
      ) : null}
    </div>
  );
}
