"use client";

import { forwardRef, HTMLAttributes, ElementType, ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface CardProps extends HTMLAttributes<HTMLElement> {
  hover?: boolean;
  glow?: boolean;
  gradient?: boolean;
  as?: ElementType;
  padding?: string;
  children?: ReactNode;
}

export const Card = forwardRef<HTMLElement, CardProps>(function Card(
  { hover = false, glow = false, gradient = false, as: Tag = "div", padding = "p-6", className, children, ...rest },
  ref
) {
  const Component = Tag as ElementType;
  return (
    <Component
      ref={ref as never}
      className={cn(
        "card",
        padding,
        "rounded-2xl border border-border-subtle",
        hover && "card-hover",
        glow && "glow-tempo",
        gradient && "bg-gradient-card",
        className
      )}
      {...rest}
    >
      {children}
    </Component>
  );
});

export function CardHeader({
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex items-start justify-between gap-4 mb-4", className)}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardTitle({
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn(
        "font-display text-lg font-semibold text-text-primary tracking-tight",
        className
      )}
      {...rest}
    >
      {children}
    </h3>
  );
}

export function CardSubtitle({
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn("text-sm text-text-secondary mt-1", className)}
      {...rest}
    >
      {children}
    </p>
  );
}
