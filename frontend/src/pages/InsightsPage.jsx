import { useRef, useState } from 'react'
import { ArrowRight, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge, Button, Card, EmptyState } from '../components/ui'
import { useAuth } from '../auth/AuthContext'
import { usePrediction } from '../context/PredictionContext'
import { generateStudentInsights } from '../services/api'
import { getUserPredictionHistory } from '../utils/predictionHistory'
import InsightSections from '../components/InsightSections'

export default function InsightsPage() {
  const { user } = useAuth()
  const { latestPrediction } = usePrediction()
  const record = getUserPredictionHistory(user?.email)[0]
  const profile = latestPrediction?.profile || record?.profileSnapshot
  const [insights, setInsights] = useState(null)
  const [requestError, setRequestError] = useState('')
  const [loading, setLoading] = useState(false)
  const loadedProfileKey = useRef('')

  if (!profile) {
    return <div className="mx-auto max-w-3xl space-y-8"><div><Badge>AI insights</Badge><h2 className="mt-3 text-3xl font-extrabold">AI Performance Insights</h2><p className="mt-2 text-slate-500">Understand your model-estimated performance and the areas highlighted by your profile.</p></div><Card className="p-8"><EmptyState title="Make a prediction first" description="AI insights need your own real prediction profile and model explanation." /><div className="mt-6 flex justify-center"><Link to="/predict"><Button>Make a Prediction <ArrowRight size={16} /></Button></Link></div></Card></div>
  }

  const profileKey = JSON.stringify(profile)
  const generate = async () => {
    if (loadedProfileKey.current === profileKey) return
    loadedProfileKey.current = profileKey
    setLoading(true)
    setRequestError('')
    try {
      setInsights(await generateStudentInsights(profile))
    } catch (error) {
      loadedProfileKey.current = ''
      setRequestError(error.message || 'Unable to generate AI insights. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return <div className="mx-auto max-w-5xl space-y-8"><div><Badge>AI insights</Badge><h2 className="mt-3 text-3xl font-extrabold">AI Performance Insights</h2><p className="mt-2 max-w-2xl text-slate-500">Understand your model-estimated performance and the areas highlighted by your profile.</p></div>{!insights && <Card className="p-6"><div className="flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-center"><div><h3 className="text-lg font-extrabold">Generate your insight summary</h3><p className="mt-1 text-sm text-slate-500">This uses your current prediction, model contributions, profile values, and existing recommendations.</p></div><Button onClick={generate} disabled={loading}>{loading ? 'Generating insights...' : 'Generate Insights'} <Sparkles size={16} /></Button></div>{requestError && <div role="alert" className="mt-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">{requestError}</div>}</Card>}{insights && <InsightSections insights={insights} />}</div>
}
