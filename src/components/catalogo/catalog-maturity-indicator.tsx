import { Badge } from "@/components/ui/badge";
import { CATALOG_MATURITY_TARGET, CATEGORY_LABEL } from "@/components/catalogo/constants";
import type { ProductCategory } from "@/types/catalog";

const CATEGORIES: ProductCategory[] = ["miniatura_colecionavel", "personalizado", "utilitario", "linha_leon"];

interface CatalogMaturityIndicatorProps {
  activeCountByCategory: Partial<Record<ProductCategory, number>>;
}

// Apoio visual ao critério de avanço de fase do roadmap de negócio (ver
// Requirement "Indicador de maturidade do catálogo por categoria"):
// 15-20 peças ativas por categoria, referência fixa em CATALOG_MATURITY_TARGET.
export function CatalogMaturityIndicator({ activeCountByCategory }: CatalogMaturityIndicatorProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {CATEGORIES.map((category) => {
        const count = activeCountByCategory[category] ?? 0;
        const reached = count >= CATALOG_MATURITY_TARGET;
        return (
          <Badge key={category} variant={reached ? "secondary" : "outline"} className="gap-1.5 font-normal">
            <span className="font-medium text-foreground">{CATEGORY_LABEL[category]}</span>
            <span className="text-muted-foreground">
              {count}/{CATALOG_MATURITY_TARGET} ativas
            </span>
          </Badge>
        );
      })}
    </div>
  );
}
