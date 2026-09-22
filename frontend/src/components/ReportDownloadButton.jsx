import { useState } from 'react'
import { Download } from 'lucide-react'
import { Button } from './ui'
import { useAuth } from '../auth/AuthContext'
import { usePrediction } from '../context/PredictionContext'
import { explainStudent, generateStudentInsights, generateStudentReport } from '../services/api'
import { getUserPredictionHistory } from '../utils/predictionHistory'

export default function ReportDownloadButton() {
  const { user } = useAuth()
  const { latestPrediction } = usePrediction()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const download = async () => {
    const record = getUserPredictionHistory(user?.email)[0]
    const profile = latestPrediction?.profile || record?.profileSnapshot
    const result = latestPrediction?.result || (record ? { predicted_score: record.predictedScore, recommendations: record.recommendations } : null)
    if (!profile || !result) {
      setError('Make a prediction before generating a report.')
      return
    }

    setLoading(true)
    setError('')
    try {
      const [explanation, insights] = await Promise.all([explainStudent(profile), generateStudentInsights(profile)])
      const reportData = {
        ...profile,
        student_name: user.fullName,
        email: user.email,
        college: user.college,
        branch: user.branch,
        year: user.year,
        semester: user.semester,
        prediction: result.predicted_score,
        contributions: explanation.contributions,
        recommendations: result.recommendations,
        insights: {
          summary: insights.summary,
          key_factors: insights.key_factors,
          focus_areas: insights.focus_areas,
        },
      }
      const blob = await generateStudentReport(reportData)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'student-performance-report.pdf'
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch (requestError) {
      setError(requestError.message || 'Unable to generate the student report.')
    } finally {
      setLoading(false)
    }
  }

  return <div className="space-y-2"><Button type="button" variant="secondary" onClick={download} disabled={loading}><Download size={16} />{loading ? 'Generating report...' : 'Download Student Report'}</Button>{error && <div role="alert" className="text-sm font-bold text-red-600">{error}</div>}</div>
}
