"""PDF report rendering for current student prediction data."""

from datetime import datetime, timezone
from io import BytesIO
from typing import Any
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
	KeepTogether,
	Paragraph,
	SimpleDocTemplate,
	Spacer,
	Table,
	TableStyle,
	PageBreak,
)


PROFILE_LABELS = {
	"Hours_Studied": "Hours Studied",
	"Attendance": "Attendance",
	"Previous_Scores": "Previous Scores",
	"Tutoring_Sessions": "Tutoring Sessions",
	"Sleep_Hours": "Sleep Hours",
	"Physical_Activity": "Physical Activity",
	"Parental_Involvement": "Parental Involvement",
	"Access_to_Resources": "Access to Resources",
	"Extracurricular_Activities": "Extracurricular Activities",
	"Motivation_Level": "Motivation Level",
	"Internet_Access": "Internet Access",
	"Family_Income": "Family Income",
	"Teacher_Quality": "Teacher Quality",
	"School_Type": "School Type",
	"Peer_Influence": "Peer Influence",
	"Learning_Disabilities": "Learning Disabilities",
	"Parental_Education_Level": "Parental Education Level",
	"Distance_from_Home": "Distance from Home",
	"Gender": "Gender",
}


def _text(value: Any) -> str:
	return escape(str(value if value not in (None, "") else "Not provided"))


def _section(title: str, styles: dict[str, ParagraphStyle]) -> list[Any]:
	return [Spacer(1, 5 * mm), Paragraph(escape(title), styles["section"]), Spacer(1, 2 * mm)]


def _table(rows: list[list[Any]], widths: list[float]) -> Table:
	table = Table(rows, colWidths=widths, repeatRows=1, hAlign="LEFT")
	table.setStyle(TableStyle([
		("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#e0e7ff")),
		("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#312e81")),
		("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
		("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#cbd5e1")),
		("VALIGN", (0, 0), (-1, -1), "TOP"),
		("LEFTPADDING", (0, 0), (-1, -1), 6),
		("RIGHTPADDING", (0, 0), (-1, -1), 6),
		("TOPPADDING", (0, 0), (-1, -1), 5),
		("BOTTOMPADDING", (0, 0), (-1, -1), 5),
	]))
	return table


def build_student_performance_report(data: dict[str, Any]) -> bytes:
	"""Render a validated report request into a readable PDF byte string."""

	profile = data.get("profile") or {
		key: data.get(key) for key in PROFILE_LABELS if key in data
	}
	buffer = BytesIO()
	document = SimpleDocTemplate(
		buffer,
		pagesize=A4,
		rightMargin=18 * mm,
		leftMargin=18 * mm,
		topMargin=16 * mm,
		bottomMargin=16 * mm,
		title="Student Performance Report",
		author="Student Performance Prediction System",
	)
	base = getSampleStyleSheet()
	styles = {
		"title": ParagraphStyle("ReportTitle", parent=base["Title"], alignment=TA_CENTER, textColor=colors.HexColor("#312e81"), spaceAfter=4),
		"subtitle": ParagraphStyle("ReportSubtitle", parent=base["Normal"], alignment=TA_CENTER, textColor=colors.HexColor("#64748b"), spaceAfter=12),
		"section": ParagraphStyle("ReportSection", parent=base["Heading2"], textColor=colors.HexColor("#312e81"), spaceBefore=6, spaceAfter=4),
		"body": ParagraphStyle("ReportBody", parent=base["BodyText"], leading=14, spaceAfter=5),
		"small": ParagraphStyle("ReportSmall", parent=base["BodyText"], fontSize=8.5, leading=11, textColor=colors.HexColor("#475569")),
		"score": ParagraphStyle("ReportScore", parent=base["Heading1"], alignment=TA_CENTER, textColor=colors.HexColor("#111827"), spaceAfter=8),
	}
	story: list[Any] = [
		Paragraph("Student Performance Report", styles["title"]),
		Paragraph("Student Performance Prediction System", styles["subtitle"]),
	]

	story.extend(_section("Student Information", styles))
	student_rows = [[Paragraph("Field", styles["body"]), Paragraph("Value", styles["body"])]]
	for label, key in [("Student Name", "student_name"), ("Email", "email"), ("College", "college"), ("Branch", "branch"), ("Year", "year"), ("Semester", "semester")]:
		student_rows.append([Paragraph(label, styles["body"]), Paragraph(_text(data.get(key)), styles["body"])])
	story.append(_table(student_rows, [55 * mm, 115 * mm]))

	story.extend(_section("Prediction Summary", styles))
	story.append(Paragraph(f"Model-Estimated Exam Score: {float(data['prediction']):.2f} / 100", styles["score"]))
	story.append(Paragraph("This score is an estimate produced by the trained model for the provided input profile.", styles["body"]))

	contributions = data["contributions"]
	positive = [item for item in contributions if item["contribution"] > 0]
	negative = [item for item in contributions if item["contribution"] < 0]
	for items, title in [(positive, "Positive Model Contributions"), (negative, "Negative Model Contributions")]:
		story.extend(_section(title, styles))
		rows = [[Paragraph("Feature", styles["body"]), Paragraph("Contribution", styles["body"])]]
		rows.extend([[Paragraph(_text(item["feature"]), styles["body"]), Paragraph(f"{float(item['contribution']):+.2f}", styles["body"])] for item in items[:12]])
		if len(rows) == 1:
			rows.append([Paragraph("None returned", styles["body"]), Paragraph("0.00", styles["body"])])
		story.append(_table(rows, [125 * mm, 45 * mm]))

	story.extend(_section("AI Insight Summary", styles))
	insights = data["insights"]
	story.append(Paragraph(_text(insights["summary"]), styles["body"]))
	factor_rows = [[Paragraph("Key Factor", styles["body"]), Paragraph("Type", styles["body"]), Paragraph("Contribution", styles["body"])]]
	factor_rows.extend([[Paragraph(_text(item["feature"]), styles["body"]), Paragraph(_text(item["type"]), styles["body"]), Paragraph(f"{float(item['contribution']):+.2f}", styles["body"])] for item in insights.get("key_factors", [])])
	if len(factor_rows) > 1:
		story.append(_table(factor_rows, [95 * mm, 35 * mm, 40 * mm]))

	story.extend(_section("Recommendations", styles))
	for recommendation in data["recommendations"]:
		story.append(KeepTogether([
			Paragraph(f"{_text(recommendation['category'])} ({_text(recommendation['priority'])})", styles["body"]),
			Paragraph(_text(recommendation["message"]), styles["body"]),
			Paragraph(f"Reason: {_text(recommendation['reason'])}", styles["small"]),
			Spacer(1, 2 * mm),
		]))

	story.extend(_section("Student Profile", styles))
	profile_rows = [[Paragraph("Input", styles["body"]), Paragraph("Value", styles["body"])]]
	for key, value in profile.items():
		profile_rows.append([Paragraph(_text(PROFILE_LABELS.get(key, key)), styles["body"]), Paragraph(_text(value), styles["body"])])
	story.append(_table(profile_rows, [105 * mm, 65 * mm]))

	story.extend(_section("Disclaimer", styles))
	story.append(Paragraph("Predicted scores and model contributions describe the behavior of the trained model for the provided input profile. They do not establish causal relationships or guarantee actual exam outcomes.", styles["small"]))
	story.append(Spacer(1, 4 * mm))
	story.append(Paragraph(f"Report generated: {datetime.now(timezone.utc).astimezone().strftime('%Y-%m-%d %H:%M %Z')}", styles["small"]))
	document.build(story)
	return buffer.getvalue()
