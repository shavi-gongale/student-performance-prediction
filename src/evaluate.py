"""Evaluation helpers for baseline regression models."""

from pathlib import Path

import matplotlib.pyplot as plt
import pandas as pd
import seaborn as sns
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score


def calculate_regression_metrics(
	y_true: pd.Series, y_pred: object
) -> dict[str, float]:
	"""Return the four requested regression metrics."""

	mse = mean_squared_error(y_true, y_pred)
	return {
		"MAE": mean_absolute_error(y_true, y_pred),
		"MSE": mse,
		"RMSE": mse**0.5,
		"R²": r2_score(y_true, y_pred),
	}


def build_predictions_frame(
	y_true: pd.Series, predictions: dict[str, object]
) -> pd.DataFrame:
	"""Create a long dataframe containing actual and predicted values."""

	frames = []
	for model_name, y_pred in predictions.items():
		frame = pd.DataFrame(
			{
				"Actual": y_true.to_numpy(),
				"Predicted": y_pred,
				"Residual": y_true.to_numpy() - y_pred,
				"Model": model_name,
			}
		)
		frames.append(frame)
	return pd.concat(frames, ignore_index=True)


def plot_actual_vs_predicted(
	predictions_frame: pd.DataFrame, output_path: str | Path | None = None
) -> None:
	"""Plot actual versus predicted values for each model."""

	models = predictions_frame["Model"].unique()
	fig, axes = plt.subplots(1, len(models), figsize=(6 * len(models), 5), squeeze=False)
	for axis, model_name in zip(axes[0], models):
		data = predictions_frame[predictions_frame["Model"] == model_name]
		sns.scatterplot(data=data, x="Actual", y="Predicted", ax=axis, alpha=0.45)
		limits = [
			min(data["Actual"].min(), data["Predicted"].min()),
			max(data["Actual"].max(), data["Predicted"].max()),
		]
		axis.plot(limits, limits, linestyle="--", color="black")
		axis.set_title(model_name)
		axis.set_xlim(limits)
		axis.set_ylim(limits)
	plt.tight_layout()
	_save_figure(fig, output_path)


def plot_residuals(
	predictions_frame: pd.DataFrame, output_path: str | Path | None = None
) -> None:
	"""Plot residuals against predicted values for each model."""

	models = predictions_frame["Model"].unique()
	fig, axes = plt.subplots(1, len(models), figsize=(6 * len(models), 5), squeeze=False)
	for axis, model_name in zip(axes[0], models):
		data = predictions_frame[predictions_frame["Model"] == model_name]
		sns.scatterplot(data=data, x="Predicted", y="Residual", ax=axis, alpha=0.45)
		axis.axhline(0, linestyle="--", color="black")
		axis.set_title(model_name)
	axes[0][0].set_ylabel("Residual (Actual - Predicted)")
	plt.tight_layout()
	_save_figure(fig, output_path)


def plot_model_comparison(
	results: pd.DataFrame, output_path: str | Path | None = None
) -> None:
	"""Plot all metrics together for baseline model comparison."""

	long_results = results.melt(
		id_vars="Model", var_name="Metric", value_name="Value"
	)
	fig, axis = plt.subplots(figsize=(10, 6))
	sns.barplot(data=long_results, x="Metric", y="Value", hue="Model", ax=axis)
	axis.set_title("Baseline Regression Model Comparison")
	plt.tight_layout()
	_save_figure(fig, output_path)


def _save_figure(figure: plt.Figure, output_path: str | Path | None) -> None:
	if output_path is not None:
		output_path = Path(output_path)
		output_path.parent.mkdir(parents=True, exist_ok=True)
		figure.savefig(output_path, dpi=150, bbox_inches="tight")

