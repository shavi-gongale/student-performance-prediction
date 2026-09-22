"""FastAPI adapter for the existing student-performance backend.

The API validates request shape, then delegates prediction and
recommendations to ``src.predict``. It does not contain a second model or
recommendation implementation, which keeps the future React client aligned
with the existing backend behavior.
"""

import csv
import io
import os
from typing import Annotated, Literal

from fastapi import FastAPI, File, HTTPException, Request, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, Response
from pydantic import BaseModel, ConfigDict, Field, ValidationError

try:
	from .predict import generate_student_prediction, load_model
	from .explain import explain_student_prediction
	from .insights import generate_student_insights
	from .report import build_student_performance_report
	from .analytics import get_analytics, get_figure_path, get_model_performance
except ImportError:
	from predict import generate_student_prediction, load_model
	from explain import explain_student_prediction
	from insights import generate_student_insights
	from report import build_student_performance_report
	from analytics import get_analytics, get_figure_path, get_model_performance


app = FastAPI(
	title="Student Performance Prediction API",
	description="REST access to the existing prediction and recommendation backend.",
	version="1.0.0",
)

# Configure deployed frontend origins as a comma-separated CORS_ORIGINS value.
LOCAL_FRONTEND_ORIGINS = [
	origin.strip()
	for origin in os.getenv("CORS_ORIGINS", "").split(",")
	if origin.strip()
]
if not LOCAL_FRONTEND_ORIGINS:
	LOCAL_FRONTEND_ORIGINS = [
		"http://localhost:5173",
		"http://127.0.0.1:5173",
	]
app.add_middleware(
	CORSMiddleware,
	allow_origins=LOCAL_FRONTEND_ORIGINS,
	allow_credentials=True,
	allow_methods=["*"],
	allow_headers=["*"],
)


class StudentPredictionRequest(BaseModel):
	"""The 19 raw predictor fields expected by the saved sklearn pipeline."""

	model_config = ConfigDict(extra="forbid")

	Hours_Studied: Annotated[int, Field(ge=0)]
	Attendance: Annotated[int, Field(ge=0, le=100)]
	Parental_Involvement: Literal["Low", "Medium", "High"]
	Access_to_Resources: Literal["Low", "Medium", "High"]
	Extracurricular_Activities: Literal["No", "Yes"]
	Sleep_Hours: Annotated[int, Field(ge=0, le=24)]
	Previous_Scores: Annotated[int, Field(ge=0, le=100)]
	Motivation_Level: Literal["Low", "Medium", "High"]
	Internet_Access: Literal["Yes", "No"]
	Tutoring_Sessions: Annotated[int, Field(ge=0)]
	Family_Income: Literal["Low", "Medium", "High"]
	Teacher_Quality: Literal["Low", "Medium", "High"] | None = None
	School_Type: Literal["Public", "Private"]
	Peer_Influence: Literal["Positive", "Negative", "Neutral"]
	Physical_Activity: Annotated[int, Field(ge=0)]
	Learning_Disabilities: Literal["Yes", "No"]
	Parental_Education_Level: Literal["High School", "College", "Postgraduate"] | None = None
	Distance_from_Home: Literal["Near", "Moderate", "Far"] | None = None
	Gender: Literal["Male", "Female"]


class RecommendationResponse(BaseModel):
	category: str
	message: str
	reason: str
	priority: Literal["high", "medium", "low"]


class PredictionResponse(BaseModel):
	predicted_score: float
	recommendations: list[RecommendationResponse]


class ContributionResponse(BaseModel):
	feature: str
	value: float
	coefficient: float
	contribution: float


class ExplanationResponse(BaseModel):
	prediction: float
	intercept: float
	contributions: list[ContributionResponse]


class InsightFactorResponse(BaseModel):
	feature: str
	type: Literal["positive", "negative"]
	contribution: float


class InsightProfileValueResponse(BaseModel):
	feature: str
	value: int | str | None


class InsightsResponse(BaseModel):
	prediction: float
	summary: str
	key_factors: list[InsightFactorResponse]
	focus_areas: list[RecommendationResponse]
	profile_values: list[InsightProfileValueResponse]


class ReportInsightsRequest(BaseModel):
	model_config = ConfigDict(extra="forbid")

	summary: str
	key_factors: list[InsightFactorResponse]
	focus_areas: list[RecommendationResponse]


class ReportRequest(StudentPredictionRequest):
	model_config = ConfigDict(extra="forbid")

	student_name: str
	email: str
	college: str | None = None
	branch: str | None = None
	year: str | int | None = None
	semester: str | int | None = None
	prediction: float
	contributions: list[ContributionResponse]
	recommendations: list[RecommendationResponse]
	insights: ReportInsightsRequest


BATCH_COLUMNS = list(StudentPredictionRequest.model_fields)
BATCH_MAX_BYTES = 5 * 1024 * 1024
BATCH_MAX_ROWS = 1000


@app.exception_handler(ValidationError)
async def validation_exception_handler(
	_request: Request, exception: ValidationError
) -> JSONResponse:
	"""Return a frontend-friendly validation error without a traceback."""

	return JSONResponse(
		status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
		content={"detail": "Invalid student input.", "errors": exception.errors()},
	)


@app.get("/api/health")
def health_check() -> dict[str, bool | str]:
	"""Report whether the existing joblib model can currently be loaded."""

	try:
		load_model()
	except Exception:
		return {"status": "ok", "model_loaded": False}
	return {"status": "ok", "model_loaded": True}


@app.post("/api/predict", response_model=PredictionResponse)
def predict(request: StudentPredictionRequest) -> PredictionResponse:
	"""Predict ``Exam_Score`` and return existing backend recommendations."""

	try:
		result = generate_student_prediction(request.model_dump(exclude_none=False))
	except (TypeError, ValueError) as exception:
		raise HTTPException(
			status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
			detail=str(exception),
		) from exception
	except (FileNotFoundError, OSError) as exception:
		raise HTTPException(
			status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
			detail="The prediction model is unavailable.",
		) from exception
	except Exception as exception:
		raise HTTPException(
			status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
			detail="Prediction failed.",
		) from exception

	return PredictionResponse.model_validate(result)


@app.post("/api/explain", response_model=ExplanationResponse)
def explain(request: StudentPredictionRequest) -> ExplanationResponse:
	"""Return actual transformed-feature contributions for the fitted model."""

	try:
		result = explain_student_prediction(request.model_dump(exclude_none=False))
	except (TypeError, ValueError) as exception:
		raise HTTPException(
			status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
			detail=str(exception),
		) from exception
	except (FileNotFoundError, OSError) as exception:
		raise HTTPException(
			status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
			detail="The prediction model is unavailable.",
		) from exception
	except Exception as exception:
		raise HTTPException(
			status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
			detail="Explanation failed.",
		) from exception

	return ExplanationResponse.model_validate(result)


@app.post("/api/insights", response_model=InsightsResponse)
def insights(request: StudentPredictionRequest) -> InsightsResponse:
	"""Generate deterministic insights from the existing prediction outputs."""

	try:
		profile = request.model_dump(exclude_none=False)
		prediction_result = generate_student_prediction(profile)
		explanation = explain_student_prediction(profile)
		result = generate_student_insights(
			prediction=float(prediction_result["predicted_score"]),
			contributions=explanation["contributions"],
			profile=profile,
			recommendations=prediction_result["recommendations"],
		)
		result["prediction"] = float(prediction_result["predicted_score"])
	except (TypeError, ValueError) as exception:
		raise HTTPException(
			status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
			detail=str(exception),
		) from exception
	except (FileNotFoundError, OSError) as exception:
		raise HTTPException(
			status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
			detail="The prediction model is unavailable.",
		) from exception
	except Exception as exception:
		raise HTTPException(
			status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
			detail="Insight generation failed.",
		) from exception

	return InsightsResponse.model_validate(result)


@app.post("/api/report")
def report(request: ReportRequest) -> Response:
	"""Render a PDF from the current student's supplied result data."""

	try:
		content = build_student_performance_report(request.model_dump(exclude_none=False))
	except (TypeError, ValueError) as exception:
		raise HTTPException(
			status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
			detail=str(exception),
		) from exception
	except Exception as exception:
		raise HTTPException(
			status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
			detail="Report generation failed.",
		) from exception

	return Response(
		content=content,
		media_type="application/pdf",
		headers={"Content-Disposition": 'attachment; filename="student-performance-report.pdf"'},
	)


@app.post("/api/batch-predict")
async def batch_predict(file: UploadFile = File(...)) -> Response:
	"""Predict a bounded CSV batch using the existing single-row pipeline."""

	if not file.filename or not file.filename.lower().endswith(".csv"):
		raise HTTPException(status_code=422, detail="Please upload a .csv file.")
	content = await file.read(BATCH_MAX_BYTES + 1)
	if len(content) > BATCH_MAX_BYTES:
		raise HTTPException(status_code=413, detail="CSV file exceeds the 5 MB limit.")
	if not content.strip():
		raise HTTPException(status_code=422, detail="The CSV file is empty.")

	try:
		text = content.decode("utf-8-sig")
		reader = csv.DictReader(io.StringIO(text))
		columns = reader.fieldnames or []
	except (UnicodeDecodeError, csv.Error) as exception:
		raise HTTPException(status_code=422, detail="The CSV file could not be parsed as UTF-8 CSV.") from exception

	if "Exam_Score" in columns:
		raise HTTPException(status_code=422, detail="Exam_Score must not be included in batch input.")
	missing_columns = [column for column in BATCH_COLUMNS if column not in columns]
	extra_columns = [column for column in columns if column not in BATCH_COLUMNS]
	if missing_columns:
		raise HTTPException(status_code=422, detail="Missing required columns: " + ", ".join(missing_columns))
	if extra_columns:
		raise HTTPException(status_code=422, detail="Unsupported extra columns: " + ", ".join(extra_columns))

	rows = list(reader)
	if not rows:
		raise HTTPException(status_code=422, detail="The CSV file has no data rows.")
	if len(rows) > BATCH_MAX_ROWS:
		raise HTTPException(status_code=422, detail=f"CSV contains too many rows. The limit is {BATCH_MAX_ROWS}.")

	output = io.StringIO(newline="")
	writer = csv.DictWriter(output, fieldnames=BATCH_COLUMNS + ["row_number", "Predicted_Score", "Status", "Recommendations", "Error"])
	writer.writeheader()
	for row_number, raw_row in enumerate(rows, start=2):
		result_row = {column: raw_row.get(column, "") for column in BATCH_COLUMNS}
		result_row["row_number"] = row_number
		try:
			validated = StudentPredictionRequest.model_validate({column: raw_row.get(column) for column in BATCH_COLUMNS})
			prediction_result = generate_student_prediction(validated.model_dump(exclude_none=False))
			result_row.update({
				"Predicted_Score": f"{prediction_result['predicted_score']:.6f}",
				"Status": "success",
				"Recommendations": " | ".join(item["category"] + ": " + item["message"] for item in prediction_result["recommendations"]),
				"Error": "",
			})
		except ValidationError as exception:
			messages = "; ".join(f"{'.'.join(str(part) for part in error['loc'])}: {error['msg']}" for error in exception.errors())
			result_row.update({"Predicted_Score": "", "Status": "error", "Recommendations": "", "Error": messages})
		except (TypeError, ValueError) as exception:
			result_row.update({"Predicted_Score": "", "Status": "error", "Recommendations": "", "Error": str(exception)})
		writer.writerow(result_row)

	return Response(
		content=output.getvalue().encode("utf-8"),
		media_type="text/csv",
		headers={"Content-Disposition": 'attachment; filename="student_batch_predictions.csv"'},
	)


@app.get("/api/analytics")
def analytics() -> dict[str, object]:
	"""Serve read-only statistics calculated from the existing raw CSV."""

	try:
		return get_analytics()
	except (FileNotFoundError, OSError) as exception:
		raise HTTPException(status_code=503, detail="Analytics data is unavailable.") from exception


@app.get("/api/model-performance")
def model_performance() -> dict[str, object]:
	"""Serve the existing model-results CSV and evaluation figure references."""

	try:
		return get_model_performance()
	except (FileNotFoundError, OSError) as exception:
		raise HTTPException(status_code=503, detail="Model evaluation data is unavailable.") from exception


@app.get("/api/figures/{filename}")
def evaluation_figure(filename: str) -> FileResponse:
	"""Serve one of the existing evaluation PNGs without generating new data."""

	try:
		return FileResponse(get_figure_path(filename), media_type="image/png")
	except FileNotFoundError as exception:
		raise HTTPException(status_code=404, detail="Evaluation figure not found.") from exception