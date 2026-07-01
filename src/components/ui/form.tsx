import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { Slot } from "@radix-ui/react-slot";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import {
  Controller,
  ControllerProps,
  FieldPath,
  FieldValues,
  FormProvider,
  useFormContext,
} from "react-hook-form";

import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

const Form = FormProvider;

type FormFieldContextValue<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> = { name: TName };

const FormFieldContext = React.createContext<FormFieldContextValue>({} as FormFieldContextValue);

const FormField = <
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  ...props
}: ControllerProps<TFieldValues, TName>) => (
  <FormFieldContext.Provider value={{ name: props.name }}>
    <Controller {...props} />
  </FormFieldContext.Provider>
);

const useFormField = () => {
  const fieldContext = React.useContext(FormFieldContext);
  const itemContext = React.useContext(FormItemContext);
  const { getFieldState, formState } = useFormContext();

  if (!fieldContext) throw new Error("useFormField should be used within <FormField>");

  const fieldState = getFieldState(fieldContext.name, formState);
  const { id } = itemContext;

  return {
    id,
    name: fieldContext.name,
    formItemId: `${id}-form-item`,
    formDescriptionId: `${id}-form-item-description`,
    formMessageId: `${id}-form-item-message`,
    ...fieldState,
  };
};

type FormItemContextValue = { id: string };
const FormItemContext = React.createContext<FormItemContextValue>({} as FormItemContextValue);

const FormItem = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    const id = React.useId();
    return (
      <FormItemContext.Provider value={{ id }}>
        <div ref={ref} className={cn("space-y-1.5", className)} {...props} />
      </FormItemContext.Provider>
    );
  },
);
FormItem.displayName = "FormItem";

interface FormLabelProps extends React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> {
  required?: boolean;
  optional?: boolean;
}

const FormLabel = React.forwardRef<React.ElementRef<typeof LabelPrimitive.Root>, FormLabelProps>(
  ({ className, required, optional, children, ...props }, ref) => {
    const { error, formItemId } = useFormField();
    return (
      <Label
        ref={ref}
        htmlFor={formItemId}
        className={cn(
          "flex items-center gap-1.5 text-sm font-medium text-foreground/90 transition-colors",
          error && "text-destructive",
          className,
        )}
        {...props}
      >
        <span>{children}</span>
        {required ? (
          <span aria-hidden="true" className="text-destructive/80">*</span>
        ) : null}
        {optional ? (
          <span className="text-[11px] font-normal text-muted-foreground">(optional)</span>
        ) : null}
      </Label>
    );
  },
);
FormLabel.displayName = "FormLabel";

const FormControl = React.forwardRef<React.ElementRef<typeof Slot>, React.ComponentPropsWithoutRef<typeof Slot>>(
  ({ ...props }, ref) => {
    const { error, formItemId, formDescriptionId, formMessageId } = useFormField();
    return (
      <Slot
        ref={ref}
        id={formItemId}
        aria-describedby={!error ? formDescriptionId : `${formDescriptionId} ${formMessageId}`}
        aria-invalid={!!error}
        {...props}
      />
    );
  },
);
FormControl.displayName = "FormControl";

const FormDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => {
    const { formDescriptionId } = useFormField();
    return (
      <p
        ref={ref}
        id={formDescriptionId}
        className={cn("text-xs leading-relaxed text-muted-foreground", className)}
        {...props}
      />
    );
  },
);
FormDescription.displayName = "FormDescription";

const FormMessage = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, children, ...props }, ref) => {
    const { error, formMessageId } = useFormField();
    const body = error ? String(error?.message) : children;

    return (
      <AnimatePresence mode="wait" initial={false}>
        {body ? (
          <motion.p
            key={String(body)}
            ref={ref as any}
            id={formMessageId}
            role={error ? "alert" : undefined}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              "flex items-start gap-1.5 text-xs font-medium",
              error ? "text-destructive" : "text-emerald-500",
              className,
            )}
            {...(props as any)}
          >
            {error ? (
              <AlertCircle className="mt-[1px] size-3.5 shrink-0" aria-hidden="true" />
            ) : (
              <CheckCircle2 className="mt-[1px] size-3.5 shrink-0" aria-hidden="true" />
            )}
            <span>{body}</span>
          </motion.p>
        ) : null}
      </AnimatePresence>
    );
  },
);
FormMessage.displayName = "FormMessage";

interface FormCounterProps extends React.HTMLAttributes<HTMLSpanElement> {
  current: number;
  max: number;
}

const FormCounter = React.forwardRef<HTMLSpanElement, FormCounterProps>(
  ({ current, max, className, ...props }, ref) => {
    const pct = Math.min(current / max, 1);
    const near = pct >= 0.85 && pct < 1;
    const over = current > max;
    return (
      <span
        ref={ref}
        aria-live="polite"
        className={cn(
          "ml-auto text-[11px] tabular-nums text-muted-foreground",
          near && "text-amber-500",
          over && "text-destructive font-medium",
          className,
        )}
        {...props}
      >
        {current}/{max}
      </span>
    );
  },
);
FormCounter.displayName = "FormCounter";

export {
  useFormField,
  Form,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  FormField,
  FormCounter,
};
