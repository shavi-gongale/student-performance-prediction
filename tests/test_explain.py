import pytest
from fastapi.testclient import TestClient

from src.api import app
from src.explain import explain_student_prediction
from src.predict import predict_exam_score


VALID_PROFILE = {
    "Hours_Studied": 8,
    "Attendance": 92,
    "Parental_Involvement": "High",
    "Access_to_Resources": "High",
    "Extracurricular_Activities": "Yes",
    "Sleep_Hours": 6,
    "Previous_Scores": 80,
    "Motivation_Level": "High",
    "Internet_Access": "Yes",
    "Tutoring_Sessions": 3,
    "Family_Income": "High",
    "Teacher_Quality": "High",
    "School_Type": "Public",
    "Peer_Influence": "Positive",
    "Physical_Activity": 5,
    "Learning_Disabilities": "No",
    "Parental_Education_Level": "College",
    "Distance_from_Home": "Near",
    "Gender": "Male",
}


def test_explanation_reconstructs_prediction_and_matches_predict_adapter():
    explanation = explain_student_prediction(VALID_PROFILE)
    prediction = predict_exam_score(VALID_PROFILE)
    reconstructed = explanation["intercept"] + sum(item["contribution"] for item in explanation["contributions"])

    assert explanation["prediction"] == pytest.approx(prediction)
    assert reconstructed == pytest.approx(explanation["prediction"])
    assert any(item["contribution"] != 0 for item in explanation["contributions"])
    assert any(item["contribution"] < 0 for item in explanation["contributions"])
    assert all(
        abs(explanation["contributions"][index]["contribution"])
        >= abs(explanation["contributions"][index + 1]["contribution"])
        for index in range(len(explanation["contributions"]) - 1)
    )


def test_explain_endpoint_validates_and_returns_contributions():
    client = TestClient(app)
    response = client.post("/api/explain", json=VALID_PROFILE)

    assert response.status_code == 200
    body = response.json()
    assert body["prediction"] == pytest.approx(predict_exam_score(VALID_PROFILE))
    assert body["contributions"]

    missing = dict(VALID_PROFILE)
    missing.pop("Attendance")
    assert client.post("/api/explain", json=missing).status_code == 422

    invalid = dict(VALID_PROFILE, Attendance=101)
    assert client.post("/api/explain", json=invalid).status_code == 422

    with_target = dict(VALID_PROFILE, Exam_Score=80)
    assert client.post("/api/explain", json=with_target).status_code == 422
