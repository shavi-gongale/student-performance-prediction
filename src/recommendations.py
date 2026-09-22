"""Data-driven recommendations based on the raw training distribution.

Numerical recommendations use empirical percentile ranks and correlations with
``Exam_Score``. Categorical recommendations use observed group-average score
differences. The engine ranks the resulting profile signals and returns only
the strongest distinct categories, so it remains concise and deterministic.
"""

from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd


PROJECT_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_DATA_PATH = PROJECT_ROOT / "data" / "raw" / "StudentPerformanceFactors.csv"
TARGET_COLUMN = "Exam_Score"
NUMERICAL_FEATURES = [
	"Hours_Studied",
	"Attendance",
	"Previous_Scores",
	"Tutoring_Sessions",
	"Sleep_Hours",
	"Physical_Activity",
]
CATEGORICAL_FEATURES = [
	"Parental_Involvement",
	"Access_to_Resources",
	"Extracurricular_Activities",
	"Motivation_Level",
	"Internet_Access",
	"Family_Income",
	"Teacher_Quality",
	"School_Type",
	"Peer_Influence",
	"Learning_Disabilities",
	"Parental_Education_Level",
	"Distance_from_Home",
	"Gender",
]


def _load_reference_data(data_path: str | Path = DEFAULT_DATA_PATH) -> pd.DataFrame:
	"""Load the unchanged raw dataset used as the recommendation reference."""

	return pd.read_csv(data_path)


REFERENCE_DATA = _load_reference_data()
TARGET_STATS = REFERENCE_DATA[TARGET_COLUMN].describe()
NUMERICAL_CORRELATIONS = (
	REFERENCE_DATA[NUMERICAL_FEATURES + [TARGET_COLUMN]]
	.corr()[TARGET_COLUMN]
	.drop(TARGET_COLUMN)
)


def _to_record(student_data: pd.DataFrame | dict[str, Any]) -> dict[str, Any]:
	"""Convert one supported input row into a plain dictionary."""

	if isinstance(student_data, dict):
		return dict(student_data)
	if isinstance(student_data, pd.DataFrame):
		if len(student_data) != 1:
			raise ValueError("student_data must contain exactly one student row.")
		return student_data.iloc[0].to_dict()
	raise TypeError("student_data must be a dictionary or pandas DataFrame.")


def _empirical_percentile(series: pd.Series, value: Any) -> float | None:
	"""Return the observed percentile rank of a value, or None when unavailable."""

	if pd.isna(value):
		return None
	valid_values = series.dropna()
	if not len(valid_values):
		return None
	return float((valid_values <= value).mean())


def _prediction_context(predicted_score: float) -> tuple[float, str]:
	"""Describe the model score relative to the observed target distribution."""

	predicted_percentile = _empirical_percentile(
		REFERENCE_DATA[TARGET_COLUMN], predicted_score
	)
	predicted_percentile = predicted_percentile if predicted_percentile is not None else 0.5
	context = (
		f"The model estimate is {predicted_score:.1f}, around the "
		f"{predicted_percentile:.0%} percentile of observed scores."
	)
	return predicted_percentile, context


def _priority(score: float, rank: int) -> str:
	"""Assign a stable display priority from ranked evidence strength."""

	if rank == 0:
		return "high"
	if rank < 3:
		return "medium"
	return "low"


def generate_recommendations(
	student_data: pd.DataFrame | dict[str, Any],
	predicted_score: float | None = None,
) -> list[dict[str, str]]:
	"""Generate 2-5 ranked recommendations from the complete student profile.

	When ``predicted_score`` is omitted, the existing prediction module supplies
	it from ``best_model.joblib``. The model prediction adds context and ranking
	weight; it never creates High/Average/Low labels.
	"""

	record = _to_record(student_data)
	if predicted_score is None:
		try:
			from .predict import predict_exam_score
		except ImportError:
			from predict import predict_exam_score
		predicted_score = predict_exam_score(student_data)

	predicted_percentile, context = _prediction_context(float(predicted_score))
	model_focus = max(0.0, 0.5 - predicted_percentile)
	candidates: list[dict[str, Any]] = []

	category_details = {
		"Hours_Studied": (
			"Study Habits",
			"Consider building a gradual, consistent study schedule.",
		),
		"Attendance": (
			"Attendance",
			"Consider planning ways to attend more consistently when possible.",
		),
		"Previous_Scores": (
			"Previous Performance",
			"Consider revisiting earlier topics and using targeted practice.",
		),
		"Tutoring_Sessions": (
			"Tutoring and Practice",
			"Consider adding guided practice or tutoring for difficult topics.",
		),
		"Sleep_Hours": (
			"Sleep and Well-being",
			"Consider protecting a consistent sleep routine around study time.",
		),
		"Physical_Activity": (
			"Sleep and Well-being",
			"Consider including regular physical activity in a balanced routine.",
		),
	}

	for feature in NUMERICAL_FEATURES:
		percentile = _empirical_percentile(REFERENCE_DATA[feature], record.get(feature))
		if percentile is None:
			continue
		relative_gap = max(0.0, 0.5 - percentile)
		association = abs(float(NUMERICAL_CORRELATIONS[feature]))
		focus_score = relative_gap * (association + model_focus)
		if focus_score <= 0:
			continue
		category, action = category_details[feature]
		candidates.append(
			{
				"score": focus_score,
				"feature": feature,
				"category": category,
				"message": (
					f"Your {feature.replace('_', ' ').lower()} is at about the "
					f"{percentile:.0%} percentile of the reference dataset. {action}"
				),
				"reason": (
					f"This profile value is relatively low, and its observed linear "
					f"association with Exam_Score is {float(NUMERICAL_CORRELATIONS[feature]):.2f}. {context}"
				),
			}
		)

	for feature in CATEGORICAL_FEATURES:
		value = record.get(feature)
		if pd.isna(value):
			continue
		group = REFERENCE_DATA.loc[REFERENCE_DATA[feature] == value, TARGET_COLUMN]
		if group.empty:
			continue
		group_mean = float(group.mean())
		mean_gap = float(TARGET_STATS["mean"] - group_mean)
		if mean_gap <= 0:
			continue
		# Larger observed gaps and adequately represented groups receive more weight.
		representation = np.sqrt(len(group) / len(REFERENCE_DATA))
		focus_score = (mean_gap / float(TARGET_STATS["std"])) * representation
		if focus_score <= 0:
			continue
		category_actions = {
			"Access_to_Resources": ("Learning Environment", "Consider identifying additional study materials or school resources."),
			"Motivation_Level": ("Motivation", "Consider setting small, specific study goals and reviewing progress regularly."),
			"Parental_Involvement": ("Learning Environment", "Consider identifying a trusted person who can provide study support."),
			"Internet_Access": ("Learning Environment", "Consider using available school or community access to study resources."),
			"Learning_Disabilities": ("Learning Support", "Consider discussing available learning supports with your school or teaching team."),
		}
		if feature not in category_actions:
			continue
		category, action = category_actions[feature]
		candidates.append(
			{
				"score": focus_score + model_focus * focus_score,
				"feature": feature,
				"category": category,
				"message": f"The observed {feature.replace('_', ' ').lower()} group '{value}' averages {group_mean:.1f} Exam_Score in this dataset. {action}",
				"reason": f"The group average is {mean_gap:.1f} points below the dataset mean; this is an observed association, not a causal conclusion. {context}",
			}
		)

	candidates.sort(key=lambda item: (-item["score"], item["feature"]))
	selected: list[dict[str, str]] = []
	seen_categories: set[str] = set()
	for rank, candidate in enumerate(candidates):
		if candidate["category"] in seen_categories:
			continue
		selected.append(
			{
				"category": candidate["category"],
				"message": candidate["message"],
				"reason": candidate["reason"],
				"priority": _priority(candidate["score"], rank),
			}
		)
		seen_categories.add(candidate["category"])
		if len(selected) == 5:
			break
	return selected