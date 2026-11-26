"use client";

import React from 'react';

export interface AgentixLogoProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  variant?: 'solar-gold' | 'alabaster' | 'celestial-teal' | 'monochrome' | 'current';
  showGlow?: boolean;
  className?: string;
}

/**
 * Agentix Sacred Geometry Logo
 * 
 * Numerological & Astrological Harmonic Architecture:
 * - Number 1 (Sun / Surya): The Ascendant Apex of 'A', symbolizing sovereign visionary leadership, creation, and AI intellect.
 * - Number 8 (Saturn / Lemniscate): The continuous infinity base loop, embodying eternal cycles, institutional endurance, and karmic wealth.
 * - Number 3 (Jupiter / Guru): Trinity of vertex nodes representing wisdom, synthetic reasoning, and expanding multi-agent orchestration.
 * - Numerological Sum 9 (1 + 8 = 9, Mars / Victory): Invincible completion, supreme precision, zero-entropy execution.
 * - Golden Ratio (Phi = 1.618): Geometric proportions of height to base ribbon curvature.
 */
export const AgentixLogo: React.FC<AgentixLogoProps> = ({
  size = 28,
  variant = 'solar-gold',
  showGlow = false,
  className = '',
  ...props
}) => {
  // Sacred geometry path generated from authentic continuous Mobius ribbon
  const pathData = "M 466.82 159.10 L 475.87 156.68 L 503.42 154.91 L 530.97 157.95 L 551.63 165.27 L 572.30 177.27 L 590.00 193.54 L 601.88 207.31 L 612.07 227.98 L 664.22 317.52 L 666.79 324.41 L 691.38 365.73 L 728.66 434.61 L 733.86 441.50 L 730.72 446.71 L 661.84 432.11 L 606.74 426.78 L 572.30 427.25 L 530.97 432.39 L 482.76 446.26 L 448.32 459.23 L 413.88 475.14 L 379.44 494.54 L 338.11 522.93 L 283.01 569.73 L 240.13 613.69 L 211.96 648.13 L 197.75 668.80 L 183.27 696.35 L 179.10 717.01 L 183.59 737.68 L 186.58 744.21 L 190.69 751.45 L 200.36 762.31 L 214.13 774.13 L 227.91 780.85 L 241.68 782.28 L 255.46 781.28 L 283.01 768.05 L 303.67 752.18 L 365.66 694.05 L 406.99 660.32 L 455.20 626.35 L 503.42 597.04 L 558.52 569.68 L 592.96 556.94 L 620.51 549.60 L 654.95 543.97 L 689.39 543.97 L 723.83 549.62 L 744.49 556.73 L 772.04 569.19 L 799.60 585.19 L 832.29 613.69 L 850.54 634.36 L 863.62 655.02 L 869.95 668.80 L 878.31 696.35 L 880.00 723.90 L 877.73 751.45 L 870.24 772.11 L 857.28 792.78 L 840.92 809.64 L 813.37 828.63 L 799.60 835.96 L 778.93 842.90 L 751.38 845.09 L 723.83 842.01 L 703.17 834.31 L 668.73 814.09 L 643.98 792.78 L 599.85 749.87 L 565.41 722.47 L 522.79 696.35 L 530.97 692.12 L 558.52 688.35 L 572.30 688.82 L 606.74 694.38 L 648.06 714.37 L 668.73 729.73 L 696.28 754.98 L 716.94 768.39 L 744.49 780.82 L 758.27 781.96 L 772.04 780.90 L 785.82 773.67 L 794.18 765.23 L 802.52 751.45 L 808.25 737.68 L 811.25 717.01 L 808.47 689.46 L 801.69 675.69 L 792.71 663.35 L 772.04 643.30 L 758.27 632.94 L 730.72 619.45 L 696.28 611.28 L 654.95 610.94 L 613.62 617.98 L 572.30 631.56 L 524.08 653.67 L 489.64 674.61 L 462.09 695.61 L 358.78 784.11 L 324.34 815.48 L 303.67 829.53 L 289.90 835.84 L 262.35 842.36 L 241.68 843.19 L 214.13 837.78 L 193.47 829.89 L 172.80 817.43 L 152.14 800.60 L 135.52 779.00 L 128.42 765.23 L 121.61 744.56 L 120.04 710.12 L 123.37 682.57 L 130.17 661.91 L 333.85 317.52 L 335.86 310.63 L 353.59 283.08 L 390.70 214.20 L 406.99 194.33 L 422.77 179.76 L 434.54 171.47 L 448.32 164.55 L 466.82 159.10 Z M 472.63 221.09 L 482.76 217.49 L 489.64 216.86 L 510.31 217.65 L 517.20 219.17 L 537.86 231.61 L 547.44 241.75 L 615.61 358.85 L 613.62 361.75 L 606.74 363.19 L 579.19 364.86 L 530.97 370.64 L 496.53 377.37 L 448.32 390.64 L 406.99 406.24 L 386.33 416.99 L 379.44 418.80 L 372.55 423.69 L 365.66 426.12 L 331.78 448.39 L 328.96 448.39 L 328.64 441.50 L 334.43 434.61 L 336.92 427.72 L 346.71 413.95 L 453.51 234.86 L 462.09 227.06 L 472.63 221.09 Z";

  const idSuffix = React.useId().replace(/:/g, '');

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 1000 1000"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block transition-transform duration-300 ${className}`}
      aria-label="Agentix Astral Infinity Emblem"
      role="img"
      {...props}
    >
      <defs>
        {/* Solar Gold Astrological Gradient (Sun Surya: 1 + Saturn Shani: 8) */}
        <linearGradient id={`agentix-solar-gold-${idSuffix}`} x1="150" y1="150" x2="850" y2="850" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="38%" stopColor="#f59e0b" />
          <stop offset="70%" stopColor="#d97706" />
          <stop offset="100%" stopColor="#b45309" />
        </linearGradient>

        {/* Celestial Teal Astrological Gradient (Mercury Budha + Venus Shukra) */}
        <linearGradient id={`agentix-celestial-teal-${idSuffix}`} x1="150" y1="150" x2="850" y2="850" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#2dd4bf" />
          <stop offset="50%" stopColor="#0d9488" />
          <stop offset="100%" stopColor="#115e59" />
        </linearGradient>

        {/* Diamond Alabaster Gradient (Kethu / Pure Diamond Intellect) */}
        <linearGradient id={`agentix-alabaster-${idSuffix}`} x1="200" y1="150" x2="800" y2="850" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="70%" stopColor="#f1f5f9" />
          <stop offset="100%" stopColor="#cbd5e1" />
        </linearGradient>

        {/* Ethereal Glow Filter */}
        {showGlow && (
          <filter id={`agentix-glow-${idSuffix}`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="35" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        )}
      </defs>

      {/* Subtle Golden Ratio Cosmic Aura */}
      {showGlow && (
        <circle
          cx="500"
          cy="500"
          r="420"
          fill="url(#agentix-solar-gold-glow)"
          opacity="0.12"
          className="animate-pulse"
        />
      )}

      {/* Main Continuous Sacred Geometry Emblem */}
      <path
        d={pathData}
        fillRule="evenodd"
        clipRule="evenodd"
        fill={
          variant === 'solar-gold'
            ? `url(#agentix-solar-gold-${idSuffix})`
            : variant === 'celestial-teal'
            ? `url(#agentix-celestial-teal-${idSuffix})`
            : variant === 'alabaster'
            ? `url(#agentix-alabaster-${idSuffix})`
            : variant === 'current'
            ? 'currentColor'
            : 'currentColor'
        }
        filter={showGlow ? `url(#agentix-glow-${idSuffix})` : undefined}
      />
    </svg>
  );
};

export default AgentixLogo;
