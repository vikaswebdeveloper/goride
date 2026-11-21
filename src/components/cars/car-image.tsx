import Image from "next/image";
import { cn } from "@/lib/utils";

export function CarImage({ src, alt, className, priority }: { src: string; alt: string; className?: string; priority?: boolean }) {
  // Placeholder art is SVG, which next/image serves as-is (unoptimized). Real photos get optimised automatically.
  return (
    <div className={cn("relative aspect-[18/11] overflow-hidden bg-secondary", className)}>
      <Image src={src} alt={alt} fill sizes="(min-width:1024px) 25vw, (min-width:640px) 50vw, 100vw" unoptimized={src.endsWith(".svg")} priority={priority} className="object-cover" />
    </div>
  );
}
