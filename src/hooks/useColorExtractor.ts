import { useState, useEffect } from "react";
import { getPaletteSync } from "colorthief";

const FALLBACK: [string, string] = ["#7c3aed", "#1e1030"];

export function useColorExtractor(imageUrl: string | null | undefined) {
  const [colors, setColors] = useState<[string, string]>(FALLBACK);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!imageUrl) {
      setColors(FALLBACK);
      return;
    }

    setLoading(true);
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      try {
        const palette = getPaletteSync(img, { colorCount: 2 });
        if (palette && palette.length >= 2) {
          setColors([palette[0].hex(), palette[1].hex()]);
        } else if (palette && palette.length === 1) {
          setColors([palette[0].hex(), FALLBACK[1]]);
        } else {
          setColors(FALLBACK);
        }
      } catch {
        setColors(FALLBACK);
      } finally {
        setLoading(false);
      }
    };

    img.onerror = () => {
      setColors(FALLBACK);
      setLoading(false);
    };

    img.src = imageUrl;
  }, [imageUrl]);

  return { colors, loading };
}
