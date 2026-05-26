import { useState, useCallback } from 'react';
import type { SignInForm } from '@kinho/shared-types';

export function useSignInForm(workOrderId: number) {
  const [location, setLocation] = useState('');
  const [note, setNote] = useState('');
  const [photoCount, setPhotoCount] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const isValid = photoCount > 0 && location.length > 0;

  const buildPayload = useCallback((): SignInForm => ({
    workOrderId,
    location,
    remark: note || undefined,
    photos: [],
  }), [workOrderId, location, note]);

  return {
    location, setLocation,
    note, setNote,
    photoCount, setPhotoCount,
    submitting, setSubmitting,
    isValid,
    buildPayload,
  };
}
