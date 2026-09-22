"use client";

import Image from "next/image";
import clsx from "clsx";
import { useProduct, useUpdateURL } from "./product-context";

/**
 * Product gallery: one rounded plate on the mist ground with pill arrow
 * controls, and a thumbnail rail beneath. Images fill their frame edge to edge
 * - the photography is already shot square, so covering crops far less than the
 * letterboxing it replaces cost in presence.
 */
export default function Gallery({
  images,
}: {
  images: { src: string; altText: string }[];
}) {
  const { state, updateImage } = useProduct();
  const updateURL = useUpdateURL();
  const imageIndex = state.image ? parseInt(state.image) : 0;

  const nextImageIndex = imageIndex + 1 < images.length ? imageIndex + 1 : 0;
  const previousImageIndex =
    imageIndex === 0 ? images.length - 1 : imageIndex - 1;

  const arrowClass =
    "arrow-btn h-8 w-8 border border-ink/10 text-base leading-none shadow-chip";

  return (
    <form>
      <div className="plate aspect-[6/7] w-full">
        {images[imageIndex] ? (
          <Image
            className="object-cover"
            fill
            sizes="(min-width: 1024px) 50vw, 100vw"
            src={images[imageIndex]?.src as string}
            alt={images[imageIndex]?.altText as string}
            priority
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <span className="wordmark text-[6vw] text-ink/10">kozy</span>
          </div>
        )}

        <Image
          src="/icons/gi-tag.png"
          alt="GI registered craft"
          width={2528}
          height={4288}
          className="pointer-events-none absolute left-4 top-4 h-16 w-auto sm:h-20 lg:h-28"
        />

        {images.length > 1 ? (
          <>
            <button
              formAction={() => {
                const newState = updateImage(previousImageIndex.toString());
                updateURL(newState);
              }}
              aria-label="Previous product image"
              className={clsx(
                arrowClass,
                "absolute left-4 top-1/2 -translate-y-1/2",
              )}
            >
              <span aria-hidden>&lsaquo;</span>
            </button>
            <button
              formAction={() => {
                const newState = updateImage(nextImageIndex.toString());
                updateURL(newState);
              }}
              aria-label="Next product image"
              className={clsx(
                arrowClass,
                "absolute right-4 top-1/2 -translate-y-1/2",
              )}
            >
              <span aria-hidden>&rsaquo;</span>
            </button>

            <p className="spec-mono absolute bottom-6 left-6">
              {String(imageIndex + 1).padStart(2, "0")} /{" "}
              {String(images.length).padStart(2, "0")}
            </p>
          </>
        ) : null}
      </div>

      {images.length > 1 ? (
        <ul className="mt-3 grid grid-cols-6 gap-2">
          {images.map((image, index) => {
            const isActive = index === imageIndex;
            return (
              <li key={image.src}>
                <button
                  formAction={() => {
                    const newState = updateImage(index.toString());
                    updateURL(newState);
                  }}
                  aria-label={`Show image ${index + 1}`}
                  aria-current={isActive}
                  className={clsx(
                    "relative block aspect-square w-full overflow-hidden rounded-plate bg-tint border transition-colors",
                    isActive
                      ? "border-ink/20"
                      : "border-transparent hover:border-rule"
                  )}
                >
                  <Image
                    src={image.src}
                    alt={image.altText}
                    fill
                    sizes="12vw"
                    className="object-cover"
                  />
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      {/* The GI tag's own text, set out in full below the thumbnails. */}
      <div className="rule-t mt-4 pt-4 text-center">
        <p className="eyebrow">Jodhpur Block Print</p>
        <p className="spec-mono mt-1">A GI Registered Kraft</p>
        <p className="spec-mono mt-2">Rooted in Ritual &middot; Handcrafted in India</p>
      </div>
    </form>
  );
}
