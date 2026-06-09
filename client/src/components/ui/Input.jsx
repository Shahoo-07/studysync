import { clsx } from 'clsx';

export function Input({ label, error, ...props }) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-brown-text mb-1">
          {label}
        </label>
      )}
      <input
        className={clsx(
          'w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brown',
          error ? 'border-red-500' : 'border-tan'
        )}
        {...props}
      />
      {error && (
        <p className="text-red-500 text-sm mt-1">{error}</p>
      )}
    </div>
  );
}
