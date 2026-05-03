import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getToken, ensureAuth } from '../api'

export default function AuthGuard({ children }) {
  const [ready, setReady] = useState(!!getToken())
  const navigate = useNavigate()

  useEffect(() => {
    if (ready) return
    ensureAuth().then(() => {
      if (getToken()) {
        setReady(true)
      } else {
        navigate('/login', { replace: true })
      }
    })
  }, [ready, navigate])

  if (!ready) return null
  return children
}
