import DOMPurify from "dompurify";
import type { CSSProperties } from "react";

interface SafeHTMLProps {
  html: string;
  className?: string;
  style?: CSSProperties;
}

export function SafeHTML({ html, className, style }: SafeHTMLProps) {
  const sanitized = DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    // Disallow potentially dangerous protocols
    FORBID_ATTR: ["onerror", "onload"],
    FORBID_TAGS: ["script", "style", "iframe", "object", "embed"],
  });

  return <div className={className} style={style} dangerouslySetInnerHTML={{ __html: sanitized }} />;
}
