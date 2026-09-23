import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: site.name,
    short_name: site.name,
    description: site.description,
    start_url: "/",
    display: "standalone",
    // Cream and indigo, from the live palette in `globals.css`. These were
    // still "#faf8f5" / "#2a221e" - the Warm Ivory Oat and Warm Espresso of a
    // palette this brand stopped using, and `theme_color` is not decorative:
    // it tints the browser chrome on Android.
    background_color: "#FFF6EB",
    theme_color: "#23324B",
    icons: [
      {
        src: "/logo/Kozy Logo.png",
        sizes: "3836x2160",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
