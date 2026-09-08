"use client"

import { createContext, useContext, useMemo, useState } from "react"

/** Tracks "a load the user just started", so the logo can shimmer during it.
 *
 *  There is no router-event API in the App Router, and useLinkStatus() only
 *  reports for the <Link> it is rendered inside -- neither reaches a logo in the
 *  header. So the moments are reported explicitly by the things that cause
 *  them: the key form mirrors its server action's pending flag, and the
 *  destination links flip it on click. The indicator is therefore on exactly
 *  when something is actually loading, rather than guessing.
 *
 *  setLoading takes a boolean rather than being a one-way start(): the key form
 *  can finish WITHOUT navigating (an unknown key returns an error and stays on
 *  the page), and a one-way trigger would leave the logo shimmering forever. */
type NavLoading = {
  loading: boolean
  setLoading: (loading: boolean) => void
}

const NavLoadingContext = createContext<NavLoading>({
  loading: false,
  setLoading: () => {},
})

export function NavLoadingProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [loading, setLoading] = useState(false)
  const value = useMemo(() => ({ loading, setLoading }), [loading])

  return (
    <NavLoadingContext.Provider value={value}>
      {children}
    </NavLoadingContext.Provider>
  )
}

export function useNavLoading(): NavLoading {
  return useContext(NavLoadingContext)
}
