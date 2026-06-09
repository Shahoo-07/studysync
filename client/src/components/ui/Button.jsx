import { clsx } from 'clsx';

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  className,
  ...props
}) {
  const baseClasses = 'font-medium rounded-lg transition-colors';

  const variants = {
    primary: 'bg-brown text-cream-50 hover:bg-brown-dark',
    secondary: 'bg-tan text-brown-text hover:bg-tan-dark',
    outline: 'border border-brown text-brown hover:bg-cream-100',
    ghost: 'text-brown hover:bg-cream-100',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  return (
    <button
      className={clsx(baseClasses, variants[variant], sizes[size], className)}
      {...props}
    >
      {children}
    </button>
  );
}
