import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "VoltHesap",
    short_name: "VoltHesap",
    description: "Elektrikli araç şarj maliyeti ve enerji hesabı.",
    start_url: "/",
    display: "standalone",
    background_color: "#f3f1e9",
    theme_color: "#c7ff38",
    lang: "tr",
    icons: [
      {
        src: "/brand/volthesap-mark.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
