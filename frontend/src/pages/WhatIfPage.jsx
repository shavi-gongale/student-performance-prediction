import { useState } from 'react'
import { ArrowRight, RotateCcw, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge, Button, Card, EmptyState } from '../components/ui'
import { useAuth } from '../auth/AuthContext'
import { usePrediction } from '../context/PredictionContext'
import { predictStudent } from '../services/api'
import { getUserPredictionHistory } from '../utils/predictionHistory'
import { emptyProfile, groups, numericFields, toPredictionPayload, validatePredictionForm } from '../utils/predictionForm'

function getBaseline(latestPrediction, userEmail) {
  if (latestPrediction?.profile && latestPrediction?.result) {
    return { profile: latestPrediction.profile, score: latestPrediction.result.predicted_score }
  }
  const savedRecord = getUserPredictionHistory(userEmail)[0]
  if (!savedRecord) return null
  return { profile: savedRecord.profileSnapshot, score: savedRecord.predictedScore }
}

function scoreText(score) {
  return typeof score === 'number' ? score.toFixed(2) : '--'
}

export default function WhatIfPage() {
  const { user } = useAuth()
  const { latestPrediction } = usePrediction()
  const baseline = getBaseline(latestPrediction, user?.email)
  const [scenario, setScenario] = useState(() => ({ ...(baseline?.profile || emptyProfile) }))
  const [scenarioScore, setScenarioScore] = useState(() => baseline?.score ?? null)
  const [errors, setErrors] = useState({})
  const [requestError, setRequestError] = useState('')
  const [loading, setLoading] = useState(false)

  if (!baseline) {
    return <div className="mx-auto max-w-3xl space-y-8"><div><Badge>Model exploration</Badge><h2 className="mt-3 text-3xl font-extrabold">What-If Simulator</h2><p className="mt-2 text-slate-500">Explore how different student profiles change the model-estimated exam score.</p></div><Card className="p-8"><EmptyState title="Make a prediction first" description="The simulator needs a real successful prediction as its baseline profile. No baseline has been created." /><div className="mt-6 flex justify-center"><Link to="/predict"><Button>Make a Prediction <ArrowRight size={16} /></Button></Link></div></Card></div>
  }

  const update = (name, value) => {
    setScenario(current => ({ ...current, [name]: value }))
    setScenarioScore(null)
    setRequestError('')
  }

  const resetScenario = () => {
    setScenario({ ...baseline.profile })
    setScenarioScore(baseline.score)
    setErrors({})
    setRequestError('')
  }

  const runSimulation = async event => {
    event.preventDefault()
    const nextErrors = validatePredictionForm(scenario)
    setErrors(nextErrors)
    setRequestError('')
    if (Object.keys(nextErrors).length) return

    setLoading(true)
    try {
      const result = await predictStudent(toPredictionPayload(scenario))
      setScenarioScore(result.predicted_score)
    } catch (error) {
      setRequestError(error.message || 'Something went wrong while calculating the model estimate. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const difference = typeof scenarioScore === 'number' ? scenarioScore - baseline.score : null
  const comparisonWidth = score => `${Math.min(100, Math.max(0, Number(score) || 0))}%`
  const differenceClass = difference === null ? 'text-slate-500' : difference > 0 ? 'text-emerald-600' : difference < 0 ? 'text-rose-600' : 'text-slate-600'
  const differenceLabel = difference === null ? 'Run simulation' : `${difference >= 0 ? '+' : ''}${difference.toFixed(2)}`

  return <div className="mx-auto max-w-5xl space-y-8"><div><Badge>Model exploration</Badge><h2 className="mt-3 text-3xl font-extrabold">What-If Simulator</h2><p className="mt-2 max-w-2xl text-slate-500">Explore how different student profiles change the model-estimated exam score.</p></div><div className="grid gap-4 md:grid-cols-3"><Card className="p-5"><p className="text-xs font-bold uppercase tracking-[.14em] text-slate-500">Baseline score</p><p className="mt-3 text-4xl font-extrabold text-slate-950">{scoreText(baseline.score)}</p><p className="mt-2 text-sm text-slate-500">Current model estimate</p></Card><Card className="border-indigo-100 bg-indigo-50 p-5"><p className="text-xs font-bold uppercase tracking-[.14em] text-indigo-700">Scenario score</p><p className="mt-3 text-4xl font-extrabold text-slate-950">{scoreText(scenarioScore)}</p><p className="mt-2 text-sm text-slate-500">After running this scenario</p></Card><Card className="p-5"><p className="text-xs font-bold uppercase tracking-[.14em] text-slate-500">Estimated change</p><p className={`mt-3 text-4xl font-extrabold ${differenceClass}`}>{differenceLabel}</p><p className="mt-2 text-sm text-slate-500">Model-estimated difference</p></Card></div><Card className="p-6"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="text-lg font-extrabold">Baseline vs scenario</h3><p className="mt-1 text-sm text-slate-500">This comparison reflects the trained model estimate, not a causal guarantee.</p></div><Sparkles className="text-indigo-600" size={22} /></div><div className="mt-6 space-y-4"><div><div className="mb-2 flex justify-between text-sm font-bold"><span>Baseline</span><span>{scoreText(baseline.score)}</span></div><div className="h-3 rounded-full bg-slate-100"><div className="h-3 rounded-full bg-slate-400" style={{ width: comparisonWidth(baseline.score) }} /></div></div><div><div className="mb-2 flex justify-between text-sm font-bold"><span>Scenario</span><span>{scoreText(scenarioScore)}</span></div><div className="h-3 rounded-full bg-indigo-100"><div className="h-3 rounded-full bg-indigo-600" style={{ width: comparisonWidth(scenarioScore) }} /></div></div></div></Card>{requestError && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{requestError}</div>}<form onSubmit={runSimulation} noValidate className="space-y-5"><div><h3 className="text-xl font-extrabold">What-If Scenario</h3><p className="mt-1 text-sm text-slate-500">Adjust the complete student profile, then explicitly run the simulation.</p></div>{groups.map(([section, fields]) => <Card key={section} className="p-6"><h3 className="font-extrabold">{section}</h3><div className="mt-5 grid gap-5 sm:grid-cols-2">{fields.map(([name, label, type]) => <label key={name} className={`block ${numericFields.has(name) ? 'rounded-lg border border-indigo-100 bg-indigo-50/50 p-3' : ''}`}><span className="mb-2 block text-sm font-bold">{label}{numericFields.has(name) && <span className="ml-2 text-xs font-medium text-indigo-600">Numeric control</span>}</span>{Array.isArray(type) ? <select className="field" value={scenario[name] || ''} onChange={event => update(name, event.target.value)}><option value="">Select {label.toLowerCase()}</option>{type.map(option => <option key={option} value={option}>{option}</option>)}</select> : <input className="field" type={type} value={scenario[name] ?? ''} onChange={event => update(name, event.target.value)} />}{errors[name] && <span className="mt-1 block text-xs font-bold text-red-600">{errors[name]}</span>}</label>)}</div></Card>)}<div className="flex flex-wrap gap-3"><Button type="submit" disabled={loading}>{loading ? 'Calculating model estimate...' : 'Run Simulation'} <Sparkles size={16} /></Button><Button type="button" variant="secondary" onClick={resetScenario}><RotateCcw size={16} />Reset Scenario</Button></div></form><p className="text-xs leading-5 text-slate-500">This simulator shows how the trained model's estimated score changes when the input profile changes. It does not establish causal relationships or guarantee actual exam-score changes.</p></div>
}
