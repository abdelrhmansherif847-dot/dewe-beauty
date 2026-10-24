"use client";

import { startTransition, type FormEvent } from "react";

/**
 * Submit handler for forms driven by useActionState. Passing the action to
 * `<form action>` makes React clear every field once the action finishes,
 * which wipes what the customer typed when the server answers with an error.
 * Dispatching from onSubmit keeps the fields as they are.
 */
export function keepFieldsOnSubmit(dispatch: (formData: FormData) => void) {
  return (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const formData = new FormData(event.currentTarget, submitter);
    startTransition(() => dispatch(formData));
  };
}
