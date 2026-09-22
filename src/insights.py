"""Deterministic student insight summaries built from existing model outputs."""

from typing import Any


PROFILE_LABELS = {
    "Hours_Studied": "Hours Studied",
    "Attendance": "Attendance",
    "Previous_Scores": "Previous Scores",
    "Tutoring_Sessions": "Tutoring Sessions",
    "Sleep_Hours": "Sleep Hours",
    "Physical_Activity": "Physical Activity",
}


def _factor_items(contributions: list[dict[str, Any]]) -> list[dict[str, Any]]:
    positive = [item for item in contributions if item["contribution"] > 0]
    negative = [item for item in contributions if item["contribution"] < 0]
    positive.sort(key=lambda item: abs(item["contribution"]), reverse=True)
    negative.sort(key=lambda item: abs(item["contribution"]), reverse=True)
    return [
        {"feature": item["feature"], "type": "positive", "contribution": float(item["contribution"])}
        for item in positive[:3]
    ] + [
        {"feature": item["feature"], "type": "negative", "contribution": float(item["contribution"])}
        for item in negative[:3]
    ]


def generate_student_insights(
    prediction: float,
    contributions: list[dict[str, Any]],
    profile: dict[str, Any],
    recommendations: list[dict[str, Any]],
) -> dict[str, object]:
    """Create a deterministic summary from real model and recommendation data."""

    factors = _factor_items(contributions)
    positive = [item for item in factors if item["type"] == "positive"]
    negative = [item for item in factors if item["type"] == "negative"]
    factor_sentences = []
    if positive:
        factor_sentences.append(
            "The largest positive model contribution is "
            f"{positive[0]['feature']} ({positive[0]['contribution']:+.2f})."
        )
    if negative:
        factor_sentences.append(
            "The largest negative model contribution is "
            f"{negative[0]['feature']} ({negative[0]['contribution']:+.2f})."
        )
    recommendation_text = ""
    if recommendations:
        categories = ", ".join(item["category"] for item in recommendations[:2])
        recommendation_text = f" The recommendation system suggests reviewing {categories}."

    profile_values = [
        {"feature": label, "value": profile[name]}
        for name, label in PROFILE_LABELS.items()
        if name in profile
    ]
    summary = (
        f"The model-estimated score is {float(prediction):.2f}. "
        + " ".join(factor_sentences)
        + recommendation_text
    ).strip()
    return {
        "summary": summary,
        "key_factors": factors,
        "focus_areas": [dict(item) for item in recommendations],
        "profile_values": profile_values,
    }
