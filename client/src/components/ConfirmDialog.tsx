import { useEffect, useRef } from 'react'
import './confirm-dialog.css'

type ConfirmDialogProps = {
  isOpen: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  onConfirm: () => void
  onCancel: () => void
  isDanger?: boolean
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  isDanger = false,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (isOpen) {
      dialog.showModal()
    } else {
      dialog.close()
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <dialog
      ref={dialogRef}
      className="confirm-dialog glass-panel"
      onClose={onCancel}
    >
      <div className="confirm-dialog-content">
        <h2>{title}</h2>
        <p>{message}</p>
        <div className="confirm-dialog-actions">
          <button type="button" className="btn-cancel" onClick={onCancel}>
            {cancelText}
          </button>
          <button
            type="button"
            className={`btn-confirm ${isDanger ? 'btn-danger' : ''}`}
            onClick={() => {
              onConfirm()
              onCancel()
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </dialog>
  )
}
