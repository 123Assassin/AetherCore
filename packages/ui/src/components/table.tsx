import { type ComponentPropsWithoutRef, type ComponentRef, forwardRef } from 'react';

import { cn } from '../utils.js';

export type TableProps = ComponentPropsWithoutRef<'table'>;

export const Table = forwardRef<ComponentRef<'table'>, TableProps>(
  ({ className, ...props }, ref) => {
    return (
      <div className="w-full overflow-x-auto">
        <table
          ref={ref}
          className={cn('w-full caption-bottom border-collapse text-sm', className)}
          {...props}
        />
      </div>
    );
  }
);

Table.displayName = 'Table';

export type TableHeaderProps = ComponentPropsWithoutRef<'thead'>;

export const TableHeader = forwardRef<ComponentRef<'thead'>, TableHeaderProps>(
  ({ className, ...props }, ref) => {
    return <thead ref={ref} className={cn('border-b border-gray-200', className)} {...props} />;
  }
);

TableHeader.displayName = 'TableHeader';

export type TableBodyProps = ComponentPropsWithoutRef<'tbody'>;

export const TableBody = forwardRef<ComponentRef<'tbody'>, TableBodyProps>(
  ({ className, ...props }, ref) => {
    return <tbody ref={ref} className={cn('[&_tr:last-child]:border-0', className)} {...props} />;
  }
);

TableBody.displayName = 'TableBody';

export type TableFooterProps = ComponentPropsWithoutRef<'tfoot'>;

export const TableFooter = forwardRef<ComponentRef<'tfoot'>, TableFooterProps>(
  ({ className, ...props }, ref) => {
    return (
      <tfoot
        ref={ref}
        className={cn(
          'border-t border-gray-200 bg-gray-50 font-medium [&>tr]:last:border-b-0',
          className
        )}
        {...props}
      />
    );
  }
);

TableFooter.displayName = 'TableFooter';

export type TableRowProps = ComponentPropsWithoutRef<'tr'>;

export const TableRow = forwardRef<ComponentRef<'tr'>, TableRowProps>(
  ({ className, ...props }, ref) => {
    return (
      <tr
        ref={ref}
        className={cn('border-b border-gray-200 transition-colors hover:bg-gray-50', className)}
        {...props}
      />
    );
  }
);

TableRow.displayName = 'TableRow';

export type TableHeadProps = ComponentPropsWithoutRef<'th'>;

export const TableHead = forwardRef<ComponentRef<'th'>, TableHeadProps>(
  ({ className, ...props }, ref) => {
    return (
      <th
        ref={ref}
        className={cn('h-10 px-2 text-left align-middle font-medium text-gray-600', className)}
        {...props}
      />
    );
  }
);

TableHead.displayName = 'TableHead';

export type TableCellProps = ComponentPropsWithoutRef<'td'>;

export const TableCell = forwardRef<ComponentRef<'td'>, TableCellProps>(
  ({ className, ...props }, ref) => {
    return <td ref={ref} className={cn('p-2 align-middle', className)} {...props} />;
  }
);

TableCell.displayName = 'TableCell';

export type TableCaptionProps = ComponentPropsWithoutRef<'caption'>;

export const TableCaption = forwardRef<ComponentRef<'caption'>, TableCaptionProps>(
  ({ className, ...props }, ref) => {
    return <caption ref={ref} className={cn('mt-4 text-sm text-gray-600', className)} {...props} />;
  }
);

TableCaption.displayName = 'TableCaption';
