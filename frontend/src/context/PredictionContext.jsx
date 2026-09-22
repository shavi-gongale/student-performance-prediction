import { createContext, useContext, useMemo, useState } from 'react'

const PredictionContext = createContext(null)

export function PredictionProvider({ children }) {
  const [latestPrediction, setLatestPrediction] = useState(null)
  const value = useMemo(() => ({ latestPrediction, setLatestPrediction }), [latestPrediction])
  return <PredictionContext.Provider value={value}>{children}</PredictionContext.Provider>
}

export function usePrediction() {
  const context = useContext(PredictionContext)
  if (!context) throw new Error('usePrediction must be used inside PredictionProvider')
  return context
}
