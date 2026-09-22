import { ArrowRight, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button, Card } from '../components/ui'
import ReportDownloadButton from '../components/ReportDownloadButton'
import PredictionResultPage from './PredictionResultPage'

export default function PredictionResultWithInsightsPage() {
  return <><PredictionResultPage /><div className="mx-auto max-w-4xl space-y-4"><Card className="flex flex-col items-start justify-between gap-4 border-indigo-100 bg-indigo-50 p-6 sm:flex-row sm:items-center"><div><h3 className="text-lg font-extrabold">AI Performance Insights</h3><p className="mt-1 text-sm text-slate-600">Generate a deterministic summary from this prediction, its model contributions, and recommendations.</p></div><Link to="/insights"><Button>Generate Insights <Sparkles size={16} /><ArrowRight size={16} /></Button></Link></Card><ReportDownloadButton /></div></>
}
