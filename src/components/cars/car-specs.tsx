import { Briefcase, Fuel, Settings2, Snowflake, Users } from "lucide-react";

type Spec = { seatingCapacity: number; luggageCapacity: number; transmission: string; fuelType?: string; isAC: boolean };

const cap = (s: string) => (s === "CNG" ? s : s.charAt(0) + s.slice(1).toLowerCase());

export function CarSpecs({ car, className = "" }: { car: Spec; className?: string }) {
  const items = [
    { icon: Users, text: `${car.seatingCapacity} seats` },
    { icon: Briefcase, text: `${car.luggageCapacity} bags` },
    { icon: Settings2, text: cap(car.transmission) },
    ...(car.fuelType ? [{ icon: Fuel, text: cap(car.fuelType) }] : []),
    ...(car.isAC ? [{ icon: Snowflake, text: "AC" }] : []),
  ];
  return (
    <ul className={`flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-muted-foreground ${className}`}>
      {items.map(({ icon: I, text }) => (
        <li key={text} className="flex items-center gap-1.5"><I className="size-4 text-primary/80" aria-hidden />{text}</li>
      ))}
    </ul>
  );
}
