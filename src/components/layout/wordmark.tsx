import Link from "next/link";

export function Wordmark({ onClick }: { onClick?: () => void }) {
  return (
    <Link href="/" className="wordmark" aria-label="DEWÉ BEAUTY home" onClick={onClick}>
      <span className="wordmark__name">DEWÉ</span>
      <span className="wordmark__sub">BEAUTY</span>
    </Link>
  );
}
