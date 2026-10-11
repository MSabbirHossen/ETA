import React from "react";
import Image from "next/image";

export interface ETAIconProps {
  theme?: "dark" | "light" | "monochrome";
  size?: number;
  className?: string;
  alt?: string;
  priority?: boolean;
}

/**
 * Official ETA Brand Icon Symbol Component
 * Dedicated compact mark for navigation items, sidebars, dashboard headers, and avatars.
 */
export const ETAIcon: React.FC<ETAIconProps> = ({
  theme = "dark",
  size = 32,
  className = "",
  alt = "ETA Icon",
  priority = false,
}) => {
  const iconSrc =
    theme === "monochrome"
      ? "/brand/svg/eta-symbol-monochrome.svg"
      : "/brand/svg/eta-symbol.svg";

  return (
    <div
      className={`inline-flex items-center justify-center shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      <Image
        src={iconSrc}
        alt={alt}
        width={size}
        height={size}
        priority={priority}
        className="object-contain"
        unoptimized
      />
    </div>
  );
};
