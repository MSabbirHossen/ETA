import React from "react";
import Image from "next/image";

export interface ETALoaderProps {
  theme?: "dark" | "light";
  size?: "sm" | "md" | "lg" | number;
  label?: string;
  className?: string;
}

/**
 * Official ETA Brand Animated Loader Component
 * Implements the brand sequence: chevrons expand -> arrow ascends -> skullcap settles.
 * Built-in prefers-reduced-motion support.
 */
export const ETALoader: React.FC<ETALoaderProps> = ({
  theme = "dark",
  size = "md",
  label = "Loading Exploratory Training Academy...",
  className = "",
}) => {
  const pixelSize =
    typeof size === "number"
      ? size
      : size === "sm"
      ? 32
      : size === "lg"
      ? 96
      : 64;

  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      <div
        className="inline-flex items-center justify-center shrink-0"
        style={{ width: pixelSize, height: pixelSize }}
        role="status"
        aria-label={label}
      >
        <Image
          src="/brand/animation/eta-loader.svg"
          alt=""
          width={pixelSize}
          height={pixelSize}
          className="object-contain"
          unoptimized
          priority
        />
      </div>
      {label && size !== "sm" && (
        <span
          className={`text-xs font-semibold tracking-wider uppercase font-mono transition-colors ${
            theme === "dark" ? "text-[#16C4FF]/80" : "text-[#073C84]/80"
          }`}
        >
          {label}
        </span>
      )}
    </div>
  );
};
