import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: site.name,
    short_name: site.name,
    description: site.description,
    start_url: "/",
    display: "standalone",
    background_color: "#faf8f5",
    theme_color: "#2a221e",
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
