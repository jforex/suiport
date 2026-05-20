"use client";

import Link from "next/link";
import { ContainerFields } from "../lib/useContainers";
import { STATUS_LABELS, STATUS_STYLES, shortId } from "../lib/format";

export function ContainerCard({ c }: { c: ContainerFields }) {
  return (
    <Link
      href={`/container/${c.objectId}`}
      className="group block rounded-lg border border-neutral-800 bg-neutral-900/40 p-5 transition hover:border-neutral-600 hover:bg-neutral-900"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="font-mono text-base font-semibold tracking-tight">
          {c.containerId}
        </div>
        <span
          className={`shrink-0 rounded border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${
            STATUS_STYLES[c.status] ?? STATUS_STYLES[0]
          }`}
        >
          {STATUS_LABELS[c.status] ?? "Unknown"}
        </span>
      </div>

      <div className="mt-4 flex items-center gap-2 font-mono text-sm text-neutral-400">
        <span>{c.origin}</span>
        <span className="text-neutral-600">→</span>
        <span>{c.destination}</span>
      </div>

      <div className="mt-4 flex items-center justify-between text-xs text-neutral-500">
        <span>{(Number(c.weightKg) / 1000).toFixed(1)} t</span>
        <span>
          {c.documentBlobIds.length} doc
          {c.documentBlobIds.length === 1 ? "" : "s"}
        </span>
        <span className="font-mono">{shortId(c.objectId, 4, 4)}</span>
      </div>
    </Link>
  );
}