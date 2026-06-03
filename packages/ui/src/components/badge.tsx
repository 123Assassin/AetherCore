import { type ComponentPropsWithoutRef, forwardRef } from 'react';

import { cn } from '../utils.js';

const badgeVariants = {
  default: 'border-transparent bg-teal-700 text-white',
  destructive: 'border-transparent bg-red-600 text-white',
  outline: 'border-gray-300 text-gray-900',
  secondary: 'border-transparent bg-gray-100 text-gray-900',
} as const;

export type BadgeVariant = keyof typeof badgeVariants;

export type BadgeProps = ComponentPropsWithoutRef<'span'> & {
  variant?: BadgeVariant;
};

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors',
          badgeVariants[variant],
          className
        )}
        {...props}
      />
    );
  }
);

Badge.displayName = 'Badge';
