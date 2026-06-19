import { useEffect } from 'react'
import './toast.css'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export type ToastMessage = {
  id: string
  message: string
  type: ToastType
}

type ToastProps = {
  toast: ToastMessage
  onDismiss: (id: string) => void
}

export function Toast({ toast, onDismiss }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(toast.id)
    }, 5000)
    return () => clearTimeout(timer)
  }, [toast.id, onDismiss])

  return (
    <div className={`toast-item toast-${toast.type}`}>
      <span>{toast.message}</span>
      <button
        type="button"
        className="toast-close"
        onClick={() => onDismiss(toast.id)}
      >
        &times;
      </button>
    </div>
  )
}
