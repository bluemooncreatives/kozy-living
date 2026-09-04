"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    instgrm?: { Embeds: { process: () => void } };
  }
}

/**
 * Wraps Instagram's official embed (embed.js + the `instagram-media`
 * blockquote it hydrates into an iframe). This is the only supported way to
 * show a reel's actual video outside Instagram - there is no cropped
 * "cover" mode, so the frame keeps Instagram's own chrome (avatar, caption,
 * like/comment row) rather than behaving like a plain background video.
 */
export default function InstagramEmbed({
  url,
  className,
}: {
  url: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const existing = document.getElementById("instagram-embed-script");

    const process = () => window.instgrm?.Embeds.process();

    if (window.instgrm) {
      process();
    } else if (!existing) {
      const script = document.createElement("script");
      script.id = "instagram-embed-script";
      script.src = "https://www.instagram.com/embed.js";
      script.async = true;
      script.onload = process;
      document.body.appendChild(script);
    } else {
      existing.addEventListener("load", process);
      return () => existing.removeEventListener("load", process);
    }
  }, [url]);

  return (
    <div
      ref={ref}
      className={className}
      style={{ display: "flex", justifyContent: "center" }}
    >
      <blockquote
        className="instagram-media"
        data-instgrm-permalink={url}
        data-instgrm-version="14"
        style={{
          background: "#FFF",
          border: 0,
          borderRadius: "3px",
          margin: 0,
          maxWidth: "540px",
          minWidth: "260px",
          padding: 0,
          width: "100%",
        }}
      >
        {/* Instagram's own fallback markup - visible only until embed.js
            reaches instagram.com and swaps this blockquote for the iframe.
            Without it a blocked/slow script leaves a blank box. */}
        <div style={{ padding: "16px" }}>
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            style={{
              background: "#FFFFFF",
              lineHeight: 0,
              padding: 0,
              textAlign: "center",
              textDecoration: "none",
              width: "100%",
              display: "block",
            }}
          >
            View this post on Instagram
          </a>
        </div>
      </blockquote>
    </div>
  );
}
