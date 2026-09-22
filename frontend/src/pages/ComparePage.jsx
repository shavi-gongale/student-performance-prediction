import { useState } from 'react'
import { ArrowRight, GitCompareArrows } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge, Button, Card, EmptyState } from '../components/ui'
import { useAuth } from '../auth/AuthContext'
import { usePrediction } from '../context/PredictionContext'
import { predictStudent } from '../services/api'
import { getUserPredictionHistory } from '../utils/predictionHistory'
import { emptyProfile, groups, numericFields, toPredictionPayload, validatePredictionForm } from '../utils/predictionForm'

const numericComparisonFields = [
  ['Hours_Studied', 'Hours Studied'],
  ['Attendance', 'Attendance'],
  ['Previous_Scores', 'Previous Scores'],
  ['Tutoring_Sessions', 'Tutoring Sessions'],
  ['Sleep_Hours', 'Sleep Hours'],
  ['Physical_Activity', 'Physical Activity'],
]

function getCurrentStudent(latestPrediction, records, user) {
  if (latestPrediction?.profile && latestPrediction?.result) return { name: user.fullName, profile: latestPrediction.profile, score: latestPrediction.result.predicted_score }
  const record = records[0]
  return record ? { name: user.fullName, profile: record.profileSnapshot, score: record.predictedScore } : null
}

function scoreText(score) {
  return typeof score === 'number' ? score.toFixed(2) : '--'
}

function ComparisonRow({ label, left, right, numeric = false }) {
  return <div className="grid min-w-0 gap-2 border-b border-slate-100 py-3 sm:grid-cols-[1.2fr_1fr_1fr] sm:items-center"><p className="text-sm font-bold text-slate-800">{label}</p><p className="text-sm text-slate-500"><span className="font-semibold text-slate-400 sm:hidden">Student A: </span>{numeric ? String(left) : left || 'Not provided'}</p><p className="text-sm text-slate-500"><span className="font-semibold text-slate-400 sm:hidden">Student B: </span>{numeric ? String(right) : right || 'Not provided'}</p></div>
}

function EmptyComparison() {
  return <div className="mx-auto max-w-3xl space-y-8"><div><Badge>Profile comparison</Badge><h2 className="mt-3 text-3xl font-extrabold">Student Comparison</h2><p className="mt-2 text-slate-500">Compare performance estimates and key learning factors.</p></div><Card className="p-8"><EmptyState title="Make a prediction first" description="Student Comparison needs your own real prediction profile as Student A. No baseline is available yet." /><div className="mt-6 flex justify-center"><Link to="/predict"><Button>Make a Prediction <ArrowRight size={16} /></Button></Link></div></Card></div>
}

export default function ComparePage() {
  const { user } = useAuth()
  const { latestPrediction } = usePrediction()
  const records = getUserPredictionHistory(user?.email)
  const studentA = getCurrentStudent(latestPrediction, records, user)
  const [source, setSource] = useState('saved')
  const [selectedHistoryId, setSelectedHistoryId] = useState(() => records[0]?.id || '')
  const [customProfile, setCustomProfile] = useState(() => ({ ...(studentA?.profile || emptyProfile) }))
  const [customLabel, setCustomLabel] = useState('Custom profile')
  const [studentB, setStudentB] = useState(() => records[0] ? { name: 'Saved prediction', profile: records[0].profileSnapshot, score: records[0].predictedScore } : null)
  const [errors, setErrors] = useState({})
  const [requestError, setRequestError] = useState('')
  const [loading, setLoading] = useState(false)

  if (!studentA) return <EmptyComparison />

  const updateCustom = (name, value) => {
    setCustomProfile(current => ({ ...current, [name]: value }))
    setStudentB(null)
    setRequestError('')
  }

  const handleSourceChange = nextSource => {
    setSource(nextSource)
    setErrors({})
    setRequestError('')
    setStudentB(nextSource === 'saved' && records[0] ? { name: 'Saved prediction', profile: records[0].profileSnapshot, score: records[0].predictedScore } : null)
  }

  const compareStudents = async event => {
    event.preventDefault()
    setRequestError('')
    setErrors({})
    if (source === 'saved') {
      const record = records.find(item => item.id === selectedHistoryId)
      if (!record) {
        setRequestError('Select one of your saved predictions to compare.')
        return
      }
      setStudentB({ name: 'Saved prediction', profile: record.profileSnapshot, score: record.predictedScore })
      return
    }

    const nextErrors = validatePredictionForm(customProfile)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return
    setLoading(true)
    try {
      const payload = toPredictionPayload(customProfile)
      const result = await predictStudent(payload)
      setStudentB({ name: customLabel || 'Custom profile', profile: payload, score: result.predicted_score })
    } catch (error) {
      setRequestError(error.message || 'Something went wrong while generating the comparison estimate. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const difference = studentB ? studentB.score - studentA.score : null
  const comparisonWidth = score => `${Math.min(100, Math.max(0, Number(score) || 0))}%`
  const differenceClass = difference === null ? 'text-slate-500' : difference > 0 ? 'text-emerald-600' : difference < 0 ? 'text-rose-600' : 'text-slate-700'
  const categoricalFields = groups.flatMap(([, fields]) => fields.filter(([name]) => !numericFields.has(name)).map(([name, label]) => [name, label]))

  return <div className="mx-auto max-w-5xl space-y-8"><div><Badge>Profile comparison</Badge><h2 className="mt-3 text-3xl font-extrabold">Student Comparison</h2><p className="mt-2 max-w-2xl text-slate-500">Compare performance estimates and key learning factors.</p></div><div className="grid gap-4 md:grid-cols-2"><Card className="border-indigo-100 bg-indigo-50 p-6"><p className="text-xs font-bold uppercase tracking-[.14em] text-indigo-700">Student A</p><h3 className="mt-3 text-xl font-extrabold">{studentA.name}</h3><p className="mt-4 text-4xl font-extrabold text-slate-950">{scoreText(studentA.score)}</p><p className="mt-2 text-sm text-slate-500">Predicted score from the current profile</p></Card><Card className="p-6"><p className="text-xs font-bold uppercase tracking-[.14em] text-slate-500">Student B</p><h3 className="mt-3 text-xl font-extrabold">{studentB?.name || 'Choose a comparison profile'}</h3><p className="mt-4 text-4xl font-extrabold text-slate-950">{scoreText(studentB?.score)}</p><p className="mt-2 text-sm text-slate-500">Comparison model estimate</p></Card></div><Card className="p-6"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="text-lg font-extrabold">Predicted score comparison</h3><p className="mt-1 text-sm text-slate-500">Descriptive comparison of two model-estimated scores.</p></div><GitCompareArrows className="text-indigo-600" size={22} /></div><div className="mt-6 space-y-4"><div><div className="mb-2 flex justify-between text-sm font-bold"><span>Student A</span><span>{scoreText(studentA.score)}</span></div><div className="h-3 rounded-full bg-slate-100"><div className="h-3 rounded-full bg-indigo-500" style={{ width: comparisonWidth(studentA.score) }} /></div></div><div><div className="mb-2 flex justify-between text-sm font-bold"><span>Student B</span><span>{scoreText(studentB?.score)}</span></div><div className="h-3 rounded-full bg-slate-100"><div className="h-3 rounded-full bg-slate-500" style={{ width: comparisonWidth(studentB?.score) }} /></div></div></div><div className="mt-6 border-t border-slate-100 pt-5"><p className="text-sm font-bold text-slate-500">Difference</p><p className={`mt-1 text-3xl font-extrabold ${differenceClass}`}>{difference === null ? 'Choose Student B' : `${difference >= 0 ? '+' : ''}${difference.toFixed(2)} points`}</p></div></Card>{studentB && <Card className="p-6"><h3 className="text-lg font-extrabold">Key learning factors</h3><p className="mt-1 text-sm text-slate-500">Values are shown side by side for description only.</p><div className="mt-4"><div className="hidden grid-cols-[1.2fr_1fr_1fr] gap-2 border-b border-slate-200 pb-2 text-xs font-bold uppercase tracking-wider text-slate-400 sm:grid"><span>Factor</span><span>Student A</span><span>Student B</span></div>{numericComparisonFields.map(([name, label]) => <ComparisonRow key={name} label={label} left={studentA.profile[name]} right={studentB.profile[name]} numeric />)}{categoricalFields.map(([name, label]) => <ComparisonRow key={name} label={label} left={studentA.profile[name]} right={studentB.profile[name]} />)}</div></Card>}<Card className="p-6"><div className="flex flex-wrap gap-2"><Button type="button" variant={source === 'saved' ? 'primary' : 'secondary'} onClick={() => handleSourceChange('saved')}>Saved prediction</Button><Button type="button" variant={source === 'custom' ? 'primary' : 'secondary'} onClick={() => handleSourceChange('custom')}>Custom profile</Button></div>{source === 'saved' ? <div className="mt-5"><label className="block"><span className="mb-2 block text-sm font-bold">Your saved prediction</span><select className="field" value={selectedHistoryId} onChange={event => { setSelectedHistoryId(event.target.value); setStudentB(null) }}><option value="">Select a saved prediction</option>{records.map(record => <option key={record.id} value={record.id}>{scoreText(record.predictedScore)} score - {new Date(record.createdAt).toLocaleString()}</option>)}</select></label></div> : <div className="mt-5 space-y-5"><label className="block"><span className="mb-2 block text-sm font-bold">Comparison label</span><input className="field" value={customLabel} onChange={event => setCustomLabel(event.target.value)} /></label>{groups.map(([section, fields]) => <div key={section}><h3 className="font-extrabold">{section}</h3><div className="mt-4 grid gap-5 sm:grid-cols-2">{fields.map(([name, label, type]) => <label key={name} className={`block ${numericFields.has(name) ? 'rounded-lg border border-indigo-100 bg-indigo-50/50 p-3' : ''}`}><span className="mb-2 block text-sm font-bold">{label}</span>{Array.isArray(type) ? <select className="field" value={customProfile[name] || ''} onChange={event => updateCustom(name, event.target.value)}><option value="">Select {label.toLowerCase()}</option>{type.map(option => <option key={option} value={option}>{option}</option>)}</select> : <input className="field" type={type} value={customProfile[name] ?? ''} onChange={event => updateCustom(name, event.target.value)} />}{errors[name] && <span className="mt-1 block text-xs font-bold text-red-600">{errors[name]}</span>}</label>)}</div></div>)}</div>}{requestError && <div role="alert" className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{requestError}</div>}<div className="mt-6"><Button type="button" disabled={loading} onClick={compareStudents}>{loading ? 'Comparing students...' : 'Compare Students'} <GitCompareArrows size={16} /></Button></div></Card><p className="text-xs leading-5 text-slate-500">Predicted scores are model estimates based on the input profiles. Differences between profiles do not establish causal effects.</p></div>
}
