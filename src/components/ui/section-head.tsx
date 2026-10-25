import Link from "next/link";
import type { ReactNode } from "react";

export function SectionHead({
  index,
  eyebrow,
  title,
  action,
}: {
  index?: string;
  eyebrow?: string;
  title: ReactNode;
  action?: { href: string; label: string };
}) {
  return (
    <div className="section-head" data-reveal>
      <div className="stack" style={{ "--stack-gap": "0.75rem" } as React.CSSProperties}>
        {eyebrow && (
          <p className="eyebrow">
            {index && <span className="section-head__index">{index}</span>}
            {eyebrow}
          </p>
        )}
        <h2 className="title-lg">{title}</h2>
      </div>
      {action && (
        <Link href={action.href} className="link-underline eyebrow" style={{ color: "var(--text)" }}>
          {action.label} →
        </Link>
      )}
    </div>
  );
}
