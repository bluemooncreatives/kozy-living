"use client";

import Image from "next/image";
import clsx from "clsx";
import { useProduct, useUpdateURL } from "./product-context";

/**
 * Product gallery: one rounded plate on the mist ground with pill arrow
 * controls, and a thumbnail rail beneath. Product images are contained rather than
 * cropped to preserve full handcrafted silhouettes.
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
    "flex h-10 w-10 items-center justify-center rounded-full border border-oxblood text-lg leading-none transition-colors hover:bg-oxblood hover:text-paper";

  return (
    <form>
      <div className="plate aspect-square w-full">
        {images[imageIndex] ? (
          <Image
            className="h-full w-full object-contain p-10"
            fill
            sizes="(min-width: 1024px) 50vw, 100vw"
            src={images[imageIndex]?.src as string}
            alt={images[imageIndex]?.altText as string}
            priority
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <span className="eyebrow">No image</span>
          </div>
        )}

        {images.length > 1 ? (
          <>
            <div className="absolute bottom-4 right-4 flex gap-2">
              <button
                formAction={() => {
                  const newState = updateImage(previousImageIndex.toString());
                  updateURL(newState);
                }}
                aria-label="Previous product image"
                className={arrowClass}
              >
                <span aria-hidden>&larr;</span>
              </button>
              <button
                formAction={() => {
                  const newState = updateImage(nextImageIndex.toString());
                  updateURL(newState);
                }}
                aria-label="Next product image"
                className={arrowClass}
              >
                <span aria-hidden>&rarr;</span>
              </button>
            </div>

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
                      ? "border-oxblood"
                      : "border-transparent hover:border-rule"
                  )}
                >
                  <Image
                    src={image.src}
                    alt={image.altText}
                    fill
                    sizes="12vw"
                    className="object-contain p-2"
                  />
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </form>
  );
}
