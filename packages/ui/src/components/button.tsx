import { type ComponentPropsWithoutRef, forwardRef } from 'react';

import { cn } from '../utils.js';

const buttonVariants = {
  default: 'bg-teal-700 text-white hover:bg-teal-800',
  destructive: 'bg-red-600 text-white hover:bg-red-700',
  ghost: 'text-gray-900 hover:bg-gray-100',
  link: 'h-auto px-0 text-teal-700 underline-offset-4 hover:underline',
  outline: 'border border-gray-300 bg-white text-gray-900 hover:bg-gray-50',
  secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200',
} as const;

const buttonSizes = {
  default: 'h-9 px-4 py-2',
  icon: 'size-9',
  lg: 'h-10 px-6',
  sm: 'h-8 px-3 text-sm',
} as const;

export type ButtonVariant = keyof typeof buttonVariants;
export type ButtonSize = keyof typeof buttonSizes;

export type ButtonProps = ComponentPropsWithoutRef<'button'> & {
  size?: ButtonSize;
  variant?: ButtonVariant;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, size = 'default', type = 'button', variant = 'default', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-teal-700/25 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
          buttonVariants[variant],
          buttonSizes[size],
          className
        )}
        type={type}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';
