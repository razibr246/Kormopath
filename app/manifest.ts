import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "KormoPath — কর্মপথ",
    short_name: "KormoPath",
    description: "বাংলাদেশের কাজ, পড়াশোনা, কৃষি ও দৈনন্দিন জীবনের ব্যবহারিক টুল।",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f8fafc",
    theme_color: "#070d1e",
    lang: "bn-BD",
    dir: "ltr",
    icons: [{ src: "/favicon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
    shortcuts: [
      { name: "আমার পথ", short_name: "My Path", url: "/opportunities", icons: [{ src: "/favicon.svg", sizes: "any", type: "image/svg+xml" }] },
      { name: "হাটবাজার", short_name: "HaatBazar", url: "/haatbazar", icons: [{ src: "/favicon.svg", sizes: "any", type: "image/svg+xml" }] },
      { name: "সহজ বাজেট", short_name: "Budget", url: "/shohoj-budget", icons: [{ src: "/favicon.svg", sizes: "any", type: "image/svg+xml" }] },
    ],
  };
}
