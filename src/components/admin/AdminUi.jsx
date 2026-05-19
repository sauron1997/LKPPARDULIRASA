import { useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  adminHeroClassName,
  adminSurfaceClassName,
  adminSurfacePaddingClassName,
  cn,
} from './adminClassNames';

const tagToneMap = {
  emerald: 'border-emerald-100 bg-emerald-50 text-emerald-700 hover:bg-emerald-50',
  blue: 'border-blue-100 bg-blue-50 text-blue-700 hover:bg-blue-50',
  amber: 'border-amber-100 bg-amber-50 text-amber-700 hover:bg-amber-50',
  slate: 'border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-100',
  rose: 'border-rose-100 bg-rose-50 text-rose-700 hover:bg-rose-50',
};

const noticeToneMap = {
  emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  blue: 'border-blue-200 bg-blue-50 text-blue-700',
  amber: 'border-amber-200 bg-amber-50 text-amber-700',
  rose: 'border-rose-200 bg-rose-50 text-rose-700',
  slate: 'border-slate-200 bg-slate-50 text-slate-700',
};

const toastToneMap = {
  emerald: 'border-emerald-200 bg-white text-emerald-700',
  blue: 'border-blue-200 bg-white text-blue-700',
  amber: 'border-amber-200 bg-white text-amber-700',
  rose: 'border-rose-200 bg-white text-rose-700',
  slate: 'border-slate-200 bg-white text-slate-700',
};

export function AdminSurface({ className = '', children }) {
  return (
    <Card className={cn('gap-0 py-0', adminSurfaceClassName, className)}>
      {children}
    </Card>
  );
}

export function AdminHero({ icon: Icon, title, description, actions, children, className = '' }) {
  return (
    <section className={cn(adminHeroClassName, className)}>
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-200 to-transparent" />
      <div className="absolute -left-20 top-8 h-36 w-36 rounded-full bg-emerald-100/55 blur-3xl" />
      <div className="absolute right-10 top-0 h-32 w-32 rounded-full bg-blue-100/45 blur-3xl" />

      <div className="relative flex flex-col gap-5">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex items-start gap-4">
            {Icon ? (
              <div className="flex h-14 w-14 items-center justify-center rounded-[22px] bg-emerald-50 text-emerald-600 shadow-[inset_0_0_0_1px_rgba(15,159,97,0.08)]">
                <Icon size={26} strokeWidth={1.9} />
              </div>
            ) : null}
            <div>
              <h1 className="text-[2rem] font-semibold leading-tight tracking-tight text-slate-950 sm:text-[2.25rem] xl:text-[2.45rem]">
                {title}
              </h1>
              <p className="mt-2 max-w-3xl text-[0.98rem] leading-7 text-emerald-700/90">
                {description}
              </p>
            </div>
          </div>

          {actions ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end xl:max-w-[760px]">
              {actions}
            </div>
          ) : null}
        </div>

        {children ? <div className="relative">{children}</div> : null}
      </div>
    </section>
  );
}

export function AdminInput({
  className = '',
  containerClassName = '',
  icon: Icon,
  ...props
}) {
  const inputClassName = cn(
    'h-12 rounded-2xl border-slate-200 bg-white px-4 text-sm text-slate-700 shadow-none focus-visible:border-emerald-300 focus-visible:ring-4 focus-visible:ring-emerald-100',
    Icon ? 'pl-11' : '',
    className,
  );

  if (!Icon) {
    return <Input className={inputClassName} {...props} />;
  }

  return (
    <div className={cn('relative', containerClassName)}>
      <Icon className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
      <Input className={inputClassName} {...props} />
    </div>
  );
}

export function AdminTextarea({
  className = '',
  containerClassName = '',
  icon: Icon,
  ...props
}) {
  const textareaClassName = cn(
    'w-full rounded-[24px] border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-none focus-visible:border-emerald-300 focus-visible:ring-4 focus-visible:ring-emerald-100',
    Icon ? 'pl-11' : '',
    className,
  );

  if (!Icon) {
    return <Textarea className={textareaClassName} {...props} />;
  }

  return (
    <div className={cn('relative', containerClassName)}>
      <Icon className="pointer-events-none absolute left-4 top-4 text-slate-400" size={16} />
      <Textarea className={textareaClassName} {...props} />
    </div>
  );
}

export function AdminSearchInput({ value, onChange, placeholder = 'Cari data...' }) {
  return (
    <label className="group flex h-12 min-w-[250px] items-center gap-3 rounded-2xl border border-slate-200/80 bg-white px-4 shadow-[0_14px_35px_-26px_rgba(15,23,42,0.3)] transition-colors focus-within:border-emerald-200 xl:min-w-[290px]">
      <Search size={18} className="text-slate-400 transition-colors group-focus-within:text-emerald-600" />
      <Input
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="h-full border-0 bg-transparent px-0 text-sm text-slate-700 shadow-none outline-none placeholder:text-slate-400 focus-visible:ring-0"
      />
    </label>
  );
}

export function AdminPrimaryButton({ className = '', children, type = 'button', ...props }) {
  return (
    <Button
      type={type}
      className={cn(
        'h-12 rounded-2xl bg-emerald-600 px-5 text-sm font-semibold text-white shadow-[0_20px_40px_-24px_rgba(5,150,105,0.8)] hover:bg-emerald-700 hover:shadow-[0_24px_48px_-24px_rgba(5,150,105,0.85)]',
        className,
      )}
      {...props}
    >
      {children}
    </Button>
  );
}

export function AdminSecondaryButton({ className = '', children, type = 'button', ...props }) {
  return (
    <Button
      type={type}
      variant="outline"
      className={cn(
        'rounded-2xl border-slate-200/80 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-[0_14px_35px_-26px_rgba(15,23,42,0.3)] hover:border-emerald-200 hover:bg-white hover:text-emerald-700',
        className,
      )}
      {...props}
    >
      {children}
    </Button>
  );
}

export function AdminTogglePill({
  pressed,
  onClick,
  activeLabel = 'Aktif',
  inactiveLabel = 'Nonaktif',
  className = '',
}) {
  return (
    <Button
      type="button"
      variant="outline"
      className={cn(
        'h-auto rounded-full px-3 py-1 text-xs font-semibold shadow-none',
        pressed
          ? 'border-emerald-200 bg-emerald-100 text-emerald-700 hover:bg-emerald-100'
          : 'border-slate-200 bg-slate-200 text-slate-600 hover:bg-slate-200',
        className,
      )}
      onClick={onClick}
    >
      {pressed ? activeLabel : inactiveLabel}
    </Button>
  );
}

export function AdminMetricCard({ icon: Icon, label, value, hint, tone = 'emerald' }) {
  const toneMap = {
    emerald: 'bg-[#eefaf4] text-[#0f9f61]',
    blue: 'bg-[#eff5ff] text-[#2f6bff]',
    amber: 'bg-[#fff6e8] text-[#f08a1f]',
    slate: 'bg-slate-100 text-slate-600',
    rose: 'bg-rose-50 text-rose-600',
  };

  return (
    <Card className="gap-0 rounded-[24px] border border-white/80 bg-white/[0.9] py-0 shadow-[0_18px_45px_-32px_rgba(15,23,42,0.22)]">
      <div className="p-5 lg:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className={cn('flex h-11 w-11 items-center justify-center rounded-2xl', toneMap[tone] || toneMap.emerald)}>
            {Icon ? <Icon size={20} strokeWidth={1.8} /> : null}
          </div>
          {hint ? <span className="text-xs font-medium text-slate-400">{hint}</span> : null}
        </div>
        <div className="mt-4">
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-1 text-[1.8rem] font-semibold leading-none tracking-tight text-slate-900">{value}</p>
        </div>
      </div>
    </Card>
  );
}

export function AdminPanelTitle({ title, description, action }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-slate-900">{title}</h2>
        {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function AdminSectionCard({
  title,
  description,
  action,
  className = '',
  headerClassName = 'border-b border-slate-100 bg-slate-50/65 px-6 py-5',
  bodyClassName = 'px-6 py-6',
  children,
}) {
  return (
    <AdminSurface className={cn('overflow-hidden', className)}>
      {(title || description || action) ? (
        <div className={headerClassName}>
          <AdminPanelTitle
            title={title}
            description={description}
            action={action}
          />
        </div>
      ) : null}

      <div className={bodyClassName}>
        {children}
      </div>
    </AdminSurface>
  );
}

export function AdminInfoPanel({ className = '', children }) {
  return (
    <Card className={cn('gap-0 py-0', adminSurfaceClassName, 'p-5 sm:p-6', className)}>
      {children}
    </Card>
  );
}

export function AdminSidebarPanel({
  title,
  description,
  action,
  className = '',
  contentClassName = 'mt-5',
  children,
}) {
  return (
    <Card className={cn('gap-0 py-0', adminSurfaceClassName, adminSurfacePaddingClassName, className)}>
      {(title || description || action) ? (
        <AdminPanelTitle
          title={title}
          description={description}
          action={action}
        />
      ) : null}

      <div className={contentClassName}>
        {children}
      </div>
    </Card>
  );
}

export function AdminTag({ children, tone = 'slate', className = '' }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        'rounded-full px-2.5 py-1 text-xs font-semibold shadow-none',
        tagToneMap[tone] || tagToneMap.slate,
        className,
      )}
    >
      {children}
    </Badge>
  );
}

export function AdminEmptyState({ icon: Icon, title, description, action }) {
  return (
    <Card className="gap-0 rounded-[26px] border border-dashed border-slate-200 bg-slate-50/75 py-0">
      <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
        {Icon ? (
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white text-slate-300 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.2)]">
            <Icon size={30} />
          </div>
        ) : null}
        <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
        <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">{description}</p>
        {action ? <div className="mt-5">{action}</div> : null}
      </div>
    </Card>
  );
}

export function AdminStickyBar({ className = '', children }) {
  return (
    <Card className={cn('sticky bottom-4 gap-0 rounded-[24px] border border-white/80 bg-white/95 py-0 shadow-[0_22px_50px_-32px_rgba(15,23,42,0.35)] backdrop-blur', className)}>
      <div className="p-4">
        {children}
      </div>
    </Card>
  );
}

export function AdminField({
  label,
  helper,
  htmlFor,
  className = '',
  labelClassName = '',
  helperClassName = '',
  children,
}) {
  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label htmlFor={htmlFor} className={cn('text-sm font-semibold text-slate-700', labelClassName)}>
          {label}
        </Label>
        {helper ? <span className={cn('text-xs text-slate-400', helperClassName)}>{helper}</span> : null}
      </div>
      {children}
    </div>
  );
}

export function AdminNotice({ tone = 'emerald', title, description, action }) {
  return (
    <Alert className={cn('rounded-[24px] border px-5 py-4 shadow-[0_16px_40px_-32px_rgba(15,23,42,0.28)]', noticeToneMap[tone] || noticeToneMap.slate)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          {title ? <AlertTitle className="text-sm font-semibold text-current">{title}</AlertTitle> : null}
          {description ? <AlertDescription className="mt-1 text-sm leading-6 text-current/90">{description}</AlertDescription> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </Alert>
  );
}

export function AdminLoadingState({ title = 'Memuat data...', description = 'Mohon tunggu sebentar, data sedang disiapkan.' }) {
  return (
    <Card className="gap-0 rounded-[26px] border border-dashed border-slate-200 bg-slate-50/75 py-0">
      <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-emerald-500" aria-hidden="true" />
        <h3 className="mt-5 text-lg font-semibold text-slate-800">{title}</h3>
        <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">{description}</p>
      </div>
    </Card>
  );
}

export function AdminToast({ tone = 'emerald', title, description, onClose }) {
  const toastIdRef = useRef(null);

  useEffect(() => {
    if (!title && !description) {
      if (toastIdRef.current) {
        toast.dismiss(toastIdRef.current);
        toastIdRef.current = null;
      }
      return;
    }

    if (toastIdRef.current) {
      toast.dismiss(toastIdRef.current);
    }

    const toastId = `admin-toast-${Date.now()}`;
    toastIdRef.current = toastId;

    toast.custom(
      (instance) => (
        <div
          className={cn(
            'w-[min(92vw,360px)] rounded-[24px] border p-4 shadow-[0_22px_50px_-30px_rgba(15,23,42,0.38)]',
            toastToneMap[tone] || toastToneMap.slate,
          )}
          role="status"
          aria-live="polite"
        >
          <div className="flex items-start gap-3">
            <div className="flex-1">
              {title ? <p className="text-sm font-semibold text-current">{title}</p> : null}
              {description ? <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p> : null}
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              className="rounded-full border border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-600"
              onClick={() => {
                toast.dismiss(instance.id);
                toastIdRef.current = null;
                onClose?.();
              }}
              aria-label="Tutup notifikasi"
            >
              <X size={16} />
            </Button>
          </div>
        </div>
      ),
      {
        id: toastId,
        duration: Infinity,
      },
    );

    return () => {
      if (toastIdRef.current) {
        toast.dismiss(toastIdRef.current);
      }
    };
  }, [description, onClose, title, tone]);

  return null;
}

export function AdminConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Konfirmasi',
  cancelLabel = 'Batal',
  tone = 'rose',
  onCancel,
  onConfirm,
}) {
  const isConfirmingRef = useRef(false);
  const actionClassName = tone === 'rose'
    ? 'bg-rose-600 text-white hover:bg-rose-700 shadow-[0_20px_40px_-24px_rgba(225,29,72,0.72)]'
    : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-[0_20px_40px_-24px_rgba(5,150,105,0.72)]';

  return (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) return;
        if (isConfirmingRef.current) {
          isConfirmingRef.current = false;
          return;
        }
        onCancel?.();
      }}
    >
      <AlertDialogContent className="max-w-md rounded-[30px] border border-white/80 bg-white p-0 shadow-[0_30px_90px_-35px_rgba(15,23,42,0.5)]">
        <div className="p-6 sm:p-7">
          <AlertDialogHeader className="items-start gap-2 text-left">
            <AlertDialogTitle className="text-xl tracking-tight text-slate-950">{title}</AlertDialogTitle>
            <AlertDialogDescription className="text-sm leading-6 text-slate-500">
              {description}
            </AlertDialogDescription>
          </AlertDialogHeader>
        </div>
        <AlertDialogFooter className="mt-0 gap-3 border-t-0 bg-transparent px-6 pb-6 pt-0 sm:px-7 sm:pb-7 sm:pt-0">
          <AlertDialogCancel className="h-12 rounded-2xl border-slate-200/80 bg-white px-5 text-sm font-medium text-slate-700 shadow-[0_14px_35px_-26px_rgba(15,23,42,0.3)] hover:border-emerald-200 hover:bg-white hover:text-emerald-700">
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            className={cn('h-12 rounded-2xl px-5 text-sm font-semibold', actionClassName)}
            onClick={() => {
              isConfirmingRef.current = true;
              onConfirm?.();
            }}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
