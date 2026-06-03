import { type ComponentPropsWithoutRef, forwardRef } from 'react';

import { cn } from '../utils.js';

export type CardProps = ComponentPropsWithoutRef<'div'>;

export const Card = forwardRef<HTMLDivElement, CardProps>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        'rounded-lg border border-gray-200 bg-white text-gray-950 shadow-sm',
        className
      )}
      {...props}
    />
  );
});

Card.displayName = 'Card';

export type CardHeaderProps = ComponentPropsWithoutRef<'div'>;

export const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, ...props }, ref) => {
    return <div ref={ref} className={cn('flex flex-col gap-1.5 p-6', className)} {...props} />;
  }
);

CardHeader.displayName = 'CardHeader';

export type CardTitleProps = ComponentPropsWithoutRef<'h3'>;

export const CardTitle = forwardRef<HTMLHeadingElement, CardTitleProps>(
  ({ className, ...props }, ref) => {
    return (
      <h3 ref={ref} className={cn('text-lg leading-none font-semibold', className)} {...props} />
    );
  }
);

CardTitle.displayName = 'CardTitle';

export type CardDescriptionProps = ComponentPropsWithoutRef<'p'>;

export const CardDescription = forwardRef<HTMLParagraphElement, CardDescriptionProps>(
  ({ className, ...props }, ref) => {
    return <p ref={ref} className={cn('text-sm text-gray-600', className)} {...props} />;
  }
);

CardDescription.displayName = 'CardDescription';

export type CardContentProps = ComponentPropsWithoutRef<'div'>;

export const CardContent = forwardRef<HTMLDivElement, CardContentProps>(
  ({ className, ...props }, ref) => {
    return <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />;
  }
);

CardContent.displayName = 'CardContent';

export type CardFooterProps = ComponentPropsWithoutRef<'div'>;

export const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, ...props }, ref) => {
    return (
      <div ref={ref} className={cn('flex items-center gap-2 p-6 pt-0', className)} {...props} />
    );
  }
);

CardFooter.displayName = 'CardFooter';
