"""Read-only explanations for the existing fitted prediction pipeline."""

from typing import Any

import numpy as np

try:
	from .predict import _to_single_row_frame, load_model
except ImportError:
	from predict import _to_single_row_frame, load_model


FEATURE_LABELS = {
	"Hours_Studied": "Hours Studied",
	"Attendance": "Attendance",
	"Parental_Involvement": "Parental Involvement",
	"Access_to_Resources": "Access to Resources",
	"Extracurricular_Activities": "Extracurricular Activities",
	"Sleep_Hours": "Sleep Hours",
	"Previous_Scores": "Previous Scores",
	"Motivation_Level": "Motivation Level",
	"Internet_Access": "Internet Access",
	"Tutoring_Sessions": "Tutoring Sessions",
	"Family_Income": "Family Income",
	"Teacher_Quality": "Teacher Quality",
	"School_Type": "School Type",
	"Peer_Influence": "Peer Influence",
	"Physical_Activity": "Physical Activity",
	"Learning_Disabilities": "Learning Disabilities",
	"Parental_Education_Level": "Parental Education Level",
	"Distance_from_Home": "Distance from Home",
	"Gender": "Gender",
}


def _readable_feature_name(transformed_name: str, raw_columns: list[str]) -> str:
	"""Map sklearn's transformed name to a student-readable feature label."""

	name = transformed_name.split("__", 1)[-1]
	for column in raw_columns:
		if name == column:
			return FEATURE_LABELS.get(column, column.replace("_", " "))
		prefix = f"{column}_"
		if name.startswith(prefix):
			category = name[len(prefix):].replace("_", " ")
			label = FEATURE_LABELS.get(column, column.replace("_", " "))
			return f"{label}: {category}"
	return name.replace("_", " ")


def explain_student_prediction(student_data: dict[str, Any]) -> dict[str, object]:
	"""Return actual transformed-feature contributions for one model prediction."""

	data = _to_single_row_frame(student_data)
	model = load_model()
	try:
		preprocessor = model.named_steps["preprocessor"]
		regressor = model.named_steps["model"]
		coefficients = np.asarray(regressor.coef_, dtype=float).reshape(-1)
		intercept = float(np.asarray(regressor.intercept_).reshape(-1)[0])
	except (AttributeError, KeyError) as error:
		raise ValueError("The saved model does not expose a linear explanation interface.") from error

	transformed = np.asarray(preprocessor.transform(data), dtype=float)[0]
	feature_names = list(preprocessor.get_feature_names_out())
	if len(transformed) != len(coefficients) or len(feature_names) != len(coefficients):
		raise ValueError("The fitted preprocessing and model features are inconsistent.")

	contributions = []
	raw_columns = list(data.columns)
	for transformed_name, value, coefficient in zip(feature_names, transformed, coefficients):
		value = float(value)
		coefficient = float(coefficient)
		contributions.append({
			"feature": _readable_feature_name(transformed_name, raw_columns),
			"value": value,
			"coefficient": coefficient,
			"contribution": value * coefficient,
		})

	prediction = float(np.asarray(model.predict(data)).reshape(-1)[0])
	contributions.sort(key=lambda item: abs(item["contribution"]), reverse=True)
	return {
		"prediction": prediction,
		"intercept": intercept,
		"contributions": contributions,
	}
