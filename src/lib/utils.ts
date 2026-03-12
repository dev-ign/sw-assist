import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { supabase } from "./supabase";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Converts a slug (e.g. "custom-link") to title case (e.g. "Custom Link"). */
export function slugToTitle(slug: string): string {
  if (!slug.trim()) return "";
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

export function toBaseSlug(artistName: string): string {
  return artistName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export async function generateUniqueSlug(
  artistName: string,
  userId: string,
): Promise<string> {
  const base = toBaseSlug(artistName);
  if (!base) return "";

  // Check if base slug is taken by another user
  const { data } = await supabase
    .from("profiles")
    .select("slug")
    .eq("slug", base)
    .neq("id", userId)
    .maybeSingle();

  if (!data) return base;

  // Try base-2, base-3, … until we find a free one
  for (let i = 2; i <= 99; i++) {
    const candidate = `${base}-${i}`;
    const { data: existing } = await supabase
      .from("profiles")
      .select("slug")
      .eq("slug", candidate)
      .neq("id", userId)
      .maybeSingle();

    if (!existing) return candidate;
  }

  // Fallback: append userId fragment (extremely rare)
  return `${base}-${userId.slice(0, 6)}`;
}
