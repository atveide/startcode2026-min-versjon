import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react';

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'text';
  loading?: boolean;
};

const buttonClasses = {
  primary: 'button button-primary',
  secondary: 'button button-secondary',
  text: 'text-link text-button',
};

/** A native button with shared variants and a stable label while loading. */
export function Button({
  variant = 'primary',
  loading = false,
  disabled = false,
  type = 'button',
  className,
  children,
  'aria-busy': ariaBusy,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      type={type}
      className={[buttonClasses[variant], className].filter(Boolean).join(' ')}
      disabled={disabled || loading}
      aria-busy={loading ? true : ariaBusy}
    >
      {loading && <span aria-hidden="true">…</span>}
      {children}
    </button>
  );
}

export type IconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label'> & {
  /** Describe the action, for example «Lagre sak». */
  label: string;
};

export function IconButton({
  label,
  type = 'button',
  className,
  children,
  ...props
}: IconButtonProps) {
  return (
    <button
      {...props}
      type={type}
      className={['icon-button', className].filter(Boolean).join(' ')}
      aria-label={label}
    >
      {children}
    </button>
  );
}

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: 'category' | 'demo' | 'success';
  children: ReactNode;
};

const badgeClasses = {
  category: 'eyebrow',
  demo: 'demo-label',
  success: 'success-badge',
};

export function Badge({ variant = 'category', className, children, ...props }: BadgeProps) {
  return (
    <span {...props} className={[badgeClasses[variant], className].filter(Boolean).join(' ')}>
      {children}
    </span>
  );
}
