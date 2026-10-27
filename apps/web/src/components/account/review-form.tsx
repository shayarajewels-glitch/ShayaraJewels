'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Star } from 'lucide-react';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { createReviewSchema, type CreateReviewInput } from '@shayara/shared';
import { Button } from '@/components/ui/button';
import { Field, Input, Textarea } from '@/components/ui/form-controls';
import { Alert } from '@/components/ui/misc';
import { applyApiErrors } from '@/hooks/use-api-form';
import { api } from '@/lib/api-client';
import { cn } from '@/lib/utils';

export function ReviewForm({ productId, onDone }: { productId: string; onDone: () => void }) {
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CreateReviewInput>({ resolver: zodResolver(createReviewSchema), defaultValues: { rating: 0 } });

  return (
    <form
      noValidate
      className="space-y-5"
      onSubmit={handleSubmit(async (values) => {
        setFormError(null);
        try {
          await api(`/products/${productId}/reviews`, { method: 'POST', body: values });
          onDone();
        } catch (err) {
          setFormError(applyApiErrors(err, setError, ['rating', 'title', 'comment']));
        }
      })}
    >
      {formError && <Alert variant="error">{formError}</Alert>}
      <Controller
        control={control}
        name="rating"
        render={({ field }) => (
          <fieldset>
            <legend className="mb-2 text-sm font-medium">Your rating</legend>
            <div className="flex gap-1" role="radiogroup" aria-label="Rating">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" role="radio" aria-checked={field.value === n} aria-label={`${n} star${n > 1 ? 's' : ''}`} onClick={() => field.onChange(n)} className="p-1">
                  <Star className={cn('size-7', n <= field.value ? 'fill-champagne text-champagne' : 'text-sand')} />
                </button>
              ))}
            </div>
            {errors.rating && (
              <p role="alert" className="mt-1 text-xs text-danger">
                {errors.rating.message}
              </p>
            )}
          </fieldset>
        )}
      />
      <Field id="review-title" label="Title" error={errors.title?.message}>
        <Input {...register('title')} maxLength={100} />
      </Field>
      <Field id="review-comment" label="Your review" error={errors.comment?.message} hint="How does it look, feel and wear?">
        <Textarea {...register('comment')} maxLength={2000} />
      </Field>
      <Button type="submit" loading={isSubmitting}>
        Submit review
      </Button>
    </form>
  );
}
