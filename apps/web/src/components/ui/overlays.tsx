'use client';

import { X } from 'lucide-react';
import { Accordion as AccordionPrimitive, Dialog as DialogPrimitive } from 'radix-ui';
import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

/* ------------------------------- Sheet / Dialog ------------------------------ */

export const Sheet = DialogPrimitive.Root;
export const SheetTrigger = DialogPrimitive.Trigger;
export const SheetClose = DialogPrimitive.Close;

export function SheetContent({
  side = 'right',
  title,
  description,
  className,
  children,
}: {
  side?: 'left' | 'right';
  title: string;
  description?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
      <DialogPrimitive.Content
        className={cn(
          'fixed inset-y-0 z-50 flex w-[88vw] max-w-md flex-col bg-ivory shadow-xl duration-300 data-[state=open]:animate-in data-[state=closed]:animate-out',
          side === 'right'
            ? 'right-0 data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right'
            : 'left-0 data-[state=open]:slide-in-from-left data-[state=closed]:slide-out-to-left',
          className,
        )}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <DialogPrimitive.Title className="font-display text-2xl">{title}</DialogPrimitive.Title>
          <DialogPrimitive.Close className="rounded-sm p-2 text-charcoal hover:bg-ivory-deep" aria-label="Close">
            <X className="size-5" />
          </DialogPrimitive.Close>
        </div>
        {description ? (
          <DialogPrimitive.Description className="sr-only">{description}</DialogPrimitive.Description>
        ) : (
          <DialogPrimitive.Description className="sr-only">{title}</DialogPrimitive.Description>
        )}
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export function DialogContent({ title, description, className, children }: { title: string; description?: string; className?: string; children: React.ReactNode }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
      <DialogPrimitive.Content
        className={cn(
          'fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[92vw] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-md bg-ivory p-6 shadow-xl data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
          className,
        )}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <DialogPrimitive.Title className="font-display text-2xl">{title}</DialogPrimitive.Title>
            {description && <DialogPrimitive.Description className="mt-1 text-sm text-charcoal-soft">{description}</DialogPrimitive.Description>}
          </div>
          <DialogPrimitive.Close className="rounded-sm p-1.5 hover:bg-ivory-deep" aria-label="Close">
            <X className="size-5" />
          </DialogPrimitive.Close>
        </div>
        {!description && <DialogPrimitive.Description className="sr-only">{title}</DialogPrimitive.Description>}
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

/* --------------------------------- Accordion --------------------------------- */

export const Accordion = AccordionPrimitive.Root;

export function AccordionItem({ value, title, children }: { value: string; title: string; children: React.ReactNode }) {
  return (
    <AccordionPrimitive.Item value={value} className="border-b border-border">
      <AccordionPrimitive.Header>
        <AccordionPrimitive.Trigger className="group flex w-full items-center justify-between py-4 text-left text-sm font-semibold tracking-wide text-charcoal">
          {title}
          <ChevronDown className="size-4 transition-transform duration-200 group-data-[state=open]:rotate-180" aria-hidden />
        </AccordionPrimitive.Trigger>
      </AccordionPrimitive.Header>
      <AccordionPrimitive.Content className="overflow-hidden text-sm leading-6 text-charcoal-soft data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
        <div className="pb-5">{children}</div>
      </AccordionPrimitive.Content>
    </AccordionPrimitive.Item>
  );
}
