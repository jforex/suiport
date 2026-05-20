"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectButton, useCurrentAccount } from "@mysten/dapp-kit";
import { shortAddr } from "../lib/format";

const NAV = [
  { href: "/", label: "Manifest", icon: "▦" },
  { href: "/mint", label: "Mint", icon: "+" },
  { href: "/documents", label: "Documents", icon: "▤" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const account = useCurrentAccount();

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  const activeIndex = NAV.findIndex((item) => isActive(item.href));

  return (
    <div className="flex min-h-screen bg-neutral-950 text-neutral-100">
      {/* Sidebar — desktop */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-neutral-800 lg:flex">
        <div className="border-b border-neutral-800 px-6 py-5">
          <div className="font-mono text-lg font-bold tracking-tight">
            SUIPORT
          </div>
          <div className="mt-0.5 text-[10px] uppercase tracking-widest text-amber-500">
            Manifest System
          </div>
        </div>

        <nav className="relative flex-1 px-3 py-4">
          {/* Sliding active indicator */}
          <div
            className="absolute left-3 right-3 h-9 rounded-md bg-neutral-800 transition-transform duration-300 ease-out"
            style={{
              transform: `translateY(${activeIndex * 40}px)`,
              opacity: activeIndex < 0 ? 0 : 1,
            }}
          />
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`relative z-10 mb-1 flex h-9 items-center gap-3 rounded-md px-3 text-sm transition-colors ${
                isActive(item.href)
                  ? "text-white"
                  : "text-neutral-400 hover:text-neutral-200"
              }`}
            >
              <span className="w-4 text-center font-mono text-amber-500">
                {item.icon}
              </span>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="border-t border-neutral-800 p-4">
          {account && (
            <div className="mb-3 font-mono text-[11px] text-neutral-500">
              {shortAddr(account.address)}
              <span className="ml-1 text-neutral-700">· testnet</span>
            </div>
          )}
          <ConnectButton />
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="flex flex-1 flex-col">
        <div className="flex items-center justify-between border-b border-neutral-800 px-5 py-4 lg:hidden">
          <div className="font-mono font-bold">SUIPORT</div>
          <ConnectButton />
        </div>
        <nav className="flex gap-1 border-b border-neutral-800 px-3 py-2 lg:hidden">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded px-3 py-1.5 text-xs transition ${
                isActive(item.href)
                  ? "bg-neutral-800 text-white"
                  : "text-neutral-400"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}