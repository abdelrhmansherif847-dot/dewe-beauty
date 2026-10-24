export default function Loading() {
  return (
    <div className="container" style={{ paddingTop: "4rem" }} aria-busy="true" aria-label="Loading product">
      <div className="pdp">
        <div className="skeleton" style={{ aspectRatio: "4 / 5", borderRadius: 28 }} />
        <div className="stack" style={{ "--stack-gap": "1rem" } as React.CSSProperties}>
          <div className="skeleton" style={{ height: 14, width: "30%" }} />
          <div className="skeleton" style={{ height: 56, width: "90%" }} />
          <div className="skeleton" style={{ height: 20, width: "70%" }} />
          <div className="skeleton" style={{ height: 32, width: "25%" }} />
          <div className="skeleton" style={{ height: 48, width: "100%", borderRadius: 999 }} />
        </div>
      </div>
    </div>
  );
}
