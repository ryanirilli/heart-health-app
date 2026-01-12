"use client";

import { useState } from "react";
import Image, { ImageProps } from "next/image";
import { cn } from "@/lib/utils";

export function FadeInImage({ className, ...props }: ImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <Image
      {...props}
      className={cn(
        "transition-opacity duration-500 ease-out",
        isLoaded ? "opacity-100" : "opacity-0",
        className
      )}
      onLoad={() => setIsLoaded(true)}
    />
  );
}

