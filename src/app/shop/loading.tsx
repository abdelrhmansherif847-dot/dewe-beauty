import { ProductGridSkeleton } from "@/components/product/product-card";
import { CollectionIntro } from "@/components/shop/collection-intro";
import { ShopShellSkeleton } from "@/components/shop/shop-shell";

export default function Loading() {
  return (
    <div className="collection-page">
      <CollectionIntro />
      <div className="container">
        <ShopShellSkeleton>
          <ProductGridSkeleton count={6} variant="collection" />
        </ShopShellSkeleton>
      </div>
    </div>
  );
}
