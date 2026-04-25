import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

import { format, parseISO } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Consistently format YYYY-MM-DD strings for display without timezone shifts.
 */
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  try {
    // parseISO handles YYYY-MM-DD as local date or specific UTC if specified
    // For our case, we want to treat the stored YYYY-MM-DD as a literal date
    return format(parseISO(dateStr), "PPP");
  } catch (e) {
    return dateStr;
  }
}

/**
 * Convert a Date object to YYYY-MM-DD string using local time (no UTC shift).
 */
export function toYMD(date: Date | undefined | null): string {
  if (!date) return "";
  return format(date, "yyyy-MM-dd");
}

/**
 * Safely parse a YYYY-MM-DD string into a Date object for UI components (DatePicker).
 */
export function fromYMD(dateStr: string | null | undefined): Date | undefined {
  if (!dateStr) return undefined;
  try {
    return parseISO(dateStr);
  } catch (e) {
    return undefined;
  }
}

export function formatTimeAgo(date: string | Date | number): string {
  const now = new Date().getTime();
  const past = new Date(date).getTime();
  const diffInMs = now - past;
  
  const diffInSecs = Math.floor(diffInMs / 1000);
  const diffInMins = Math.floor(diffInSecs / 60);
  const diffInHours = Math.floor(diffInMins / 60);
  const diffInDays = Math.floor(diffInHours / 24);

  if (diffInSecs < 60) return "Just now";
  if (diffInMins < 60) return `${diffInMins}m ago`;
  if (diffInHours < 24) return `${diffInHours}h ago`;
  if (diffInDays < 7) return `${diffInDays}d ago`;
  
  return formatDate(date.toString());
}
