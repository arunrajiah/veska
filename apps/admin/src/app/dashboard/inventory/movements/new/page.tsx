import { Suspense } from 'react';
import MovementForm from './movement-form.js';

export default function NewMovementPage() {
  return (
    <Suspense>
      <MovementForm />
    </Suspense>
  );
}
