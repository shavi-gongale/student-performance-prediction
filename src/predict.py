"""Prediction helpers for the saved student-performance model.

The saved joblib artifact is a complete sklearn Pipeline, so callers provide
raw predictor values and do not need to encode or scale them manually.
"""

from pathlib import Path
from typing import Any

import joblib
import pandas as pd


PROJECT_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_MODEL_PATH = PROJECT_ROOT / "models" / "best_model.joblib"
TARGET_COLUMN = "Exam_Score"


def load_model(model_path: str | Path = DEFAULT_MODEL_PATH) -> Any:
	"""Load and return the existing complete preprocessing/model pipeline."""

	return joblib.load(model_path)


def _required_predictor_columns(model: Any) -> list[str]:
	"""Read the predictor schema stored by the fitted preprocessing step."""

	try:
		return list(model.named_steps["preprocessor"].feature_names_in_)
	except (AttributeError, KeyError) as error:
		raise ValueError(
			"The saved model does not expose the expected preprocessing schema."
		) from error


def _to_single_row_frame(student_data: pd.DataFrame | dict[str, Any]) -> pd.DataFrame:
	"""Validate input and convert a dictionary or one-row dataframe to a frame."""

	if isinstance(student_data, dict):
		data = pd.DataFrame([student_data])
	elif isinstance(student_data, pd.DataFrame):
		data = student_data.copy()
	else:
		raise TypeError("student_data must be a dictionary or pandas DataFrame.")

	if len(data) != 1:
		raise ValueError("student_data must contain exactly one student row.")
	if TARGET_COLUMN in data.columns:
		raise ValueError("Exam_Score must not be supplied as an input feature.")

	model = load_model()
	required_columns = _required_predictor_columns(model)
	missing_columns = [column for column in required_columns if column not in data.columns]
	if missing_columns:
		raise ValueError(
			"Missing required predictor columns: " + ", ".join(missing_columns)
		)

	unexpected_columns = [column for column in data.columns if column not in required_columns]
	if unexpected_columns:
		raise ValueError(
			"Unexpected input columns: " + ", ".join(unexpected_columns)
		)

	return data.loc[:, required_columns]


def predict_exam_score(student_data: pd.DataFrame | dict[str, Any]) -> float:
	"""Predict one student's continuous ``Exam_Score`` from raw input values."""

	data = _to_single_row_frame(student_data)
	model = load_model()
	prediction = model.predict(data)
	return float(prediction[0])


def generate_student_prediction(
	student_data: pd.DataFrame | dict[str, Any],
) -> dict[str, object]:
	"""Return a predicted score and personalized rule-based recommendations."""

	try:
		from .recommendations import generate_recommendations
	except ImportError:
		from recommendations import generate_recommendations

	data = _to_single_row_frame(student_data)
	predicted_score = predict_exam_score(data)
	return {
		"predicted_score": predicted_score,
		"recommendations": generate_recommendations(
			data, predicted_score=predicted_score
		),
	}
