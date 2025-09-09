import { RequestHandler } from "express";

const computeRiskLocal = (symptoms: string) => {
  const s = (symptoms || "").toLowerCase();
  const high = [
    "chest pain",
    "shortness of breath",
    "faint",
    "collapse",
    "severe",
  ];
  const medium = ["dizziness", "nausea", "palpitations", "fatigue"];
  if (!s || s.trim().length === 0)
    return { risk: "Low", summary: "No symptoms provided." };
  if (high.some((k) => s.includes(k)))
    return {
      risk: "High",
      summary: "Symptoms indicate high cardiac risk based on keywords.",
    };
  if (medium.some((k) => s.includes(k)))
    return {
      risk: "Medium",
      summary: "Symptoms indicate medium cardiac risk based on keywords.",
    };
  return {
    risk: "Low",
    summary:
      "Symptoms indicate low cardiac risk based on provided description.",
  };
};

export const handleAssess: RequestHandler = async (req, res) => {
  const { patientName, symptoms } = req.body ?? {};
  const key = process.env.OPENROUTER_API_KEY;

  if (!symptoms) {
    res.status(400).json({ error: "Missing symptoms" });
    return;
  }

  // Try calling OpenRouter if a key is available
  if (key) {
    try {
      const prompt = `You are a medical triage assistant. Given the patient name: ${patientName || "(anonymous)"} and symptoms: ${String(
        symptoms,
      )}. Provide a brief JSON object with keys: risk (High|Medium|Low) and summary (one sentence). Respond ONLY with valid JSON.`;

      const resp = await fetch(
        "https://api.openrouter.ai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${key}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
            max_tokens: 300,
          }),
        },
      );

      const data = await resp.json().catch(() => null);

      // Try to extract assistant content
      const content =
        data?.choices?.[0]?.message?.content ||
        data?.choices?.[0]?.text ||
        (typeof data === "string" ? data : null);

      if (content) {
        // Try parsing JSON from content
        const jsonMatch = content.trim().match(/\{[\s\S]*\}/);
        const contentJson = jsonMatch ? jsonMatch[0] : content;
        try {
          const parsed = JSON.parse(contentJson);
          return res.json({
            risk: parsed.risk ?? parsed.Risk ?? "Low",
            summary: parsed.summary ?? parsed.summary ?? content,
          });
        } catch (e) {
          // fallback to keyword detection
        }
      }
    } catch (err) {
      // fallback below
      console.error("OpenRouter error:", err);
    }
  }

  // Fallback: local heuristic
  const result = computeRiskLocal(symptoms);
  res.json(result);
};
