import { useEffect, useState } from "react";

interface PactpayLogoProps {
  size?: "sm" | "md" | "lg";
}

const PactpayLogo = ({ size = "md" }: PactpayLogoProps) => {
  const sizes = { sm: { w: 110, h: 30 }, md: { w: 140, h: 38 }, lg: { w: 200, h: 54 } };
  const { w, h } = sizes[size];

  const [isDark, setIsDark] = useState(
    document.documentElement.classList.contains("dark")
  );

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  const pactColor = isDark ? "#ffffff" : "#0F1B2D";

  return (
    <svg width={w} height={h} viewBox="0 0 140 38" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="pg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00E591"/>
          <stop offset="100%" stopColor="#00A86B"/>
        </linearGradient>
      </defs>
      <path d="M19 5 C19 5 9 2 5 -1 L5 16 C5 24 11 30 19 33 C27 30 33 24 33 16 L33 -1 C29 2 19 5 19 5 Z" fill="url(#pg)"/>
      <path d="M11 17 L16 23 L27 11" stroke="#0F1B2D" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      <text x="40" y="26"
        fontFamily="-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
        fontSize="20" fontWeight="700" letterSpacing="-0.5"
        fill={pactColor}>
        Pact<tspan fill="#00D485">pay</tspan>
      </text>
    </svg>
  );
};

export default PactpayLogo;
