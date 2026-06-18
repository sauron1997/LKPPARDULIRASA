/**
 * Skeleton – Animated loading placeholder for UI shells.
 *
 * Renders a `div` that pulses to indicate content being fetched.
 * Pass `aria-hidden="true"` (default) on the wrapper so screen readers skip
 * the placeholder; pair with a visually-hidden "Memuat…" text nearby when
 * the skeleton replaces meaningful content.
 *
 * @example
 *   <Skeleton className="h-10 w-full rounded-md" />
 *   <Skeleton className="h-4 w-3/4" />
 *   <Skeleton className="h-32 w-full rounded-xl" />
 */
import { cn } from "../../lib/utils";

export function Skeleton({ className, as: Component = "div", ...props }) {
  return (
    <Component
      aria-hidden="true"
      className={cn(
        "animate-pulse rounded-md bg-muted",
        className
      )}
      {...props}
    />
  );
}

/**
 * FormSkeleton – Pre-composed skeleton that mirrors the visual weight of
 * a typical auth/form card (title, description, 2-3 fields, button).
 * Used by LoginPage and RegisterPage while the auth session or registration
 * options are being resolved.
 */
export function AuthCardSkeleton({ fieldCount = 2, title = "Memuat formulir…" }) {
  return (
    <div className="page-wrapper">
      <div className="container section">
        <div className="auth-card animate-scale-up" role="status" aria-label={title}>
          {/* Logo placeholder */}
          <div className="flex flex-col items-center gap-3">
            <Skeleton className="h-14 w-14 rounded-full" />
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-64" />
          </div>

          {/* Form field placeholders */}
          <div className="mt-6 space-y-4">
            {Array.from({ length: fieldCount }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-10 w-full rounded-lg" />
              </div>
            ))}
          </div>

          {/* Button placeholder */}
          <Skeleton className="mt-5 h-11 w-full rounded-lg" />

          <span className="sr-only">{title}</span>
        </div>
      </div>
    </div>
  );
}

export default Skeleton;
