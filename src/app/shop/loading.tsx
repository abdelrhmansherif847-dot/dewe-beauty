import { ProductGridSkeleton } from "@/components/product/product-card";

export default function Loading() {
  return (
    <div className="container" style={{ paddingTop: "8rem" }}>
      <ProductGridSkeleton />
    </div>
  );
}
