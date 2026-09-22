export const PREDICTION_HISTORY_KEY = 'student_performance_prediction_history'

function readAll() {
  try {
    const parsed = JSON.parse(localStorage.getItem(PREDICTION_HISTORY_KEY) || '[]')
    if (!Array.isArray(parsed)) return []
    return parsed.filter(record => record && typeof record === 'object' && typeof record.id === 'string' && typeof record.userEmail === 'string')
  } catch {
    return []
  }
}

function writeAll(records) {
  try {
    localStorage.setItem(PREDICTION_HISTORY_KEY, JSON.stringify(records))
  } catch {
    // Storage failures should not interrupt the successful prediction UI.
  }
}

function createId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function addPredictionHistory({ userEmail, profileSnapshot, inputData, result }) {
  if (!userEmail || !result || typeof result.predicted_score !== 'number') return null
  const record = {
    id: createId(),
    userEmail: userEmail.toLowerCase(),
    createdAt: new Date().toISOString(),
    predictedScore: result.predicted_score,
    profileSnapshot: { ...profileSnapshot },
    inputData: { ...inputData },
    recommendations: Array.isArray(result.recommendations) ? result.recommendations.map(item => ({ ...item })) : [],
  }
  writeAll([record, ...readAll()])
  return record
}

export function getUserPredictionHistory(userEmail) {
  if (!userEmail) return []
  return readAll().filter(record => record.userEmail === userEmail.toLowerCase()).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
}

export function getUserPrediction(userEmail, predictionId) {
  return getUserPredictionHistory(userEmail).find(record => record.id === predictionId) || null
}

export function deleteUserPrediction(userEmail, predictionId) {
  const records = readAll()
  writeAll(records.filter(record => !(record.userEmail === userEmail?.toLowerCase() && record.id === predictionId)))
}

export function clearUserPredictionHistory(userEmail) {
  const normalizedEmail = userEmail?.toLowerCase()
  if (!normalizedEmail) return
  writeAll(readAll().filter(record => record.userEmail !== normalizedEmail))
}
