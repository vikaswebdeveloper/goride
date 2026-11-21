import { Badge } from "@/components/ui/badge";
import { categoryLabels } from "@/config/site";
import { formatINR } from "@/utils/money";
import { CarImage } from "./car-image";
import { CarSpecs } from "./car-specs";

type Props = {
  car: { id: string; brand: string; model: string; category: keyof typeof categoryLabels; imageUrl: string; seatingCapacity: number; luggageCapacity: number; transmission: string; isAC: boolean; startingPrice: number | null; pricePerKm: number | null };
};

export function CatalogCarCard({ car }: Props) {
  return (
    <article className="group overflow-hidden rounded-2xl border bg-card shadow-soft transition duration-300 hover:-translate-y-1 hover:shadow-lift">
      <CarImage src={car.imageUrl} alt={`${car.brand} ${car.model}`} className="transition duration-500 group-hover:scale-[1.02]" />
      <div className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-semibold leading-tight">{car.brand} {car.model}</h3>
            <p className="text-xs text-muted-foreground">or similar</p>
          </div>
          <Badge variant="secondary">{categoryLabels[car.category]}</Badge>
        </div>
        <CarSpecs car={car} />
        <div className="flex items-end justify-between border-t pt-3">
          <div>
            <p className="text-xs text-muted-foreground">Starting from</p>
            <p className="text-lg font-bold">{car.startingPrice ? formatINR(car.startingPrice) : "—"}</p>
          </div>
          {car.pricePerKm && <p className="text-xs text-muted-foreground">₹{car.pricePerKm}/km</p>}
        </div>
      </div>
    </article>
  );
}
