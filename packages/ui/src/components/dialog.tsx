import { type ComponentPropsWithoutRef, forwardRef } from 'react';

import { cn } from '../utils.js';

export type DialogProps = ComponentPropsWithoutRef<'dialog'>;

export const Dialog = forwardRef<HTMLDialogElement, DialogProps>(({ className, ...props }, ref) => {
  return (
    <dialog
      ref={ref}
      className={cn(
        'fixed top-1/2 left-1/2 max-h-[85vh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-lg border border-gray-200 bg-white p-6 text-gray-950 shadow-lg backdrop:bg-black/40 focus:outline-none',
        className
      )}
      {...props}
    />
  );
});

Dialog.displayName = 'Dialog';

export type DialogHeaderProps = ComponentPropsWithoutRef<'div'>;

export const DialogHeader = forwardRef<HTMLDivElement, DialogHeaderProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('flex flex-col gap-1.5 text-center sm:text-left', className)}
        {...props}
      />
    );
  }
);

DialogHeader.displayName = 'DialogHeader';

export type DialogTitleProps = ComponentPropsWithoutRef<'h2'>;

export const DialogTitle = forwardRef<HTMLHeadingElement, DialogTitleProps>(
  ({ className, ...props }, ref) => {
    return (
      <h2 ref={ref} className={cn('text-lg leading-none font-semibold', className)} {...props} />
    );
  }
);

DialogTitle.displayName = 'DialogTitle';

export type DialogDescriptionProps = ComponentPropsWithoutRef<'p'>;

export const DialogDescription = forwardRef<HTMLParagraphElement, DialogDescriptionProps>(
  ({ className, ...props }, ref) => {
    return <p ref={ref} className={cn('text-sm text-gray-600', className)} {...props} />;
  }
);

DialogDescription.displayName = 'DialogDescription';

export type DialogContentProps = ComponentPropsWithoutRef<'div'>;

export const DialogContent = forwardRef<HTMLDivElement, DialogContentProps>(
  ({ className, ...props }, ref) => {
    return <div ref={ref} className={cn('mt-4 grid gap-4', className)} {...props} />;
  }
);

DialogContent.displayName = 'DialogContent';

export type DialogFooterProps = ComponentPropsWithoutRef<'div'>;

export const DialogFooter = forwardRef<HTMLDivElement, DialogFooterProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end', className)}
        {...props}
      />
    );
  }
);

DialogFooter.displayName = 'DialogFooter';
