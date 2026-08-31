import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: site.name,
    short_name: site.name,
    description: site.description,
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#341706",
    icons: [
      {
        src: "/logo.png",
        sizes: "571x571",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
