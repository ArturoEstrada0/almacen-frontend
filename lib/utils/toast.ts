import { toast as sonnerToast } from "sonner"

const activeLoadingToasts = new Set<string | number>()

function dismissActiveLoadingToasts() {
  for (const toastId of activeLoadingToasts) {
    sonnerToast.dismiss(toastId)
  }
  activeLoadingToasts.clear()
}

export const toast = {
  success: (message: string, description?: string) => {
    dismissActiveLoadingToasts()
    sonnerToast.success(message, { description })
  },
  error: (message: string, description?: string) => {
    dismissActiveLoadingToasts()
    sonnerToast.error(message, { description })
  },
  info: (message: string, description?: string) => {
    dismissActiveLoadingToasts()
    sonnerToast.info(message, { description })
  },
  warning: (message: string, description?: string) => {
    dismissActiveLoadingToasts()
    sonnerToast.warning(message, { description })
  },
  loading: (message: string) => {
    const toastId = sonnerToast.loading(message, { duration: 8000 })
    activeLoadingToasts.add(toastId)
    return toastId
  },
  dismiss: (toastId?: string | number) => {
    if (toastId !== undefined) {
      activeLoadingToasts.delete(toastId)
      sonnerToast.dismiss(toastId)
      return
    }

    dismissActiveLoadingToasts()
    sonnerToast.dismiss()
  },
  promise: <T,>(
    promise: Promise<T>,
    messages: {
      loading: string
      success: string
      error: string
    },
  ) => {
    return sonnerToast.promise(promise, messages)
  },
}
