import * as React from 'react'

export function Button({
  className = '',
  variant = 'default',
  size = 'default',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'default' | 'secondary' | 'outline' | 'destructive' | 'text'
  size?: 'default' | 'sm' | 'lg'
}) {
  const variantClasses = {
    default: 'btn-primary',
    secondary: 'btn-secondary',
    outline: 'border-2 border-gray-300 bg-transparent hover:bg-gray-50',
    destructive: 'bg-red-600 text-white hover:bg-red-700',
    text: 'btn-text'
  }

  const sizeClasses = {
    default: '',
    sm: 'text-xs px-3 py-1.5',
    lg: 'text-base px-6 py-3'
  }

  return (
    <button
      className={`btn ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    />
  )
}

export function Badge({ className = '', children, variant = 'default' }: { className?: string; children: React.ReactNode; variant?: 'default' | 'secondary' }) {
  const base = 'inline-flex items-center rounded-md px-2 py-1 text-xs font-medium'
  const styles = variant === 'secondary' ? 'bg-gray-200 text-gray-800' : 'bg-purple text-white'
  return <span className={`${base} ${styles} ${className}`}>{children}</span>
}

export function Input({ className = '', ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`input ${className}`} {...props} />
}

export function Textarea({ className = '', ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`input ${className}`} {...props} />
}

export function Label({ className = '', ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={`label ${className}`} {...props} />
}

export { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel, SelectSeparator, SelectScrollUpButton, SelectScrollDownButton } from '@/lib/components/ui/select'

export function Card({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return <div className={`card rounded-lg border border-gray-200 bg-white ${className}`}>{children}</div>
}
export function CardHeader({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return <div className={`border-b p-4 ${className}`}>{children}</div>
}
export function CardContent({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return <div className={`p-4 ${className}`}>{children}</div>
}
export function CardFooter({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return <div className={`border-t p-4 ${className}`}>{children}</div>
}
export function CardTitle({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return <h3 className={`text-xl font-semibold ${className}`}>{children}</h3>
}
export function CardDescription({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return <p className={`text-sm text-gray-600 ${className}`}>{children}</p>
}
