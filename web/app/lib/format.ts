export const STATUS_LABELS: Record<number, string> = {
  0: "Registered",
  1: "In Transit",
  2: "At Port",
  3: "Cleared",
  4: "Delivered",
};

// Tailwind classes for each status tag.
export const STATUS_STYLES: Record<number, string> = {
  0: "bg-neutral-800 text-neutral-300 border-neutral-700",
  1: "bg-amber-950 text-amber-400 border-amber-800",
  2: "bg-sky-950 text-sky-400 border-sky-800",
  3: "bg-emerald-950 text-emerald-400 border-emerald-800",
  4: "bg-violet-950 text-violet-400 border-violet-800",
};

export function shortId(id: string, head = 6, tail = 4): string {
  if (id.length <= head + tail + 1) return id;
  return `${id.slice(0, head)}…${id.slice(-tail)}`;
}

export function shortAddr(addr: string): string {
  return shortId(addr, 6, 4);
}

// Convert stored micro-degrees back to a human lat/lng number.
export function microToDeg(micro: string, negative: boolean): number {
  const v = Number(micro) / 1_000_000;
  return negative ? -v : v;
}

export function formatCoords(
  latMicro: string,
  latNeg: boolean,
  lngMicro: string,
  lngNeg: boolean,
): string {
  if (latMicro === "0" && lngMicro === "0") return "No location set";
  const lat = microToDeg(latMicro, latNeg).toFixed(4);
  const lng = microToDeg(lngMicro, lngNeg).toFixed(4);
  return `${lat}, ${lng}`;
}