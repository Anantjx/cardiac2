import { RequestHandler } from "express";

export const handleTriage: RequestHandler = (req, res) => {
  const { patientName, answers, freeText } = req.body ?? {};
  // answers: array of { id, question, value }
  const map: Record<string, boolean> = {};
  (answers || []).forEach((a: any) => (map[a.id] = !!a.value));

  // Critical questions mapping
  const critical = ["chest_pain", "shortness_breath", "fainting", "sweating", "left_arm_pain"];
  const medium = ["dizziness", "palpitations", "nausea", "fatigue"];

  let risk: "High" | "Medium" | "Low" = "Low";

  if (critical.some((k) => map[k])) risk = "High";
  else if (medium.some((k) => map[k])) risk = "Medium";

  // Also check freeText for some keywords
  if (!critical.some((k) => map[k]) && typeof freeText === "string") {
    const ft = freeText.toLowerCase();
    if (/(chest pain|shortness of breath|sweat|faint)/.test(ft)) risk = "High";
    else if (/(dizziness|palpitations|nausea)/.test(ft)) risk = "Medium";
  }

  // mock lab suggestions based on risk
  let lab: { cholesterol: number; ecg: string };
  if (risk === "High") lab = { cholesterol: 265, ecg: "Mild ST Elevation" };
  else if (risk === "Medium") lab = { cholesterol: 230, ecg: "Borderline ECG changes" };
  else lab = { cholesterol: 185, ecg: "Normal Sinus Rhythm" };

  const summary = risk === "High" ? "Symptoms suggest high cardiac risk. Seek immediate attention." : risk === "Medium" ? "Symptoms indicate moderate risk. Recommend clinical follow-up." : "Low risk based on provided answers.";

  res.json({ risk, summary, lab, patientName: patientName || null });
};
