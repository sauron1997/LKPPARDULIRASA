import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

/**
 * FormField - Reusable form field component with built-in accessibility.
 * 
 * Provides consistent a11y markup (aria-invalid, aria-describedby, role="alert")
 * across all forms. Integrates seamlessly with react-hook-form.
 * 
 * @param {string} label - Field label text
 * @param {string} name - Field name (used for id and error id)
 * @param {string} [error] - Error message from react-hook-form errors.fieldName.message
 * @param {string} [hint] - Help text shown below field (hidden when error is present)
 * @param {"input" | "textarea"} [as] - Field type, defaults to "input"
 * @param {boolean} [required] - Whether field is required (shows asterisk)
 * @param {string} [className] - Additional classes for the wrapper
 * @param {string} [inputClassName] - Additional classes for the input/textarea
 * @param {object} props - All other props are spread to the Input/Textarea component
 */
export function FormField({
  label,
  name,
  id: idProp,
  error,
  hint,
  as = "input",
  required = false,
  className,
  inputClassName,
  ...inputProps
}) {
  const fieldId = idProp || name
  const errorId = `${fieldId}-error`
  const hintId = `${fieldId}-hint`
  const hasError = Boolean(error)
  
  const describedBy = [
    hasError ? errorId : null,
    hint && !hasError ? hintId : null,
  ].filter(Boolean).join(" ") || undefined

  const Field = as === "textarea" ? Textarea : Input

  return (
    <div className={cn("form-group", className)}>
      <Label htmlFor={fieldId} className={required ? "required" : undefined}>
        {label}
      </Label>
      <Field
        id={fieldId}
        name={name}
        className={cn(hasError && "input-error", inputClassName)}
        aria-invalid={hasError}
        aria-describedby={describedBy}
        {...inputProps}
      />
      {hint && !hasError && (
        <small id={hintId}>{hint}</small>
      )}
      {hasError && (
        <span id={errorId} className="form-error" role="alert">
          {error}
        </span>
      )}
    </div>
  )
}

export default FormField
