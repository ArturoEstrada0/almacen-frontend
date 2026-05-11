"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { usePathname } from "next/navigation"

interface NavigationContextType {
  isNavigating: boolean
  setIsNavigating: (value: boolean) => void
}

const NavigationContext = createContext<NavigationContextType>({
  isNavigating: false,
  setIsNavigating: () => {},
})

export function NavigationProvider({ children }: { children: React.ReactNode }) {
  const [isNavigating, setIsNavigating] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    setIsNavigating(false)
  }, [pathname])

  return (
    <NavigationContext.Provider value={{ isNavigating, setIsNavigating }}>
      {children}
    </NavigationContext.Provider>
  )
}

export function useNavigation() {
  return useContext(NavigationContext)
}
