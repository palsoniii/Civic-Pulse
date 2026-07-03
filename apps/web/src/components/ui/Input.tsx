import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/utils/cn';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-gray-700">
            {label}
            {props.required && <span className="ml-0.5 text-danger-600">*</span>}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'h-10 w-full rounded-lg border px-3 text-sm',
            'outline-none transition-colors duration-150',
            'placeholder:text-gray-400',
            error
              ? 'border-danger-600 focus:border-danger-600 focus:ring-2 focus:ring-danger-100'
              : 'border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-100',
            'disabled:cursor-not-allowed disabled:bg-gray-50 disabled:opacity-60',
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-danger-600">{error}</p>}
        {hint && !error && <p className="text-xs text-gray-500">{hint}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
