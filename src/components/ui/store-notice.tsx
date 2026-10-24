export function StoreNotice({ reason }: { reason: "not_configured" | "error" }) {
  return (
    <div className="note" role="status">
      <span aria-hidden="true">●</span>
      {reason === "not_configured" ? (
        <span>
          The catalogue is not connected yet. Set <code>NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
          <code>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code> to load products.
        </span>
      ) : (
        <span>We couldn&apos;t load products just now. Please refresh in a moment.</span>
      )}
    </div>
  );
}
