import { CalendarDays, Clock3, Eye, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge, Button, Card, EmptyState } from '../components/ui'
import { useAuth } from '../auth/AuthContext'
import { clearUserPredictionHistory, deleteUserPrediction, getUserPredictionHistory } from '../utils/predictionHistory'

function formatDate(isoValue) {
  const date = new Date(isoValue)
  if (Number.isNaN(date.getTime())) return 'Unknown date'
  return date.toLocaleString()
}

export default function HistoryPage() {
  const { user } = useAuth()
  const records = getUserPredictionHistory(user?.email)

  const refresh = () => window.location.reload()

  const handleDelete = predictionId => {
    deleteUserPrediction(user.email, predictionId)
    refresh()
  }

  const handleClear = () => {
    clearUserPredictionHistory(user.email)
    refresh()
  }

  return <div className="mx-auto max-w-4xl space-y-8"><div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><Badge>Student workspace</Badge><h2 className="mt-3 text-3xl font-extrabold">Prediction History</h2><p className="mt-2 text-slate-500">Your saved predictions remain private to this account.</p></div>{records.length > 0 && <Button variant="secondary" onClick={handleClear}>Clear all</Button>}</div>{records.length === 0 ? <Card className="p-8"><EmptyState title="No prediction history yet" description="Your saved prediction timeline will appear here after you generate a result." /><div className="mt-6 flex justify-center"><Clock3 className="text-indigo-300" size={28} /></div></Card> : <div className="space-y-4">{records.map(record => <Card key={record.id} className="p-5"><div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-slate-400">Prediction saved</p><h3 className="mt-2 text-xl font-extrabold">{Number(record.predictedScore).toFixed(2)} score</h3><div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-slate-500"><span className="inline-flex items-center gap-2"><CalendarDays size={14} />{formatDate(record.createdAt)}</span>{record.profileSnapshot?.fullName && <span className="font-medium text-slate-600">{record.profileSnapshot.fullName}</span>}</div></div><div className="flex flex-wrap gap-2"><Link to={`/history/${record.id}`}><Button variant="secondary"><Eye size={16} />View</Button></Link><Button variant="secondary" className="border-red-200 text-red-600 hover:text-red-700" onClick={() => handleDelete(record.id)}><Trash2 size={16} />Delete</Button></div></div></Card>)}</div>}</div>
}
