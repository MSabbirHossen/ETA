import React from "react";
import Image from "next/image";

export interface ETALogoProps {
  variant?: "horizontal" | "stacked" | "full" | "mark";
  theme?: "dark" | "light";
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  alt?: string;
}

/**
 * Official ETA Brand Logo Component
 * Supports genuine vector SVG assets, light/dark themes, horizontal & stacked variants.
 */
export const ETALogo: React.FC<ETALogoProps> = ({
  variant = "horizontal",
  theme = "dark",
  width,
  height,
  className = "",
  priority = false,
  alt = "Exploratory Training Academy",
}) => {
  // 1. Icon / Mark Variant
  if (variant === "mark") {
    const markSrc = "/brand/svg/eta-symbol.svg";
    const resolvedSize = height || width || 40;
    return (
      <div className={`inline-flex items-center justify-center ${className}`}>
        <Image
          src={markSrc}
          alt={alt || "ETA Mark"}
          width={resolvedSize}
          height={resolvedSize}
          priority={priority}
          className="object-contain"
          unoptimized
        />
      </div>
    );
  }

  // 2. Stacked Variant (1:1 aspect ratio)
  if (variant === "stacked") {
    const stackedSrc =
      theme === "light"
        ? "/brand/svg/eta-logo-stacked-light.svg"
        : "/brand/svg/eta-logo-stacked-dark.svg";

    const resolvedSize = height || width || 120;
    return (
      <div className={`inline-flex items-center justify-center ${className}`}>
        <Image
          src={stackedSrc}
          alt={alt}
          width={resolvedSize}
          height={resolvedSize}
          priority={priority}
          className="object-contain"
          unoptimized
        />
      </div>
    );
  }

  // 3. Horizontal / Full Navbar Variant (1620:460 -> ~3.52:1 aspect ratio)
  const logoSrc =
    theme === "light"
      ? "/brand/svg/eta-logo-horizontal-light.svg"
      : "/brand/svg/eta-logo-horizontal-dark.svg";

  const resolvedHeight = height || (width ? Math.round(width / 3.52) : 38);
  const resolvedWidth = width || Math.round(resolvedHeight * 3.52);

  return (
    <div className={`inline-flex items-center ${className}`}>
      <Image
        src={logoSrc}
        alt={alt}
        width={resolvedWidth}
        height={resolvedHeight}
        priority={priority}
        className="object-contain"
        unoptimized
      />
    </div>
  );
};
