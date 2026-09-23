import type { StaticImageData } from "next/image";
import carIcon from "../../../public/icons/car.png";
import comfyIcon from "../../../public/icons/comfy.png";
import cookIcon from "../../../public/icons/cook.png";
import ecoConsciousIcon from "../../../public/icons/eco-concious.png";
import kraftedByKozyIcon from "../../../public/icons/kozy.png";
import pawIcon from "../../../public/icons/paw.png";
import petParentIcon from "../../../public/icons/pet-parent.png";

export type BrandIcon = {
  src: StaticImageData;
  alt: string;
  scale: string;
};

/**
 * The house glyphs, and the scale each one needs to carry the same visual
 * weight as the rest.
 *
 * The artwork is not drawn to a shared optical size: every glyph is normalised
 * on its longest side, and three of the canvases aren't even square, so
 * `object-contain` letterboxes them on top of that. Dropped into one box the
 * raw spread is 28% - the figure lands at 53px where the paw sits at 85px.
 * Each scale below evens the glyphs out on the geometric mean of their ink
 * box, which is what the eye actually reads as "the same size".
 *
 * Recompute these if the artwork is ever redrawn or re-exported.
 */
export const brandIcons = {
  krafted: {
    src: kraftedByKozyIcon,
    alt: "Krafted by Kozy",
    scale: "scale-[0.94]",
  },
  eco: {
    src: ecoConsciousIcon,
    alt: "Eco conscious",
    scale: "scale-[0.91]",
  },
  comfy: {
    src: comfyIcon,
    alt: "Made for comfort",
    scale: "scale-[0.87]",
  },
  pet: {
    src: pawIcon,
    alt: "Pet Kollection",
    scale: "scale-[0.96]",
  },
  cook: {
    src: cookIcon,
    alt: "Naturally dyed",
    scale: "scale-[1.06]",
  },
  petParent: {
    src: petParentIcon,
    alt: "Pet & Parent",
    scale: "scale-[1.12]",
  },
  car: {
    src: carIcon,
    alt: "Green delivery",
    scale: "scale-[0.94]",
  },
} satisfies Record<string, BrandIcon>;
