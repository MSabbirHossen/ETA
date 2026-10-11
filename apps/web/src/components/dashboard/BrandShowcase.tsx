"use client";

import React, { useState } from "react";
import { Sparkles, Palette, Copy, Check, ExternalLink } from "lucide-react";
import { ETALogo } from "../brand/ETALogo";
import { ETAIcon } from "../brand/ETAIcon";
import { ETALoader } from "../brand/ETALoader";

const BRAND_COLORS = [
  { name: "Navy", hex: "#073C84", token: "--eta-navy", desc: "Anchor Primary" },
  { name: "Deep Blue", hex: "#0752B5", token: "--eta-deep-blue", desc: "Brand Secondary" },
  { name: "Brand Blue", hex: "#0B7CEB", token: "--eta-blue", desc: "Interactive Accent" },
  { name: "Bright Blue", hex: "#129BFF", token: "--eta-bright-blue", desc: "Highlight / Hover" },
  { name: "Cyan Glow", hex: "#16C4FF", token: "--eta-cyan", desc: "Energy & Glow" },
  { name: "Ink Dark", hex: "#071324", token: "--eta-ink", desc: "Deep Canvas" },
  { name: "White", hex: "#FFFFFF", token: "--eta-white", desc: "Pure Contrast" },
];

export const BrandShowcase: React.FC = () => {
  const [copiedHex, setCopiedHex] = useState<string | null>(null);
  const [loaderSize, setLoaderSize] = useState<"sm" | "md" | "lg">("md");
  const [logoTheme, setLogoTheme] = useState<"dark" | "light">("dark");
  const [activeTab, setActiveTab] = useState<"horizontal" | "stacked" | "symbol">("horizontal");

  const copyToClipboard = (hex: string) => {
    navigator.clipboard.writeText(hex);
    setCopiedHex(hex);
    setTimeout(() => setCopiedHex(null), 1500);
  };

  return (
    <div id="design-system" className="space-y-8 scroll-mt-24">
      <div className="flex flex-col gap-2">
        <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#0B7CEB]">
          <Palette className="h-4 w-4" />
          <span>Official SVG Brand Identity System</span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white sm:text-3xl">
              Visual Identity &amp; Scalable Vector Graphics
            </h2>
            <p className="max-w-3xl text-sm text-slate-400 mt-1">
              Precision geometric reconstruction of the Exploratory Training Academy mark. Resolution-independent SVG vectors, accessible dark/light themes, and animated brand primitives.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="/brand/design/eta-brand-guide.svg"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-[#081324] px-3 py-2 text-xs font-semibold text-slate-300 hover:border-[#16C4FF]/40 hover:text-white transition-all shadow-sm"
            >
              <ExternalLink className="h-3.5 w-3.5 text-[#16C4FF]" />
              <span>Vector Guide Artboard</span>
            </a>
          </div>
        </div>
      </div>

      {/* Color Palette Grid */}
      <div className="rounded-xl border border-white/10 bg-[#081324]/80 p-6">
        <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-6">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#16C4FF]" />
            Color Tokens Palette
          </h3>
          <span className="text-xs text-slate-400">Click swatch to copy HEX code</span>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7">
          {BRAND_COLORS.map((color) => (
            <button
              key={color.hex}
              onClick={() => copyToClipboard(color.hex)}
              className="group flex flex-col overflow-hidden rounded-xl border border-white/10 bg-[#0B1B33]/80 text-left transition-all hover:border-[#16C4FF]/40 hover:scale-[1.02]"
            >
              <div
                className="h-20 w-full relative transition-transform"
                style={{ backgroundColor: color.hex }}
              >
                <span className="absolute bottom-2 right-2 rounded bg-black/50 px-1.5 py-0.5 text-[10px] font-mono text-white opacity-0 transition-opacity group-hover:opacity-100 flex items-center gap-1">
                  {copiedHex === color.hex ? (
                    <Check className="h-3 w-3 text-emerald-400" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                  {copiedHex === color.hex ? "Copied" : "Copy"}
                </span>
              </div>
              <div className="p-3">
                <span className="text-xs font-bold text-white block">
                  {color.name}
                </span>
                <span className="font-mono text-[11px] text-[#16C4FF] block mt-0.5">
                  {color.hex}
                </span>
                <span className="text-[10px] text-slate-400 block mt-1">
                  {color.desc}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Brand Assets & Animated Loader Interactive Panel */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Logo Variations Interactive Canvas */}
        <div className="glass-panel rounded-xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex flex-wrap items-center justify-between border-b border-white/10 pb-4 mb-4 gap-2">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-white">
                  Vector Logo Variants
                </h3>
                <span className="rounded bg-[#16C4FF]/10 text-[#16C4FF] px-2 py-0.5 text-[10px] font-mono font-medium">
                  Pure SVG
                </span>
              </div>
              <div className="flex items-center gap-2">
                {/* Variant Switcher */}
                <div className="flex rounded-lg bg-black/40 p-1 border border-white/10 text-xs">
                  {(["horizontal", "stacked", "symbol"] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`px-2.5 py-1 rounded capitalize font-medium transition-colors ${
                        activeTab === tab
                          ? "bg-white/15 text-white"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
                {/* Theme Switcher */}
                <div className="flex rounded-lg bg-black/40 p-1 border border-white/10 text-xs">
                  <button
                    onClick={() => setLogoTheme("dark")}
                    className={`px-2.5 py-1 rounded font-medium transition-colors ${
                      logoTheme === "dark"
                        ? "bg-[#073C84] text-white"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Dark
                  </button>
                  <button
                    onClick={() => setLogoTheme("light")}
                    className={`px-2.5 py-1 rounded font-medium transition-colors ${
                      logoTheme === "light"
                        ? "bg-slate-200 text-slate-900"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Light
                  </button>
                </div>
              </div>
            </div>

            {/* Canvas Preview Area */}
            <div
              className={`rounded-xl p-8 transition-colors border flex flex-col items-center justify-center min-h-[220px] ${
                logoTheme === "dark"
                  ? "bg-[#060E1A] border-white/10"
                  : "bg-white border-slate-200"
              }`}
            >
              {activeTab === "horizontal" && (
                <ETALogo variant="horizontal" theme={logoTheme} height={48} />
              )}
              {activeTab === "stacked" && (
                <ETALogo variant="stacked" theme={logoTheme} height={140} />
              )}
              {activeTab === "symbol" && (
                <div className="flex items-center gap-8">
                  <div className="flex flex-col items-center gap-2">
                    <ETAIcon theme={logoTheme} size={64} />
                    <span
                      className={`text-[10px] font-mono uppercase tracking-wider ${
                        logoTheme === "dark" ? "text-slate-400" : "text-slate-600"
                      }`}
                    >
                      Color Mark
                    </span>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <ETAIcon theme="monochrome" size={64} />
                    <span
                      className={`text-[10px] font-mono uppercase tracking-wider ${
                        logoTheme === "dark" ? "text-slate-400" : "text-slate-600"
                      }`}
                    >
                      Monochrome
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between text-xs text-slate-400 border-t border-white/5 pt-3">
            <span>Aspect Ratio: {activeTab === "horizontal" ? "3.52:1" : "1:1"}</span>
            <span className="font-mono text-[#16C4FF]">Resolution Independent Vector</span>
          </div>
        </div>

        {/* Official Animated Loader */}
        <div className="glass-panel rounded-xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-white">
                  Official Animated Brand Loader
                </h3>
                <span className="rounded bg-emerald-500/10 text-emerald-400 px-2 py-0.5 text-[10px] font-mono font-medium">
                  Reduced-Motion Ready
                </span>
              </div>
              <div className="flex rounded-lg bg-black/40 p-1 border border-white/10">
                {(["sm", "md", "lg"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setLoaderSize(s)}
                    className={`px-2.5 py-1 text-xs uppercase font-mono rounded font-medium transition-colors ${
                      loaderSize === s
                        ? "bg-[#0B7CEB] text-white"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-[#060E1A] p-8 flex items-center justify-center min-h-[220px]">
              <ETALoader
                theme="dark"
                size={loaderSize}
                label="Initializing Academy Engine..."
              />
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between text-xs text-slate-400 border-t border-white/5 pt-3">
            <span>Sequence: Brackets → Arrow → Cap Rim → Settle</span>
            <span className="font-mono text-emerald-400">0ms Layout Shift</span>
          </div>
        </div>
      </div>
    </div>
  );
};
