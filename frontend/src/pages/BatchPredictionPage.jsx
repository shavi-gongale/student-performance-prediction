import { useMemo, useRef, useState } from 'react'
import { Download, FileSpreadsheet, RotateCcw, Upload } from 'lucide-react'
import { Badge, Button, Card, EmptyState } from '../components/ui'
import { runBatchPrediction } from '../services/api'

const columns = ['Hours_Studied','Attendance','Parental_Involvement','Access_to_Resources','Extracurricular_Activities','Sleep_Hours','Previous_Scores','Motivation_Level','Internet_Access','Tutoring_Sessions','Family_Income','Teacher_Quality','School_Type','Peer_Influence','Physical_Activity','Learning_Disabilities','Parental_Education_Level','Distance_from_Home','Gender']
const example = ['8','92','High','High','Yes','6','80','High','Yes','3','High','High','Public','Positive','5','No','College','Near','Male']

function parseCsvRows(text) {
  return Math.max(0, text.trim().split(/\r?\n/).length - 1)
}

function parseCsvLine(line) {
  const values = []
  const pattern = /(?:^|,)(?:"((?:[^"]|"")*)"|([^",]*))/g
  let match
  while ((match = pattern.exec(line))) values.push((match[1] ?? match[2] ?? '').replace(/""/g, '"'))
  return values
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export default function BatchPredictionPage() {
  const inputRef = useRef(null)
  const [file, setFile] = useState(null)
  const [rowCount, setRowCount] = useState(null)
  const [resultBlob, setResultBlob] = useState(null)
  const [resultRows, setResultRows] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const summary = useMemo(() => ({
    total: resultRows.length,
    success: resultRows.filter(row => row.Status === 'success').length,
    failed: resultRows.filter(row => row.Status === 'error').length,
    average: (() => { const scores = resultRows.filter(row => row.Status === 'success').map(row => Number(row.Predicted_Score)); return scores.length ? (scores.reduce((sum, value) => sum + value, 0) / scores.length).toFixed(2) : '--' })(),
  }), [resultRows])

  const chooseFile = event => {
    const selected = event.target.files?.[0] || null
    setFile(selected)
    setResultBlob(null)
    setResultRows([])
    setError('')
    if (selected) {
      const reader = new FileReader()
      reader.onload = () => setRowCount(parseCsvRows(String(reader.result || '')))
      reader.readAsText(selected)
    } else setRowCount(null)
  }

  const reset = () => {
    setFile(null); setRowCount(null); setResultBlob(null); setResultRows([]); setError('')
    if (inputRef.current) inputRef.current.value = ''
  }

  const downloadTemplate = () => {
    const csv = `${columns.join(',')}\n${example.join(',')}\n`
    downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), 'student_prediction_template.csv')
  }

  const run = async () => {
    if (!file) { setError('Select a CSV file before running batch prediction.'); return }
    setLoading(true); setError(''); setResultBlob(null); setResultRows([])
    try {
      const blob = await runBatchPrediction(file)
      const text = await blob.text()
      const lines = text.trim().split(/\r?\n/)
      const headers = parseCsvLine(lines.shift() || '')
      const rows = lines.map(line => Object.fromEntries(headers.map((header, index) => [header, parseCsvLine(line)[index] || ''])))
      setResultBlob(blob); setResultRows(rows)
    } catch (requestError) { setError(requestError.message || 'Unable to run batch prediction.') } finally { setLoading(false) }
  }

  return <div className="mx-auto max-w-6xl space-y-8"><div><Badge>Batch workspace</Badge><h2 className="mt-3 text-3xl font-extrabold">Batch Prediction</h2><p className="mt-2 max-w-2xl text-slate-500">Upload a CSV containing multiple student profiles to generate performance predictions.</p></div><Card className="p-6"><div className="flex flex-wrap gap-3"><Button type="button" variant="secondary" onClick={downloadTemplate}><Download size={16} />Download CSV Template</Button><Button type="button" variant="secondary" onClick={() => inputRef.current?.click()}><Upload size={16} />Choose CSV</Button><input ref={inputRef} className="hidden" type="file" accept=".csv,text/csv" onChange={chooseFile} /></div>{file && <div className="mt-5 flex flex-col gap-3 rounded-lg border border-indigo-100 bg-indigo-50 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><FileSpreadsheet className="text-indigo-600" /><div><p className="font-bold text-slate-800">{file.name}</p><p className="text-sm text-slate-500">{(file.size / 1024).toFixed(1)} KB{rowCount !== null ? ` · ${rowCount} data row${rowCount === 1 ? '' : 's'}` : ''}</p></div></div><Button type="button" variant="secondary" onClick={reset}><RotateCcw size={16} />Remove</Button></div>}{error && <div role="alert" className="mt-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">{error}</div>}<div className="mt-6 flex flex-wrap gap-3"><Button type="button" disabled={loading} onClick={run}>{loading ? 'Running batch prediction...' : 'Run Batch Prediction'}</Button>{resultBlob && <Button type="button" variant="secondary" onClick={() => downloadBlob(resultBlob, 'student_batch_predictions.csv')}><Download size={16} />Download Results CSV</Button>}</div></Card>{resultRows.length ? <><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Card className="p-5"><p className="text-xs font-bold uppercase text-slate-500">Total rows</p><p className="mt-2 text-3xl font-extrabold">{summary.total}</p></Card><Card className="p-5"><p className="text-xs font-bold uppercase text-slate-500">Successful</p><p className="mt-2 text-3xl font-extrabold text-emerald-600">{summary.success}</p></Card><Card className="p-5"><p className="text-xs font-bold uppercase text-slate-500">Failed</p><p className="mt-2 text-3xl font-extrabold text-rose-600">{summary.failed}</p></Card><Card className="p-5"><p className="text-xs font-bold uppercase text-slate-500">Average score</p><p className="mt-2 text-3xl font-extrabold">{summary.average}</p></Card></div><Card className="overflow-hidden p-0"><div className="max-w-full overflow-x-auto"><table className="min-w-[720px] w-full text-left text-sm"><thead className="bg-slate-50"><tr>{['Row','Status','Predicted Score','Recommendations','Error'].map(header => <th key={header} className="px-4 py-3 font-bold text-slate-600">{header}</th>)}</tr></thead><tbody>{resultRows.map((row, index) => <tr key={index} className="border-t border-slate-100"><td className="px-4 py-3">{row.row_number || index + 2}</td><td className={`px-4 py-3 font-bold ${row.Status === 'success' ? 'text-emerald-600' : 'text-rose-600'}`}>{row.Status}</td><td className="px-4 py-3">{row.Predicted_Score || '--'}</td><td className="max-w-md px-4 py-3 text-slate-600">{row.Recommendations || '--'}</td><td className="max-w-md px-4 py-3 text-rose-600">{row.Error || '--'}</td></tr>)}</tbody></table></div></Card></> : <Card className="p-6"><EmptyState title="No batch results yet" description="Choose a CSV and run the existing trained model across its valid rows." /></Card>}</div>
}
