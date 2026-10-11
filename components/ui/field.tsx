type FieldProps = {
  label: string;
  name: string;
  type?: string;
  autoComplete?: string;
  errors?: string[];
  required?: boolean;
  placeholder?: string;
};

export function Field({ label, name, type = 'text', autoComplete, errors, required, placeholder }: FieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={name} className="text-sm font-medium text-gray-700">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        autoComplete={autoComplete}
        required={required}
        placeholder={placeholder}
        aria-describedby={errors?.length ? `${name}-error` : undefined}
        aria-invalid={errors?.length ? true : undefined}
        className="rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 aria-invalid:border-red-500"
      />
      {errors?.length ? (
        <p id={`${name}-error`} className="text-xs text-red-600" role="alert">
          {errors[0]}
        </p>
      ) : null}
    </div>
  );
}
