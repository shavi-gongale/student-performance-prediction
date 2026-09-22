"""Baseline regression training for the student performance project."""

from pathlib import Path

import joblib
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.linear_model import LinearRegression
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.tree import DecisionTreeRegressor

from evaluate import calculate_regression_metrics
from preprocessing import (
	DEFAULT_DATA_PATH,
	TARGET_COLUMN,
	build_preprocessor,
	identify_feature_types,
	load_data,
)


PROJECT_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_MODEL_PATH = PROJECT_ROOT / "models" / "best_model.joblib"
DEFAULT_RESULTS_PATH = PROJECT_ROOT / "outputs" / "results" / "model_results.csv"


def split_features_and_target(
	data: pd.DataFrame, target_column: str = TARGET_COLUMN
) -> tuple[pd.DataFrame, pd.Series]:
	"""Separate predictors from the continuous target."""

	if target_column not in data.columns:
		raise ValueError(f"Target column {target_column!r} was not found.")
	return data.drop(columns=target_column), data[target_column]


def build_model_pipelines(
	numerical_columns: list[str], categorical_columns: list[str]
) -> dict[str, Pipeline]:
	"""Build unfitted preprocessing-plus-model pipelines."""

	model_definitions = {
		"Linear Regression": LinearRegression(),
		"Decision Tree Regressor": DecisionTreeRegressor(random_state=42),
		"Random Forest Regressor": RandomForestRegressor(
			n_estimators=200, random_state=42, n_jobs=-1
		),
	}
	return {
		name: Pipeline(
			steps=[
				("preprocessor", build_preprocessor(numerical_columns, categorical_columns)),
				("model", model),
			]
		)
		for name, model in model_definitions.items()
	}


def train_and_evaluate(
	data_path: str | Path = DEFAULT_DATA_PATH,
	results_path: str | Path = DEFAULT_RESULTS_PATH,
	model_path: str | Path = DEFAULT_MODEL_PATH,
) -> tuple[dict[str, Pipeline], pd.DataFrame, pd.DataFrame, pd.DataFrame]:
	"""Train baseline regressors, evaluate them, and save the selected pipeline."""

	data = load_data(data_path)
	X, y = split_features_and_target(data)
	numerical_columns, categorical_columns = identify_feature_types(data)
	X_train, X_test, y_train, y_test = train_test_split(
		X, y, test_size=0.20, random_state=42
	)

	pipelines = build_model_pipelines(numerical_columns, categorical_columns)
	predictions = {}
	metrics = []
	for name, pipeline in pipelines.items():
		pipeline.fit(X_train, y_train)
		prediction = pipeline.predict(X_test)
		predictions[name] = prediction
		metrics.append({"Model": name, **calculate_regression_metrics(y_test, prediction)})

	results = pd.DataFrame(metrics).sort_values("RMSE").reset_index(drop=True)
	selected_name = results.iloc[0]["Model"]
	model_path = Path(model_path)
	model_path.parent.mkdir(parents=True, exist_ok=True)
	joblib.dump(pipelines[selected_name], model_path)
	results_path = Path(results_path)
	results_path.parent.mkdir(parents=True, exist_ok=True)
	results.to_csv(results_path, index=False)

	predictions_frame = pd.DataFrame(
		{
			"Actual": y_test.to_numpy(),
			**{f"{name}_Predicted": values for name, values in predictions.items()},
		},
		index=y_test.index,
	)
	return pipelines, results, predictions_frame, pd.DataFrame(
		{"X_train": [len(X_train)], "X_test": [len(X_test)]}
	)


if __name__ == "__main__":
	train_and_evaluate()
