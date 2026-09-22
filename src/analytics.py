"""Read-only adapters for the project's existing analytics artifacts."""

from pathlib import Path

import numpy as np
import pandas as pd


PROJECT_ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = PROJECT_ROOT / "data" / "raw" / "StudentPerformanceFactors.csv"
RESULTS_PATH = PROJECT_ROOT / "outputs" / "results" / "model_results.csv"
FIGURES_PATH = PROJECT_ROOT / "outputs" / "figures"
NUMERICAL_COLUMNS = [
	"Hours_Studied",
	"Attendance",
	"Sleep_Hours",
	"Previous_Scores",
	"Tutoring_Sessions",
	"Physical_Activity",
	"Exam_Score",
]
CATEGORICAL_COLUMNS = [
	"Parental_Involvement",
	"Access_to_Resources",
	"Motivation_Level",
	"Teacher_Quality",
	"Family_Income",
	"School_Type",
]


def _load_dataset() -> pd.DataFrame:
	return pd.read_csv(DATA_PATH)


def _histogram(series: pd.Series, bins: int = 10) -> list[dict[str, float | int | str]]:
	counts, edges = np.histogram(series.dropna().to_numpy(), bins=bins)
	return [
		{
			"label": f"{edges[index]:.0f}-{edges[index + 1]:.0f}",
			"value": int(counts[index]),
		}
		for index in range(bins)
	]


def get_analytics() -> dict[str, object]:
	"""Return statistics and observations calculated from the raw CSV."""

	data = _load_dataset()
	target = data["Exam_Score"]
	correlations = data[NUMERICAL_COLUMNS].corr()
	group_comparisons = {
		column: [
			{"group": str(group), "mean": float(mean), "count": int(count)}
			for group, (mean, count) in data.groupby(column, dropna=False)["Exam_Score"].agg(["mean", "count"]).iterrows()
		]
		for column in CATEGORICAL_COLUMNS
	}

	return {
		"source": "data/raw/StudentPerformanceFactors.csv",
		"target": "Exam_Score",
		"target_statistics": {
			"mean": float(target.mean()),
			"median": float(target.median()),
			"minimum": float(target.min()),
			"maximum": float(target.max()),
		},
		"distribution": _histogram(target),
		"scatter": {
			column: [
				{"x": float(row[column]), "y": float(row["Exam_Score"])}
				for _, row in data[[column, "Exam_Score"]].dropna().iterrows()
			]
			for column in ["Attendance", "Hours_Studied", "Previous_Scores"]
		},
		"correlation_matrix": [
			{"feature": row_name, **{column: float(value) for column, value in row.items()}}
			for row_name, row in correlations.iterrows()
		],
		"correlations_with_target": [
			{"name": column, "value": float(correlations.loc[column, "Exam_Score"])}
			for column in NUMERICAL_COLUMNS[:-1]
		],
		"categorical_comparisons": group_comparisons,
	}


def get_model_performance() -> dict[str, object]:
	"""Return the existing test-set comparison results without recalculating models."""

	results = pd.read_csv(RESULTS_PATH)
	results = results.rename(columns={"RÂ²": "R²", "R2": "R²"})
	metrics = results.to_dict(orient="records")
	selected = results.sort_values("RMSE", ascending=True).iloc[0]["Model"]
	return {
		"source": "outputs/results/model_results.csv",
		"evaluation": "Test-set evaluation",
		"selected_model": str(selected),
		"models": metrics,
		"figures": {
			"actual_vs_predicted": "/api/figures/actual_vs_predicted.png",
			"residual_analysis": "/api/figures/residual_analysis.png",
			"model_comparison": "/api/figures/model_comparison.png",
		},
		"methodology": ["Dataset", "Preprocessing", "Train/Test Split", "Model Training", "Evaluation", "Linear Regression selected based on current evaluation"],
	}


def get_figure_path(filename: str) -> Path:
	"""Resolve one known project evaluation figure."""

	allowed = {"actual_vs_predicted.png", "residual_analysis.png", "model_comparison.png"}
	if filename not in allowed:
		raise FileNotFoundError(filename)
	path = FIGURES_PATH / filename
	if not path.is_file():
		raise FileNotFoundError(filename)
	return path