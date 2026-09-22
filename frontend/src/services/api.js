const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

async function parseResponse(response) {
  const body = await response.json().catch(() => null)
  if (response.ok) return body
  const error = new Error(
    response.status === 422
      ? 'Please check the highlighted fields.'
      : response.status >= 500
        ? 'Something went wrong while generating your prediction. Please try again.'
        : 'Unable to connect to the prediction service. Make sure the Python backend is running.',
  )
  error.status = response.status
  error.details = body?.errors || body?.detail
  throw error
}

export async function healthCheck() {
  const response = await fetch(`${API_BASE_URL}/api/health`)
  return parseResponse(response)
}

export async function predictStudent(studentData) {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), 15000)
  try {
    const response = await fetch(`${API_BASE_URL}/api/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(studentData),
      signal: controller.signal,
    })
    const result = await parseResponse(response)
    if (!result || typeof result.predicted_score !== 'number' || !Array.isArray(result.recommendations)) {
      throw new Error('The prediction service returned an unexpected response.')
    }
    return result
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('The prediction request timed out. Please try again.')
    if (error instanceof TypeError) throw new Error('Unable to connect to the prediction service. Make sure the Python backend is running.')
    throw error
  } finally {
    window.clearTimeout(timeout)
  }
}

export async function explainStudent(studentData) {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), 15000)
  try {
    const response = await fetch(`${API_BASE_URL}/api/explain`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(studentData),
      signal: controller.signal,
    })
    const result = await parseResponse(response)
    if (!result || typeof result.prediction !== 'number' || typeof result.intercept !== 'number' || !Array.isArray(result.contributions)) {
      throw new Error('The explanation service returned an unexpected response.')
    }
    return result
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('The explanation request timed out. Please try again.')
    if (error instanceof TypeError) throw new Error('Unable to connect to the explanation service. Make sure the Python backend is running.')
    throw error
  } finally {
    window.clearTimeout(timeout)
  }
}

export async function generateStudentInsights(studentData) {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), 15000)
  try {
    const response = await fetch(`${API_BASE_URL}/api/insights`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(studentData),
      signal: controller.signal,
    })
    const result = await parseResponse(response)
    if (!result || typeof result.prediction !== 'number' || typeof result.summary !== 'string' || !Array.isArray(result.key_factors) || !Array.isArray(result.focus_areas)) {
      throw new Error('The insight service returned an unexpected response.')
    }
    return result
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('The insight request timed out. Please try again.')
    if (error instanceof TypeError) throw new Error('Unable to connect to the insight service. Make sure the Python backend is running.')
    throw error
  } finally {
    window.clearTimeout(timeout)
  }
}

export async function generateStudentReport(reportData) {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), 15000)
  try {
    const response = await fetch(`${API_BASE_URL}/api/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reportData),
      signal: controller.signal,
    })
    if (!response.ok) {
      const body = await response.json().catch(() => null)
      const error = new Error(response.status === 422 ? 'The report data is incomplete or invalid.' : 'Unable to generate the student report. Please try again.')
      error.status = response.status
      error.details = body?.detail || body?.errors
      throw error
    }
    return response.blob()
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('The report request timed out. Please try again.')
    if (error instanceof TypeError) throw new Error('Unable to connect to the report service. Make sure the Python backend is running.')
    throw error
  } finally {
    window.clearTimeout(timeout)
  }
}

export async function runBatchPrediction(file) {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), 30000)
  try {
    const formData = new FormData()
    formData.append('file', file)
    const response = await fetch(`${API_BASE_URL}/api/batch-predict`, { method: 'POST', body: formData, signal: controller.signal })
    if (!response.ok) {
      const body = await response.json().catch(() => null)
      const error = new Error(body?.detail || 'Unable to run batch prediction. Please check your CSV and try again.')
      error.status = response.status
      throw error
    }
    return response.blob()
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('The batch prediction request timed out. Please try again.')
    if (error instanceof TypeError) throw new Error('Unable to connect to the batch prediction service. Make sure the Python backend is running.')
    throw error
  } finally {
    window.clearTimeout(timeout)
  }
}

export async function getAnalytics() {
  const response = await fetch(`${API_BASE_URL}/api/analytics`)
  return parseResponse(response)
}

export async function getModelPerformance() {
  const response = await fetch(`${API_BASE_URL}/api/model-performance`)
  return parseResponse(response)
}

export function getFigureUrl(path) {
  return `${API_BASE_URL}${path}`
}

export { API_BASE_URL }
