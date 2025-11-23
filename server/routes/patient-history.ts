import { RequestHandler } from "express";
import { broadcast } from "../lib/broadcaster";

export interface PatientAction {
  action: string; // "medication", "lifestyle_change", "follow_up", "surgery", "monitoring", etc.
  description: string;
  date: string;
  outcome?: string; // "improved", "stable", "worsened"
}

export interface PatientHistoryEntry {
  id: string;
  patientName: string;
  date: string;
  risk: "High" | "Medium" | "Low";
  symptoms: {
    chest_pain?: boolean;
    shortness_breath?: boolean;
    dizziness?: boolean;
    palpitations?: boolean;
    nausea?: boolean;
    fainting?: boolean;
  };
  freeText?: string;
  labReport?: {
    cholesterol?: number;
    ecg?: string;
    fileName?: string;
    analysis?: any;
  };
  assignedDoctor?: {
    id: string;
    name: string;
    specialty: string;
  };
  appointmentTime?: string;
  summary: string;
  actions?: PatientAction[]; // What patient did after this assessment
  nextCheckupRisk?: "High" | "Medium" | "Low"; // Risk level at next checkup (to track outcomes)
  createdAt: string;
}

const patientHistory: PatientHistoryEntry[] = [];

export const handleCreateHistory: RequestHandler = (req, res) => {
  const {
    patientName,
    risk,
    symptoms,
    freeText,
    labReport,
    assignedDoctor,
    appointmentTime,
    summary,
    actions,
  } = req.body ?? {};

  if (!patientName || !risk) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  // If this is a follow-up, update previous entry with next checkup risk
  const history = patientHistory
    .filter((entry) => entry.patientName.toLowerCase() === patientName.toLowerCase())
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (history.length > 0) {
    // Update previous entry with outcome
    const previousEntry = history[0];
    previousEntry.nextCheckupRisk = risk;
  }

  const entry: PatientHistoryEntry = {
    id: `hist-${Date.now()}`,
    patientName,
    date: new Date().toISOString(),
    risk,
    symptoms: symptoms || {},
    freeText: freeText || undefined,
    labReport: labReport || undefined,
    assignedDoctor: assignedDoctor || undefined,
    appointmentTime: appointmentTime || undefined,
    summary: summary || "No summary provided",
    actions: actions || undefined,
    createdAt: new Date().toISOString(),
  };

  patientHistory.unshift(entry);
  
  try {
    broadcast("patientHistory", patientHistory);
  } catch {}

  res.json(entry);
};

export const handleGetHistory: RequestHandler = (req, res) => {
  const patientName = req.query.patient as string | undefined;

  let filtered = patientHistory;

  // Filter by patient name if provided
  if (patientName) {
    filtered = filtered.filter(
      (entry) => entry.patientName.toLowerCase() === patientName.toLowerCase()
    );
  }

  res.json(filtered);
};

export const handleGetHistoryComparison: RequestHandler = (req, res) => {
  const { patientName, currentRisk, currentSymptoms } = req.body ?? {};

  if (!patientName) {
    return res.status(400).json({ error: "Missing patient name" });
  }

  const history = patientHistory
    .filter((entry) => entry.patientName.toLowerCase() === patientName.toLowerCase())
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (history.length === 0) {
    return res.json({
      hasHistory: false,
      message: "No previous checkups found for this patient",
    });
  }

  const previous = history[0];
  const allPrevious = history.slice(0, 5); // Last 5 checkups

  // Analyze what patient did after previous assessments and their outcomes
  const actionPatterns: {
    afterHighRisk: { actions: PatientAction[]; outcomes: string[] };
    afterMediumRisk: { actions: PatientAction[]; outcomes: string[] };
    afterLowRisk: { actions: PatientAction[]; outcomes: string[] };
  } = {
    afterHighRisk: { actions: [], outcomes: [] },
    afterMediumRisk: { actions: [], outcomes: [] },
    afterLowRisk: { actions: [], outcomes: [] },
  };

  // Analyze patterns from history
  for (let i = 0; i < history.length - 1; i++) {
    const entry = history[i];
    const nextEntry = history[i + 1];
    
    if (entry.actions && entry.actions.length > 0) {
      const riskKey = `after${entry.risk.charAt(0) + entry.risk.slice(1).toLowerCase()}Risk` as keyof typeof actionPatterns;
      if (actionPatterns[riskKey]) {
        actionPatterns[riskKey].actions.push(...entry.actions);
        
        // Determine outcome based on next checkup
        if (nextEntry) {
          const riskLevels = { Low: 1, Medium: 2, High: 3 };
          const currentRiskNum = riskLevels[entry.risk];
          const nextRiskNum = riskLevels[nextEntry.risk];
          
          if (nextRiskNum < currentRiskNum) {
            actionPatterns[riskKey].outcomes.push("improved");
          } else if (nextRiskNum > currentRiskNum) {
            actionPatterns[riskKey].outcomes.push("worsened");
          } else {
            actionPatterns[riskKey].outcomes.push("stable");
          }
        }
      }
    }
  }

  // Compare symptoms
  const symptomChanges: Record<string, { previous: boolean; current: boolean; changed: boolean }> = {};
  const allSymptoms = [
    "chest_pain",
    "shortness_breath",
    "dizziness",
    "palpitations",
    "nausea",
    "fainting",
  ];

  allSymptoms.forEach((symptom) => {
    const prev = previous.symptoms[symptom as keyof typeof previous.symptoms] || false;
    const curr = currentSymptoms?.[symptom] || false;
    symptomChanges[symptom] = {
      previous: prev,
      current: curr,
      changed: prev !== curr,
    };
  });

  // Risk level comparison
  const riskLevels = { Low: 1, Medium: 2, High: 3 };
  const riskChange =
    riskLevels[currentRisk as keyof typeof riskLevels] -
    riskLevels[previous.risk as keyof typeof riskLevels];

  // Generate analysis
  const analysis = {
    riskTrend:
      riskChange > 0
        ? "worsening"
        : riskChange < 0
        ? "improving"
        : "stable",
    riskChange,
    newSymptoms: allSymptoms.filter(
      (s) =>
        !previous.symptoms[s as keyof typeof previous.symptoms] &&
        currentSymptoms?.[s]
    ),
    resolvedSymptoms: allSymptoms.filter(
      (s) =>
        previous.symptoms[s as keyof typeof previous.symptoms] &&
        !currentSymptoms?.[s]
    ),
    recurringSymptoms: allSymptoms.filter(
      (s) =>
        previous.symptoms[s as keyof typeof previous.symptoms] &&
        currentSymptoms?.[s]
    ),
    daysSinceLastCheckup: Math.floor(
      (new Date().getTime() - new Date(previous.date).getTime()) /
        (1000 * 60 * 60 * 24)
    ),
    totalCheckups: history.length,
  };

  // Generate conclusions based on previous actions and outcomes
  const conclusions: string[] = [];
  const recommendations: string[] = [];

  // Generate conclusions based on what worked before
  const previousRisk = previous.risk;
  const relevantPattern = actionPatterns[`after${previousRisk.charAt(0) + previousRisk.slice(1).toLowerCase()}Risk` as keyof typeof actionPatterns];
  
  if (relevantPattern && relevantPattern.actions.length > 0) {
    // Count successful outcomes
    const improvedCount = relevantPattern.outcomes.filter(o => o === "improved").length;
    const totalOutcomes = relevantPattern.outcomes.length;
    const successRate = totalOutcomes > 0 ? (improvedCount / totalOutcomes) * 100 : 0;

    // Get most common actions
    const actionCounts: Record<string, number> = {};
    relevantPattern.actions.forEach(action => {
      actionCounts[action.action] = (actionCounts[action.action] || 0) + 1;
    });
    const mostCommonAction = Object.entries(actionCounts).sort((a, b) => b[1] - a[1])[0];

    if (successRate > 50) {
      conclusions.push(
        `✅ After your last ${previousRisk} risk assessment, you followed recommended actions and your condition ${improvedCount > 0 ? 'improved' : 'remained stable'}.`
      );
      if (mostCommonAction) {
        const actionDetails = relevantPattern.actions.find(a => a.action === mostCommonAction[0]);
        if (actionDetails) {
          conclusions.push(
            `📋 Based on your history, ${actionDetails.description} was effective. Consider continuing this approach.`
          );
        }
      }
    } else if (successRate < 30) {
      conclusions.push(
        `⚠️ After your last ${previousRisk} risk assessment, previous actions didn't show significant improvement. A different approach may be needed.`
      );
    } else {
      conclusions.push(
        `📊 After your last ${previousRisk} risk assessment, your condition remained relatively stable. Consider intensifying your current treatment plan.`
      );
    }

    // Specific recommendations based on what patient did before
    if (previous.actions && previous.actions.length > 0) {
      const previousActions = previous.actions.map(a => a.description).join(", ");
      conclusions.push(
        `🔄 Last time you: ${previousActions}. Current assessment shows ${analysis.riskTrend === "improving" ? "improvement" : analysis.riskTrend === "worsening" ? "deterioration" : "stability"}.`
      );
    }
  } else {
    // First time with this risk level
    conclusions.push(
      `📝 This is your first ${currentRisk} risk assessment. We'll track your progress and actions to provide personalized recommendations in future checkups.`
    );
  }

  // Generate recommendations based on risk level and history
  if (currentRisk === "High") {
    if (previousRisk === "High") {
      recommendations.push(
        "🚨 High risk persists. Immediate medical intervention recommended. Follow up with your assigned doctor urgently."
      );
      if (previous.actions && previous.actions.some(a => a.action === "medication")) {
        recommendations.push(
          "💊 Medication adjustment may be needed. Consult with your doctor about reviewing current prescriptions."
        );
      } else {
        recommendations.push(
          "💊 Consider starting medication as prescribed by your doctor."
        );
      }
    } else {
      recommendations.push(
        "⚠️ Risk level has increased to High. Immediate medical attention required."
      );
      recommendations.push(
        "🏥 Schedule urgent follow-up appointment with your assigned specialist."
      );
    }
  } else if (currentRisk === "Medium") {
    if (previousRisk === "High") {
      recommendations.push(
        "✅ Great progress! Risk has decreased from High to Medium. Continue current treatment plan."
      );
      if (previous.actions && previous.actions.length > 0) {
        recommendations.push(
          "📋 Continue the actions that helped improve your condition."
        );
      }
    } else if (previousRisk === "Medium") {
      recommendations.push(
        "📊 Risk remains at Medium level. Maintain current treatment and lifestyle modifications."
      );
      recommendations.push(
        "🔄 Regular monitoring recommended. Schedule follow-up in 2-4 weeks."
      );
    } else {
      recommendations.push(
        "⚠️ Risk has increased from Low to Medium. Early intervention recommended."
      );
    }
  } else if (currentRisk === "Low") {
    if (previousRisk === "High" || previousRisk === "Medium") {
      recommendations.push(
        "🎉 Excellent improvement! Risk has decreased significantly. Your current approach is working well."
      );
      if (previous.actions && previous.actions.length > 0) {
        recommendations.push(
          "✅ Continue maintaining the lifestyle changes and treatments that led to this improvement."
        );
      }
    } else {
      recommendations.push(
        "✅ Risk remains Low. Continue healthy lifestyle and regular monitoring."
      );
    }
    recommendations.push(
      "📅 Schedule routine follow-up in 3-6 months to maintain good health."
    );
  }

  // Add symptom-based recommendations
  if (analysis.newSymptoms.length > 0) {
    recommendations.push(
      `🆕 New symptoms detected: ${analysis.newSymptoms
        .map((s) => s.replace(/_/g, " "))
        .join(", ")}. Monitor closely and report to your doctor.`
    );
  }

  if (analysis.resolvedSymptoms.length > 0) {
    recommendations.push(
      `✅ Symptoms resolved: ${analysis.resolvedSymptoms
        .map((s) => s.replace(/_/g, " "))
        .join(", ")}. Positive progress - keep up the good work!`
    );
  }

  if (analysis.recurringSymptoms.length > 0) {
    recommendations.push(
      `🔄 Recurring symptoms: ${analysis.recurringSymptoms
        .map((s) => s.replace(/_/g, " "))
        .join(", ")}. May require ongoing management or treatment adjustment.`
    );
  }

  if (analysis.daysSinceLastCheckup > 90) {
    recommendations.push(
      `📅 Last checkup was ${analysis.daysSinceLastCheckup} days ago. Consider more frequent monitoring for better health management.`
    );
  }

  // Lab report comparison if available
  let labComparison = null;
  if (previous.labReport && currentSymptoms?.labReport) {
    const prevChol = previous.labReport.cholesterol;
    const currChol = currentSymptoms.labReport?.cholesterol;
    if (prevChol && currChol) {
      const cholChange = currChol - prevChol;
      labComparison = {
        cholesterol: {
          previous: prevChol,
          current: currChol,
          change: cholChange,
          trend: cholChange > 0 ? "increased" : cholChange < 0 ? "decreased" : "stable",
        },
      };
    }
  }

  res.json({
    hasHistory: true,
    previous,
    allPrevious,
    current: {
      risk: currentRisk,
      symptoms: currentSymptoms,
    },
    comparison: {
      symptomChanges,
      riskChange,
      analysis,
      conclusions, // What patient did and outcomes
      recommendations, // What to do next
      labComparison,
      actionPatterns, // Historical patterns
    },
  });
};

