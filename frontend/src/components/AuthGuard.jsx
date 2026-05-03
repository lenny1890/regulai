import { useState, useEffect } from 'react'
import { getToken, ensureAuth } from '../api'

export default function AuthGuard({ children }) {
  const [ready, setReady] = useState(!!getToken())

  useEffect(() => {
    if (ready) return
    ensureAuth().then(() => setReady(true))
  }, [ready])

  if (!ready) return null
  return children
}
