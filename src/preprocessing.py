"""Reusable preprocessing helpers for the student performance dataset.

The functions in this module keep two responsibilities separate:

* ``handle_missing_values`` creates a human-readable cleaned dataframe that
  can be inspected or saved as CSV.
* ``build_preprocessor`` creates an unfitted sklearn transformer for later
  model training. It must be fitted only on training data.
"""

from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler


PROJECT_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_DATA_PATH = PROJECT_ROOT / "data" / "raw" / "StudentPerformanceFactors.csv"
DEFAULT_CLEANED_DATA_PATH = PROJECT_ROOT / "data" / "processed" / "cleaned_data.csv"
TARGET_COLUMN = "Exam_Score"


def load_data(data_path: str | Path = DEFAULT_DATA_PATH) -> pd.DataFrame:
	"""Load the original CSV without changing it."""

	return pd.read_csv(data_path)


def identify_feature_types(
	data: pd.DataFrame, target_column: str = TARGET_COLUMN
) -> tuple[list[str], list[str]]:
	"""Return numerical and categorical predictor columns automatically."""

	if target_column not in data.columns:
		raise ValueError(f"Target column {target_column!r} was not found.")

	predictors = data.drop(columns=target_column)
	numerical_columns = predictors.select_dtypes(include=np.number).columns.tolist()
	categorical_columns = predictors.select_dtypes(exclude=np.number).columns.tolist()
	return numerical_columns, categorical_columns


def handle_missing_values(
	data: pd.DataFrame, target_column: str = TARGET_COLUMN
) -> pd.DataFrame:
	"""Return a human-readable copy with missing predictor values imputed.

	Categorical predictors use their most frequent value because this is
	deterministic, preserves an existing category, and avoids inventing a
	new label. Numerical predictors use the median because it is robust to
	extreme values. The target is never imputed; missing target values would
	make a training row unusable and therefore raise an error.
	"""

	numerical_columns, categorical_columns = identify_feature_types(
		data, target_column
	)
	if data[target_column].isna().any():
		raise ValueError(f"Target column {target_column!r} contains missing values.")

	cleaned_data = data.copy()

	for column in categorical_columns:
		if cleaned_data[column].isna().any():
			cleaned_data[column] = cleaned_data[column].fillna(
				cleaned_data[column].mode(dropna=True).iloc[0]
			)

	for column in numerical_columns:
		if cleaned_data[column].isna().any():
			cleaned_data[column] = cleaned_data[column].fillna(
				cleaned_data[column].median()
			)

	return cleaned_data


def build_preprocessor(
	numerical_columns: list[str], categorical_columns: list[str]
) -> ColumnTransformer:
	"""Build an unfitted transformer for use after a train-test split.

	Numerical values are median-imputed and standardized for compatibility
	with scale-sensitive models that may be selected later. Categorical values
	are mode-imputed and one-hot encoded. ``handle_unknown='ignore'`` lets
	validation or future data contain a category absent from training.

	This transformer is intentionally returned unfitted. Fit it only on the
	training features to prevent information leakage from validation data.
	"""

	numerical_pipeline = Pipeline(
		steps=[
			("imputer", SimpleImputer(strategy="median")),
			("scaler", StandardScaler()),
		]
	)
	categorical_pipeline = Pipeline(
		steps=[
			("imputer", SimpleImputer(strategy="most_frequent")),
			(
				"encoder",
				OneHotEncoder(handle_unknown="ignore", sparse_output=False),
			),
		]
	)

	return ColumnTransformer(
		transformers=[
			("numerical", numerical_pipeline, numerical_columns),
			("categorical", categorical_pipeline, categorical_columns),
		]
	)


def save_cleaned_data(
	data: pd.DataFrame, output_path: str | Path = DEFAULT_CLEANED_DATA_PATH
) -> None:
	"""Save a readable cleaned dataframe without encoding or scaling it."""

	output_path = Path(output_path)
	output_path.parent.mkdir(parents=True, exist_ok=True)
	data.to_csv(output_path, index=False)


def create_cleaned_dataset(
	data_path: str | Path = DEFAULT_DATA_PATH,
	output_path: str | Path = DEFAULT_CLEANED_DATA_PATH,
	target_column: str = TARGET_COLUMN,
) -> pd.DataFrame:
	"""Load, clean missing predictor values, save, and return the dataframe."""

	data = load_data(data_path)
	cleaned_data = handle_missing_values(data, target_column)
	save_cleaned_data(cleaned_data, output_path)
	return cleaned_data


if __name__ == "__main__":
	create_cleaned_dataset()
