"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", background: "#FFF6F0", color: "#3E2B26", padding: "4rem 1.5rem", textAlign: "center" }}>
        <p style={{ letterSpacing: "0.3em" }}>DEWÉ BEAUTY</p>
        <h1 style={{ fontFamily: "Georgia, serif", fontWeight: 400 }}>Something went wrong</h1>
        <p>Please try again. Your bag is saved on this device.</p>
        <button
          type="button"
          onClick={reset}
          style={{ marginTop: 16, padding: "12px 28px", borderRadius: 999, border: 0, background: "#3E2B26", color: "#FFF6F0" }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
