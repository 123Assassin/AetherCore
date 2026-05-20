import { type ComponentPropsWithoutRef, forwardRef } from 'react';

import { cn } from '../utils.js';

export type InputProps = ComponentPropsWithoutRef<'input'>;

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          'flex h-9 w-full min-w-0 rounded-md border border-gray-300 bg-white px-3 py-1 text-sm text-gray-950 shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus-visible:border-teal-700 focus-visible:ring-2 focus-visible:ring-teal-700/20 focus-visible:outline-none disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500',
          className
        )}
        type={type}
        {...props}
      />
    );
  }
);

Input.displayName = 'Input';
