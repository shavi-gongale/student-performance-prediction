export const groups = [
  ['Academic Performance', [['Hours_Studied', 'Hours studied', 'number'], ['Attendance', 'Attendance (%)', 'number'], ['Previous_Scores', 'Previous scores', 'number'], ['Tutoring_Sessions', 'Tutoring sessions', 'number']]],
  ['Learning & Lifestyle', [['Sleep_Hours', 'Sleep hours', 'number'], ['Physical_Activity', 'Physical activity (hours)', 'number'], ['Extracurricular_Activities', 'Extracurricular activities', ['Yes', 'No']], ['Motivation_Level', 'Motivation level', ['Low', 'Medium', 'High']]]],
  ['Learning Environment', [['Access_to_Resources', 'Access to resources', ['Low', 'Medium', 'High']], ['Internet_Access', 'Internet access', ['Yes', 'No']], ['Teacher_Quality', 'Teacher quality', ['Low', 'Medium', 'High']], ['School_Type', 'School type', ['Public', 'Private']], ['Peer_Influence', 'Peer influence', ['Positive', 'Neutral', 'Negative']]]],
  ['Family & Background', [['Parental_Involvement', 'Parental involvement', ['Low', 'Medium', 'High']], ['Family_Income', 'Family income', ['Low', 'Medium', 'High']], ['Parental_Education_Level', 'Parental education level', ['High School', 'College', 'Postgraduate']], ['Distance_from_Home', 'Distance from home', ['Near', 'Moderate', 'Far']], ['Learning_Disabilities', 'Learning disabilities', ['Yes', 'No']], ['Gender', 'Gender', ['Male', 'Female']]]],
]

export const numericFields = new Set(['Hours_Studied', 'Attendance', 'Previous_Scores', 'Tutoring_Sessions', 'Physical_Activity', 'Sleep_Hours'])
export const emptyProfile = Object.fromEntries(groups.flatMap(([, fields]) => fields.map(([name]) => [name, ''])))

export function validatePredictionForm(form) {
  const errors = {}
  Object.entries(form).forEach(([name, value]) => {
    if (!value) errors[name] = 'This field is required.'
    else if (numericFields.has(name) && !Number.isFinite(Number(value))) errors[name] = 'Enter a valid number.'
  })
  return errors
}

export function toPredictionPayload(form) {
  return Object.fromEntries(Object.entries(form).map(([name, value]) => [name, numericFields.has(name) ? Number(value) : value]))
}
