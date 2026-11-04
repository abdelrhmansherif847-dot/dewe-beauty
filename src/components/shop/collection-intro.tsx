/** The editorial introduction at the top of Shop All. */
export function CollectionIntro() {
  return (
    <header className="collection-intro">
      <div className="container collection-intro__inner">
        <div className="collection-intro__title">
          <p className="eyebrow collection-intro__eyebrow">
            <span>The shop</span>
            <span className="collection-intro__rule" aria-hidden="true" />
            <span>Shop all</span>
          </p>
          <h1 className="collection-intro__heading">
            Everything <em className="italic-accent">glow</em>
          </h1>
        </div>
        <p className="collection-intro__dek">
          Skincare, makeup, lips, fragrance and body care from every brand we carry, gathered in one place. Search,
          filter by category or brand, and sort to find your everyday glow.
        </p>
      </div>
    </header>
  );
}
