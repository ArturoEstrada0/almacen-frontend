import * as React from 'react'
import { Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'

type SaveButtonProps = React.ComponentProps<typeof Button> & {
  isLoading?: boolean
  loadingText?: string
}

function SaveButton({
  isLoading = false,
  loadingText = 'Guardando...',
  children = 'Guardar',
  disabled,
  type,
  ...props
}: SaveButtonProps) {
  return (
    <Button
      type={type ?? 'submit'}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          {loadingText}
        </>
      ) : (
        children
      )}
    </Button>
  )
}

export { SaveButton }
