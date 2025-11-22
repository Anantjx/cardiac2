import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  UploadCloud,
  Plus,
  CalendarClock,
  FileText,
  UserRound,
  Heart,
} from "lucide-react";
import { motion } from "framer-motion";
import { playSound } from "@/lib/sound-effects";
import { jsPDF } from "jspdf";
import { LabReportAnalysis } from "@shared/api";

type RiskLevel = "High" | "Medium" | "Low";

export default function Index() {
  const [patientName, setPatientName] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [triage, setTriage] = useState<{
    risk: RiskLevel;
    summary: string;
  } | null>(null);

  const [dragActive, setDragActive] = useState(false);
  const [reportFile, setReportFile] = useState<File | null>(null);
  const [reportReady, setReportReady] = useState(false);
  const [reportDetails, setReportDetails] = useState<{
    cholesterol?: number;
    ecg?: string;
    analysis?: LabReportAnalysis;
  } | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusStage, setStatusStage] = useState<number>(0);

  const [doctors, setDoctors] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [assigned, setAssigned] = useState<{
    doctor: any;
    slot: string;
    patientName?: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const [reports, setReports] = useState<any[]>([]);

  const [qrData, setQrData] = useState<string | null>(null);
  const [qrInput, setQrInput] = useState("");
  const [checkoutTime, setCheckoutTime] = useState<Date | null>(null);
  const [checkinTime] = useState<Date>(new Date());

  useEffect(() => {
    fetchAll();

    const es = new EventSource("/api/availability/stream");
    es.addEventListener("appointments", (e: any) => {
      try {
        const data = JSON.parse(e.data);
        setAppointments(data);
      } catch {}
    });
    es.addEventListener("patients", (e: any) => {
      try {
        const data = JSON.parse(e.data);
        setPatients(data);
      } catch {}
    });
    es.addEventListener("doctors", (e: any) => {
      try {
        const data = JSON.parse(e.data);
        setDoctors(data);
      } catch {}
    });
    es.addEventListener("assign", (e: any) => {
      try {
        const data = JSON.parse(e.data);
        setAssigned(data);
      } catch {}
    });

    return () => es.close();
  }, []);

  async function fetchAll() {
    try {
      const [dRes, aRes, pRes] = await Promise.all([
        fetch("/api/doctors"),
        fetch("/api/appointments"),
        fetch("/api/patients"),
      ]);
      const [dJson, aJson, pJson] = await Promise.all([
        dRes.json(),
        aRes.json(),
        pRes.json(),
      ]);
      setDoctors(dJson);
      setAppointments(aJson);
      setPatients(pJson);

      try {
        const rRes = await fetch(
          `/api/reports?patient=${encodeURIComponent(patientName || "anonymous")}`,
        );
        const rJson = await rRes.json();
        setReports(rJson);
      } catch (e) {
        // ignore
      }
    } catch (err) {
      console.error(err);
    }
  }

  const [answers, setAnswers] = useState<Record<string, boolean>>({});
  const [voiceActive, setVoiceActive] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [voiceMessage, setVoiceMessage] = useState<string | null>(null);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const voiceAbortRef = (window as any).__voiceAbortRef || { current: false };
  if (!(window as any).__voiceAbortRef)
    (window as any).__voiceAbortRef = voiceAbortRef;

  function toggleAnswer(id: string, value: boolean) {
    setAnswers((s) => ({ ...s, [id]: value }));
  }

  function handleManualAnswer(id: string, value: boolean) {
    setManualMode(true);
    playSound("click");
    if (voiceActive) {
      voiceAbortRef.current = true;
      setVoiceActive(false);
      setVoiceMessage("Manual input selected — stopping voice triage");
    }
    toggleAnswer(id, value);
  }

  async function listenForQuestion(id: string) {
    if (voiceActive) {
      voiceAbortRef.current = true;
      setVoiceActive(false);
    }
    setVoiceMessage("Listening... please say yes or no");
    const transcript = await listenOnce(8000);
    if (!transcript) {
      setVoiceMessage(
        "No response detected. Try tapping the mic again or press Yes/No.",
      );
      return;
    }
    const t = transcript.toLowerCase();
    const yes = /\b(yes|yeah|yep|yup|sure|ya|haan|ha)\b/.test(t);
    const no = /\b(no|not|nope|nahi|nahin|na)\b/.test(t);
    if (yes) handleManualAnswer(id, true);
    else if (no) handleManualAnswer(id, false);
    else setVoiceMessage("Could not interpret. Use buttons.");
  }

  function speak(text: string) {
    return new Promise<void>((resolve) => {
      try {
        const utter = new SpeechSynthesisUtterance(text);
        utter.onend = () => resolve();
        window.speechSynthesis.speak(utter);
      } catch (e) {
        console.error("Speech synth error", e);
        resolve();
      }
    });
  }

  function listenOnce(timeout = 10000) {
    return new Promise<string | null>((resolve) => {
      const SpeechRecognition =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) return resolve(null);

      const recog = new SpeechRecognition();
      recog.lang = "en-US";
      recog.interimResults = false;
      recog.maxAlternatives = 3;
      recog.continuous = false;

      let finished = false;
      let timeoutId: any = null;
      let pollTimer: any = null;

      const cleanup = () => {
        try {
          recog.onresult = null;
          recog.onerror = null;
          recog.onend = null;
          recog.onnomatch = null;
        } catch (e) {
          // ignore
        }
      };

      const clearAll = () => {
        try {
          if (typeof timeoutId === "number") clearTimeout(timeoutId);
        } catch {}
        try {
          if (typeof pollTimer === "number") clearInterval(pollTimer);
        } catch {}
      };

      recog.onresult = (ev: any) => {
        finished = true;
        clearAll();
        try {
          const t = ev.results[0][0].transcript;
          resolve(t);
        } catch (e) {
          resolve(null);
        }
        try {
          recog.stop();
        } catch {}
        cleanup();
      };

      recog.onnomatch = () => {
        finished = true;
        clearAll();
        setVoiceMessage("No recognizable speech detected");
        try {
          recog.stop();
        } catch {}
        cleanup();
        resolve(null);
      };

      recog.onerror = (ev: any) => {
        finished = true;
        clearAll();
        console.error("Recognition error", ev);

        const code =
          ev && (ev.error || ev.code || ev.type || ev.name)
            ? ev.error || ev.code || ev.type || ev.name
            : null;
        let detail: string | null = null;
        if (ev && typeof ev === "string") detail = ev;
        else if (ev && typeof ev.message === "string") detail = ev.message;
        else if (ev && typeof ev.error === "string") detail = ev.error;

        let friendly = "Recognition error";
        if (code === "no-speech")
          friendly = "No speech detected. Please speak again more clearly.";
        else if (code === "audio-capture")
          friendly =
            "Microphone not available. Check your device and permissions.";
        else if (code === "not-allowed" || code === "permission-denied")
          friendly =
            "Microphone permission denied. Please allow microphone access in your browser.";
        else if (code === "network")
          friendly = "Network error during speech recognition.";
        else if (code === "service-not-allowed")
          friendly = "Speech service not allowed.";
        else if (detail) friendly = detail;
        else if (code) friendly = String(code);
        else {
          try {
            friendly = JSON.stringify(ev);
          } catch (e) {
            friendly = String(ev);
          }
        }

        setVoiceMessage(friendly);
        try {
          recog.stop();
        } catch {}
        cleanup();
        resolve(null);
      };

      recog.onend = () => {
        if (!finished) {
          clearAll();
          cleanup();
          resolve(null);
        }
      };

      try {
        voiceAbortRef.current = false;
        recog.start();
      } catch (e) {
        console.error("Recognition start failed", e);
        cleanup();
        resolve(null);
      }

      pollTimer = window.setInterval(() => {
        if (voiceAbortRef.current) {
          try {
            recog.stop();
          } catch {}
          clearAll();
          cleanup();
          resolve(null);
        }
      }, 200);

      timeoutId = window.setTimeout(() => {
        if (!finished) {
          try {
            recog.stop();
          } catch {}
          clearAll();
          cleanup();
          resolve(null);
        }
      }, timeout);
    });
  }

  async function startVoiceTriage() {
    if (manualMode) {
      alert(
        "You have used manual input already. Please clear answers to use voice triage.",
      );
      return;
    }

    const questions = [
      { id: "chest_pain", q: "Are you feeling chest pain?" },
      { id: "shortness_breath", q: "Do you have shortness of breath?" },
      { id: "dizziness", q: "Are you feeling dizzy or lightheaded?" },
      {
        id: "palpitations",
        q: "Are you experiencing palpitations or irregular heartbeat?",
      },
      { id: "nausea", q: "Do you have nausea or vomiting?" },
      { id: "fainting", q: "Have you fainted or felt close to fainting?" },
    ];

    if (
      !(window as any).speechSynthesis &&
      !(window as any).SpeechRecognition &&
      !(window as any).webkitSpeechRecognition
    ) {
      alert(
        "Voice not supported in this browser. Use the on-screen buttons to answer.",
      );
      return;
    }

    playSound("pulse");
    setVoiceActive(true);
    setVoiceMessage("Starting voice triage...");
    voiceAbortRef.current = false;

    for (let i = 0; i < questions.length; i++) {
      if (voiceAbortRef.current) break;
      const item = questions[i];
      setVoiceMessage(`Question ${i + 1} of ${questions.length}: ${item.q}`);

      await speak(item.q);
      if (voiceAbortRef.current) break;

      const transcript = await listenOnce(10000);
      if (voiceAbortRef.current) break;

      if (!transcript) {
        setVoiceMessage(
          "Did not hear a clear response. Please tap Yes or No for this question.",
        );
        await speak(
          "I did not hear a clear response. Please tap yes or no on the screen.",
        );
        continue;
      }

      const t = transcript.toLowerCase();
      const yes = /\b(yes|yeah|yep|yup|sure|ya|haan|ha)\b/.test(t);
      const no = /\b(no|not|nope|nahi|nahin|na)\b/.test(t);
      if (yes) toggleAnswer(item.id, true);
      else if (no) toggleAnswer(item.id, false);
      else {
        setVoiceMessage(
          "Could not interpret response. Please answer using the buttons.",
        );
        await speak(
          "I could not understand your answer. Please use the screen buttons to answer.",
        );
      }
    }

    setVoiceMessage("Voice triage finished");
    setVoiceActive(false);
    playSound("success");
    try {
      await speak("Voice triage finished. You can submit your answers now.");
    } catch {}
    alert("Voice triage finished. You can submit now.");
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    playSound("success");
    setLoading(true);
    setSubmitted(true);
    setAssigned(null);

    try {
      setAiAnalyzing(true);
      setStatusStage(1);
      setStatusMessage("Processing triage...");
      const payload = {
        patientName,
        answers: Object.keys(answers).map((k) => ({
          id: k,
          question: k,
          value: answers[k],
        })),
        freeText: symptoms,
      };

      const res = await fetch("/api/triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      setTriage({ risk: data.risk || "Low", summary: data.summary || "" });

      if (data.lab)
        setReportDetails({
          cholesterol: data.lab.cholesterol,
          ecg: data.lab.ecg,
        });

      if (reportFile && !reportReady) {
        setStatusStage(2);
        setStatusMessage("Analyzing lab report...");
        const waitForReport = (timeout = 8000) =>
          new Promise<void>((resolve) => {
            const start = Date.now();
            const int = setInterval(() => {
              if (reportReady) {
                clearInterval(int);
                resolve();
              } else if (Date.now() - start > timeout) {
                clearInterval(int);
                resolve();
              }
            }, 300);
          });
        await waitForReport(8000);
      }

      setStatusStage(3);
      setStatusMessage("Finalizing results...");
      await new Promise((r) => setTimeout(r, 700));

      if (patientName) {
        await fetch("/api/patients", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: patientName }),
        });
        const p = await fetch("/api/patients");
        setPatients(await p.json());
      }

      setStatusMessage("Results ready");
    } catch (err) {
      console.error(err);
      playSound("error");
      alert("Triage failed");
      setStatusMessage(null);
      setStatusStage(0);
    } finally {
      setLoading(false);
      setAiAnalyzing(false);
    }
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const f = files[0];
    setReportFile(f);
    setReportReady(false);
    setReportDetails(null);

    setStatusStage(2);
    setStatusMessage("Analyzing lab report with AI...");

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64Data = (e.target?.result as string)?.split(",")[1] || "";
        
        try {
          const response = await fetch("/api/analyze-lab-report", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fileData: base64Data,
              fileName: f.name,
              mimeType: f.type,
              patientName: patientName || undefined,
            }),
          });

          if (!response.ok) {
            let errorMessage = "Failed to analyze lab report";
            try {
              const errorData = await response.json();
              if (errorData.details) {
                errorMessage = typeof errorData.details === 'string' ? errorData.details : JSON.stringify(errorData.details);
              } else if (errorData.error) {
                errorMessage = typeof errorData.error === 'string' ? errorData.error : JSON.stringify(errorData.error);
              } else {
                errorMessage = JSON.stringify(errorData);
              }
            } catch (e) {
              const text = await response.text().catch(() => "Unknown error");
              errorMessage = text || "Failed to analyze lab report";
            }
            throw new Error(errorMessage);
          }

          const analysis: LabReportAnalysis = await response.json();

          const cholesterolLevel = analysis.levels.find(
            (l) =>
              l.name.toLowerCase().includes("cholesterol") &&
              !l.name.toLowerCase().includes("hdl") &&
              !l.name.toLowerCase().includes("ldl")
          );
          const ecgFinding = analysis.findings.find((f) =>
            f.toLowerCase().includes("ecg")
          ) || analysis.findings.find((f) =>
            f.toLowerCase().includes("electrocardiogram")
          );

          const cholesterol = cholesterolLevel
            ? parseFloat(cholesterolLevel.value)
            : undefined;
          const ecg = ecgFinding || analysis.summary;

          setReportReady(true);
          setReportDetails({
            cholesterol,
            ecg,
            analysis,
          });

          if (triage) {
            setStatusMessage("Lab analysis complete");
            setStatusStage(3);
            setTimeout(() => setStatusMessage("Results ready"), 600);
          } else {
            setStatusMessage(null);
            setStatusStage(0);
          }

          try {
            await fetch("/api/reports", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                patientName: patientName || "anonymous",
                fileName: f.name,
                cholesterol,
                ecg,
              }),
            });
            const r = await fetch(
              `/api/reports?patient=${encodeURIComponent(patientName || "anonymous")}`,
            );
            const list = await r.json();
            setReports(list);
          } catch (e) {
            console.error("Report save failed", e);
          }
        } catch (error: any) {
          console.error("Error analyzing lab report:", error);
          let errorMsg = "Unknown error";
          if (error?.message) {
            errorMsg = typeof error.message === 'string' ? error.message : JSON.stringify(error.message);
          } else if (error) {
            errorMsg = typeof error === 'string' ? error : JSON.stringify(error);
          }
          playSound("error");
          alert("Failed to analyze lab report: " + errorMsg);
          setStatusMessage(null);
          setStatusStage(0);
          setReportReady(false);
        }
      };

      reader.readAsDataURL(f);
    } catch (error: any) {
      console.error("Error reading file:", error);
      playSound("error");
      alert("Failed to read file: " + (error.message || "Unknown error"));
      setStatusMessage(null);
      setStatusStage(0);
    }
  }

  async function confirmAppointment(doctorId: string, slot: string) {
    if (!patientName) {
      alert("Please enter patient name before confirming an appointment.");
      return;
    }
    try {
      playSound("success");
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doctorId, patientName, time: slot }),
      });
      const appt = await res.json();
      setAppointments((s) => [appt, ...s]);

      await fetch("/api/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: patientName }),
      });
      const p = await fetch("/api/patients");
      setPatients(await p.json());

      alert("Appointment confirmed");
    } catch (err) {
      console.error(err);
      playSound("error");
      alert("Unable to confirm appointment");
    }
  }

  function generateQrForPatient() {
    if (!patientName) {
      alert("Enter patient name to generate QR");
      return;
    }
    playSound("pulse");
    const payload = `patient:${encodeURIComponent(patientName)}:${Date.now()}`;
    setQrData(payload);
  }

  function generatePdfReport() {
    try {
      playSound("success");
      const doc = new jsPDF();
      const lines: string[] = [];
      lines.push(`Patient: ${patientName || "Anonymous"}`);
      lines.push(`Date: ${new Date().toLocaleString()}`);
      lines.push("");
      if (triage) {
        lines.push(`Triage Risk: ${triage.risk}`);
        lines.push(`Triage Summary: ${triage.summary}`);
      } else {
        lines.push("Triage: Not available");
      }
      lines.push("");
      if (reportDetails?.analysis) {
        lines.push("Lab Report Analysis:");
        lines.push(`Summary: ${reportDetails.analysis.summary}`);
        if (reportDetails.analysis.riskLevel) {
          lines.push(`Risk Level: ${reportDetails.analysis.riskLevel}`);
        }
        if (reportDetails.analysis.levels && reportDetails.analysis.levels.length > 0) {
          lines.push("");
          lines.push("Lab Values:");
          reportDetails.analysis.levels.forEach((level) => {
            lines.push(
              `  ${level.name}: ${level.value} ${level.unit || ""} (${level.status})${level.referenceRange ? ` [Ref: ${level.referenceRange}]` : ""}`
            );
          });
        }
        if (reportDetails.analysis.findings && reportDetails.analysis.findings.length > 0) {
          lines.push("");
          lines.push("Key Findings:");
          reportDetails.analysis.findings.forEach((finding) => {
            lines.push(`  • ${finding}`);
          });
        }
        if (reportDetails.analysis.recommendations && reportDetails.analysis.recommendations.length > 0) {
          lines.push("");
          lines.push("Recommendations:");
          reportDetails.analysis.recommendations.forEach((rec) => {
            lines.push(`  • ${rec}`);
          });
        }
      } else if (reportDetails) {
        lines.push(
          `Lab - Cholesterol: ${reportDetails.cholesterol ?? "-"} mg/dL`,
        );
        lines.push(`Lab - ECG: ${reportDetails.ecg ?? "-"}`);
      } else if (reportFile) {
        lines.push(
          `Lab: Report uploaded (${reportFile.name}) - analysis pending`,
        );
      } else {
        lines.push("Lab: No report uploaded");
      }
      lines.push("");
      if (assigned) {
        lines.push(
          `Assigned Doctor: ${assigned.doctor.name} (${assigned.doctor.specialty})`,
        );
        lines.push(`Appointment: ${new Date(assigned.slot).toLocaleString()}`);
      } else {
        lines.push("Appointment: Not assigned");
      }

      let y = 20;
      doc.setFontSize(12);
      lines.forEach((ln) => {
        doc.text(ln, 14, y);
        y += 8;
      });

      const fname = `${(patientName || "patient").replace(/\s+/g, "_")}_report.pdf`;
      doc.save(fname);
    } catch (e) {
      console.error("PDF generation failed", e);
      playSound("error");
      alert("Could not generate PDF report in this browser.");
    }
  }

  async function handleScanOrPaste() {
    if (!qrInput) return alert("Paste QR data or scan result into the field");

    let payload = qrInput.trim();
    try {
      const u = new URL(payload);
      const data = u.searchParams.get("data") || u.searchParams.get("d");
      if (data) payload = decodeURIComponent(data);
    } catch (e) {
      // not a URL, proceed
    }

    const parts = payload.split(":");
    if (parts.length < 2) return alert("Invalid QR payload");
    const prefix = parts[0];
    if (prefix !== "patient" && prefix !== "p")
      return alert("Invalid QR payload");
    const name = decodeURIComponent(parts[1] || "");

    if (!name) return alert("Invalid patient in QR");

    const risk = triage?.risk || "Low";

    try {
      playSound("success");
      const assignRes = await fetch("/api/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ risk, patientName: name }),
      });
      const assignJson = await assignRes.json();
      setAssigned(assignJson);

      await fetch("/api/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      try {
        const apptRes = await fetch("/api/appointments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            doctorId: assignJson.doctor.id,
            patientName: name,
            time: assignJson.slot,
          }),
        });
        const appt = await apptRes.json();
        setAppointments((s) => [appt, ...s]);
        const p = await fetch("/api/patients");
        setPatients(await p.json());

        const r = await fetch(
          `/api/reports?patient=${encodeURIComponent(name)}`,
        );
        setReports(await r.json());

        alert("Assigned and appointment confirmed via QR");
      } catch (e) {
        console.error("Appointment confirm failed", e);
      }
    } catch (e) {
      console.error(e);
      playSound("error");
      alert("Unable to assign from QR");
    }
  }

  const riskBadge = triage ? (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="mt-4 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold shadow-lg"
      style={{
        backgroundColor:
          triage.risk === "High"
            ? "hsl(var(--danger))"
            : triage.risk === "Medium"
              ? "hsl(var(--warning))"
              : "hsl(var(--success))",
        color: "white",
      }}
      aria-live="polite"
    >
      {triage.risk === "Low" ? (
        <CheckCircle2 className="h-5 w-5" aria-hidden />
      ) : (
        <AlertTriangle className="h-5 w-5" aria-hidden />
      )}
      {triage.risk} Risk
    </motion.div>
  ) : null;

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: "easeOut" },
    },
  };

  // Floating grid element component
  const FloatingGridElements = () => (
    <div className="absolute inset-0 overflow-hidden -z-20">
      {/* Animated grid background */}
      <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
        <defs>
          <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
            <path d="M 60 0 L 0 0 0 60" fill="none" stroke="rgba(229, 57, 53, 0.08)" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>

      {/* Floating elements */}
      {[...Array(12)].map((_, i) => (
        <motion.div
          key={`float-${i}`}
          className={`absolute rounded-full ${
            i % 3 === 0
              ? "bg-red-400/10 w-32 h-32"
              : i % 3 === 1
              ? "bg-red-300/5 w-48 h-48"
              : "bg-red-200/5 w-40 h-40"
          }`}
          style={{
            left: `${(i % 4) * 25}%`,
            top: `${Math.floor(i / 4) * 33}%`,
          }}
          animate={{
            y: [0, 30, 0],
            x: [0, 15, -15, 0],
            opacity: [0.3, 0.6, 0.3],
            scale: [0.8, 1.1, 0.8],
          }}
          transition={{
            duration: 8 + i,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.2,
          }}
        />
      ))}

      {/* Floating heart icons */}
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={`heart-${i}`}
          className="absolute"
          style={{
            left: `${15 + (i % 3) * 25}%`,
            top: `${20 + (i % 2) * 40}%`,
          }}
          animate={{
            y: [0, -40, 0],
            opacity: [0, 1, 0],
          }}
          transition={{
            duration: 6 + i,
            repeat: Infinity,
            ease: "easeOut",
            delay: i * 0.3,
          }}
        >
          <Heart className="w-6 h-6 text-red-500/30" />
        </motion.div>
      ))}

      {/* Floating dots */}
      {[...Array(16)].map((_, i) => (
        <motion.div
          key={`dot-${i}`}
          className="absolute w-2 h-2 rounded-full bg-red-500/20"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            scale: [1, 2, 1],
            opacity: [0.2, 0.8, 0.2],
            y: [0, -20, 0],
          }}
          transition={{
            duration: 5 + Math.random() * 3,
            repeat: Infinity,
            delay: i * 0.15,
          }}
        />
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <motion.section
        id="home"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="relative isolate overflow-hidden min-h-screen flex items-center justify-center pt-20 pb-24 md:pb-32"
      >
        {/* Dynamic background */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-red-50 via-white to-slate-50" />
        <FloatingGridElements />

        {/* Main content - centered */}
        <div className="container mx-auto px-4 md:px-6 relative z-10">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="flex flex-col items-center justify-center text-center"
          >
            {/* Badge */}
            <motion.div variants={itemVariants} className="mb-8">
              <motion.span
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="inline-block px-6 py-3 rounded-full bg-gradient-to-r from-red-100 to-red-50 text-red-700 text-sm font-semibold border border-red-200 shadow-lg"
              >
                ✨ Advanced Cardiac Intelligence
              </motion.span>
            </motion.div>

            {/* Main title with gradient and animation */}
            <motion.div variants={itemVariants} className="mb-6 max-w-4xl">
              <motion.h1
                animate={{ y: [0, -5, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tight leading-tight bg-gradient-to-r from-red-600 via-red-500 to-red-700 bg-clip-text text-transparent drop-shadow-lg"
              >
                CardiaX
              </motion.h1>
              <motion.p
                animate={{ opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 3, repeat: Infinity, delay: 0.2 }}
                className="text-2xl md:text-3xl font-bold text-slate-800 mt-4"
              >
                Smart Cardiac Intelligence
              </motion.p>
            </motion.div>

            {/* Subtitle */}
            <motion.p
              variants={itemVariants}
              className="mt-8 max-w-2xl text-lg md:text-xl text-slate-600 leading-relaxed"
            >
              Instant AI-powered triage, lab analysis, and appointment scheduling for emergency cardiac care. 24/7 monitoring and expert assessment in minutes.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              variants={itemVariants}
              className="mt-12 flex flex-col sm:flex-row gap-4 justify-center"
            >
              <motion.a
                href="#check-in"
                onClick={() => playSound("click")}
                whileHover={{ scale: 1.08, boxShadow: "0 20px 40px rgba(220, 38, 38, 0.3)" }}
                whileTap={{ scale: 0.95 }}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 px-10 py-5 text-lg font-bold text-white shadow-xl transition-all duration-200"
              >
                <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 1.5, repeat: Infinity }}>
                  <Heart className="h-6 w-6" />
                </motion.div>
                Start Assessment
              </motion.a>
              <motion.a
                href="#reports"
                onClick={() => playSound("click")}
                whileHover={{ scale: 1.08, boxShadow: "0 20px 40px rgba(15, 23, 42, 0.15)" }}
                whileTap={{ scale: 0.95 }}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white hover:bg-slate-100 px-10 py-5 text-lg font-bold text-red-600 shadow-lg border-2 border-red-200 transition-all duration-200"
              >
                📊 View Reports
              </motion.a>
            </motion.div>

            {/* Floating stats cards */}
            <motion.div
              variants={itemVariants}
              className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-3xl"
            >
              {[
                { icon: "⚡", label: "AI Analysis", value: "100% Accurate", delay: 0 },
                { icon: "⏱️", label: "Response Time", value: "<2 minutes", delay: 0.1 },
                { icon: "🛡️", label: "Available", value: "24/7 Support", delay: 0.2 },
              ].map((stat, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + stat.delay }}
                  whileHover={{ y: -10, boxShadow: "0 20px 40px rgba(220, 38, 38, 0.2)" }}
                  className="p-6 rounded-2xl bg-white/80 backdrop-blur border border-red-100 shadow-lg hover:shadow-2xl transition-all"
                >
                  <div className="text-4xl mb-3">{stat.icon}</div>
                  <p className="text-sm text-slate-600 font-medium">{stat.label}</p>
                  <p className="text-lg font-bold text-red-600 mt-1">{stat.value}</p>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </motion.section>

      {/* Patient Check-In Section */}
      <motion.section
        id="check-in"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        viewport={{ once: true }}
        className="container py-16 md:py-24"
      >
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="mx-auto max-w-3xl"
        >
          <motion.div variants={itemVariants} className="mb-8">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900">
              Patient Assessment
            </h2>
            <p className="mt-3 text-lg text-slate-600">
              Quick evaluation using AI-powered triage. Voice or manual input available.
            </p>
          </motion.div>

          <motion.form
            variants={itemVariants}
            onSubmit={onSubmit}
            className="space-y-8 bg-white rounded-3xl shadow-lg p-8 md:p-12 border border-slate-100"
          >
            <motion.div variants={itemVariants}>
              <label htmlFor="name" className="block text-base font-semibold text-slate-900 mb-3">
                Patient Name
              </label>
              <motion.input
                whileFocus={{ scale: 1.01 }}
                id="name"
                name="name"
                placeholder="Enter full name"
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                required
                className="w-full rounded-2xl border-2 border-slate-200 focus:border-red-500 bg-white px-5 py-4 text-lg placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-200 transition-all"
              />
            </motion.div>

            <motion.div variants={itemVariants}>
              <p className="text-base font-semibold text-slate-900 mb-4">
                Quick Health Assessment
              </p>
              <p className="text-sm text-slate-600 mb-5">
                Please answer the following questions. Use voice mode or manual buttons.
              </p>

              <div className="space-y-3">
                {[
                  { id: "chest_pain", q: "Are you experiencing chest pain?" },
                  { id: "shortness_breath", q: "Do you have shortness of breath?" },
                  { id: "dizziness", q: "Feeling dizzy or lightheaded?" },
                  { id: "palpitations", q: "Any irregular heartbeat or palpitations?" },
                  { id: "nausea", q: "Experiencing nausea or vomiting?" },
                  { id: "fainting", q: "Have you fainted or felt close to fainting?" },
                ].map((item, idx) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    viewport={{ once: true }}
                    className="flex items-center justify-between gap-4 p-4 rounded-xl border border-slate-200 hover:border-red-300 hover:bg-red-50 transition-all"
                  >
                    <label className="text-sm font-medium text-slate-800 flex-1">
                      {item.q}
                    </label>
                    <div className="flex items-center gap-2">
                      <motion.button
                        type="button"
                        onClick={() => handleManualAnswer(item.id, true)}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                          answers[item.id] === true
                            ? "bg-green-600 text-white shadow-md"
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        }`}
                      >
                        Yes
                      </motion.button>
                      <motion.button
                        type="button"
                        onClick={() => handleManualAnswer(item.id, false)}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                          answers[item.id] === false
                            ? "bg-red-600 text-white shadow-md"
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        }`}
                      >
                        No
                      </motion.button>
                      <motion.button
                        type="button"
                        onClick={() => {
                          if (manualMode) {
                            setVoiceMessage(
                              "Voice disabled. Clear answers to re-enable.",
                            );
                            return;
                          }
                          setManualMode(false);
                          listenForQuestion(item.id);
                        }}
                        disabled={manualMode}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className={`h-10 w-10 rounded-full flex items-center justify-center transition-all ${
                          manualMode
                            ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                            : "bg-blue-100 text-blue-600 hover:bg-blue-200"
                        }`}
                        aria-label={`Voice input for ${item.q}`}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          className="h-5 w-5"
                        >
                          <path d="M12 14a3 3 0 003-3V5a3 3 0 10-6 0v6a3 3 0 003 3z" />
                          <path d="M19 11a1 1 0 10-2 0 5 5 0 01-10 0 1 1 0 10-2 0 7 7 0 006 6.92V21a1 1 0 102 0v-3.08A7 7 0 0019 11z" />
                        </svg>
                      </motion.button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <motion.div variants={itemVariants}>
              <label htmlFor="symptoms" className="block text-base font-semibold text-slate-900 mb-3">
                Additional Notes (optional)
              </label>
              <motion.textarea
                whileFocus={{ scale: 1.01 }}
                id="symptoms"
                name="symptoms"
                placeholder="Describe other symptoms or medical context"
                value={symptoms}
                onChange={(e) => setSymptoms(e.target.value)}
                rows={4}
                className="w-full rounded-2xl border-2 border-slate-200 focus:border-red-500 bg-white px-5 py-4 text-lg placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-200 transition-all resize-none"
              />
            </motion.div>

            <motion.div variants={itemVariants} className="flex flex-wrap items-center gap-4">
              <motion.button
                type="submit"
                onClick={() => playSound("success")}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                disabled={loading}
                className="inline-flex items-center rounded-2xl bg-red-600 hover:bg-red-700 disabled:opacity-50 px-8 py-4 text-lg font-semibold text-white shadow-lg transition-all"
              >
                {loading ? "Assessing..." : "Complete Assessment"}
              </motion.button>

              {!voiceActive ? (
                <motion.button
                  type="button"
                  onClick={() => {
                    setManualMode(false);
                    startVoiceTriage();
                  }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="inline-flex items-center gap-2 rounded-2xl bg-blue-100 hover:bg-blue-200 px-6 py-4 text-lg font-semibold text-blue-700 transition-all"
                >
                  🎤 Voice Assessment
                </motion.button>
              ) : (
                <motion.button
                  type="button"
                  onClick={() => {
                    voiceAbortRef.current = true;
                    setVoiceActive(false);
                    setVoiceMessage("Voice assessment stopped");
                    playSound("error");
                  }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="inline-flex items-center gap-2 rounded-2xl bg-red-100 hover:bg-red-200 px-6 py-4 text-lg font-semibold text-red-700 transition-all"
                >
                  Stop Voice
                </motion.button>
              )}
            </motion.div>

            {voiceMessage && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-xl bg-blue-50 border border-blue-200"
              >
                <p className="text-sm text-blue-800">{voiceMessage}</p>
              </motion.div>
            )}

            {statusMessage && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-6 rounded-xl bg-slate-50 border border-slate-200"
              >
                <p className="text-sm font-semibold text-slate-700 mb-3">{statusMessage}</p>
                <div className="w-full h-3 rounded-full bg-slate-200 overflow-hidden">
                  <motion.div
                    initial={{ width: "0%" }}
                    animate={{
                      width: `${statusStage === 0 ? 0 : statusStage === 1 ? 33 : statusStage === 2 ? 66 : 100}%`,
                    }}
                    transition={{ duration: 0.5 }}
                    className="h-full bg-gradient-to-r from-red-500 to-red-600"
                  />
                </div>
              </motion.div>
            )}
          </motion.form>

          {triage && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className={`mt-8 p-8 md:p-12 rounded-3xl shadow-2xl border-2 ${
                triage.risk === "High"
                  ? "bg-gradient-to-br from-red-50 to-red-100 border-red-300"
                  : triage.risk === "Medium"
                  ? "bg-gradient-to-br from-yellow-50 to-orange-100 border-orange-300"
                  : "bg-gradient-to-br from-green-50 to-emerald-100 border-green-300"
              }`}
              role="status"
              aria-live="polite"
            >
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-8">
                <div>
                  <p className={`text-sm font-bold uppercase tracking-wide ${
                    triage.risk === "High"
                      ? "text-red-700"
                      : triage.risk === "Medium"
                      ? "text-orange-700"
                      : "text-green-700"
                  }`}>
                    ⚕️ Assessment Complete
                  </p>
                  <h3 className={`text-3xl font-black mt-2 ${
                    triage.risk === "High"
                      ? "text-red-900"
                      : triage.risk === "Medium"
                      ? "text-orange-900"
                      : "text-green-900"
                  }`}>
                    {patientName ? `${patientName.split(" ")[0]}'s` : "Your"} Risk Level
                  </h3>
                </div>
                {riskBadge}
              </div>

              <p className={`leading-relaxed mb-8 text-lg font-medium ${
                triage.risk === "High"
                  ? "text-red-800"
                  : triage.risk === "Medium"
                  ? "text-orange-800"
                  : "text-green-800"
              }`}>
                {triage.summary}
              </p>

              {/* Assigned Doctor Section */}
              {assigned ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 p-6 rounded-2xl ${
                    triage.risk === "High"
                      ? "bg-red-100/50 border border-red-300"
                      : triage.risk === "Medium"
                      ? "bg-orange-100/50 border border-orange-300"
                      : "bg-green-100/50 border border-green-300"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <img
                      src={assigned.doctor.photo}
                      alt={assigned.doctor.name}
                      className={`h-16 w-16 rounded-full border-4 ${
                        triage.risk === "High"
                          ? "border-red-400"
                          : triage.risk === "Medium"
                          ? "border-orange-400"
                          : "border-green-400"
                      }`}
                    />
                    <div>
                      <p className={`text-xs font-bold uppercase tracking-widest ${
                        triage.risk === "High"
                          ? "text-red-700"
                          : triage.risk === "Medium"
                          ? "text-orange-700"
                          : "text-green-700"
                      }`}>
                        👨‍⚕️ Assigned Doctor
                      </p>
                      <p className="font-bold text-slate-900 text-lg">{assigned.doctor.name}</p>
                      <p className="text-sm text-slate-600">{assigned.doctor.specialty}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-start md:items-end gap-3">
                    <div className="text-sm">
                      <span className="font-bold block text-slate-900">📅 Appointment Time</span>
                      <p className="text-slate-700 mt-1">{new Date(assigned.slot).toLocaleString()}</p>
                    </div>
                    <motion.button
                      onClick={() => {
                        playSound("success");
                        confirmAppointment(assigned.doctor.id, assigned.slot);
                      }}
                      whileHover={{ scale: 1.08 }}
                      whileTap={{ scale: 0.95 }}
                      className={`px-6 py-3 rounded-xl font-bold shadow-md transition-all ${
                        triage.risk === "High"
                          ? "bg-red-600 hover:bg-red-700 text-white"
                          : triage.risk === "Medium"
                          ? "bg-orange-600 hover:bg-orange-700 text-white"
                          : "bg-green-600 hover:bg-green-700 text-white"
                      }`}
                    >
                      ✓ Confirm
                    </motion.button>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  animate={{ scale: [1, 1.02, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className={`text-sm mb-8 p-4 rounded-xl border-2 font-bold ${
                    triage.risk === "High"
                      ? "bg-red-100 border-red-300 text-red-800"
                      : triage.risk === "Medium"
                      ? "bg-orange-100 border-orange-300 text-orange-800"
                      : "bg-green-100 border-green-300 text-green-800"
                  }`}
                >
                  🔄 Assigning best-match doctor... Please wait.
                </motion.div>
              )}

              {/* Check-out Section */}
              {!checkoutTime && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-6 p-6 rounded-2xl bg-white/80 border-2 border-slate-200"
                >
                  <p className="text-sm font-semibold text-slate-700 mb-4">
                    ✅ Check-in successful at {checkinTime.toLocaleTimeString()}
                  </p>
                  <motion.button
                    onClick={() => {
                      playSound("success");
                      setCheckoutTime(new Date());
                    }}
                    whileHover={{ scale: 1.05, boxShadow: "0 10px 25px rgba(0,0,0,0.15)" }}
                    whileTap={{ scale: 0.95 }}
                    className="w-full px-6 py-4 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold text-lg shadow-lg transition-all"
                  >
                    🙏 Thank You & Complete Check-Out
                  </motion.button>
                </motion.div>
              )}

              {/* Checkout Confirmation */}
              {checkoutTime && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={`mb-6 p-8 rounded-2xl border-2 text-center ${
                    triage.risk === "High"
                      ? "bg-red-100 border-red-400"
                      : triage.risk === "Medium"
                      ? "bg-orange-100 border-orange-400"
                      : "bg-green-100 border-green-400"
                  }`}
                >
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 0.6 }}
                    className="text-4xl mb-3"
                  >
                    ��
                  </motion.div>
                  <h4 className={`text-2xl font-black mb-3 ${
                    triage.risk === "High"
                      ? "text-red-900"
                      : triage.risk === "Medium"
                      ? "text-orange-900"
                      : "text-green-900"
                  }`}>
                    Thank You, {patientName || "Patient"}! 🎉
                  </h4>
                  <p className={`font-semibold mb-4 ${
                    triage.risk === "High"
                      ? "text-red-800"
                      : triage.risk === "Medium"
                      ? "text-orange-800"
                      : "text-green-800"
                  }`}>
                    Your assessment has been completed successfully
                  </p>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="bg-white/60 p-3 rounded-lg">
                      <p className="text-slate-600">Check-in Time</p>
                      <p className="font-bold text-slate-900">{checkinTime.toLocaleTimeString()}</p>
                    </div>
                    <div className="bg-white/60 p-3 rounded-lg">
                      <p className="text-slate-600">Check-out Time</p>
                      <p className="font-bold text-slate-900">{checkoutTime.toLocaleTimeString()}</p>
                    </div>
                  </div>
                  <p className={`mt-4 text-xs uppercase font-bold tracking-wide ${
                    triage.risk === "High"
                      ? "text-red-700"
                      : triage.risk === "Medium"
                      ? "text-orange-700"
                      : "text-green-700"
                  }`}>
                    Risk Level: {triage.risk}
                  </p>
                </motion.div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4">
                {(triage || reportReady) && (
                  <motion.button
                    onClick={generatePdfReport}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={`flex-1 inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 font-bold shadow-md transition-all ${
                      triage.risk === "High"
                        ? "bg-red-600 hover:bg-red-700 text-white"
                        : triage.risk === "Medium"
                        ? "bg-orange-600 hover:bg-orange-700 text-white"
                        : "bg-green-600 hover:bg-green-700 text-white"
                    }`}
                  >
                    📄 Download Report
                  </motion.button>
                )}
                {checkoutTime && (
                  <motion.button
                    onClick={() => {
                      playSound("success");
                      window.print();
                    }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-slate-600 hover:bg-slate-700 px-6 py-3 text-white font-bold shadow-md transition-all"
                  >
                    🖨️ Print Summary
                  </motion.button>
                )}
              </div>
            </motion.div>
          )}
        </motion.div>
      </motion.section>

      {/* Lab Report Section */}
      <motion.section
        id="reports"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        viewport={{ once: true }}
        className="container py-16 md:py-24 bg-gradient-to-b from-slate-50 to-white"
      >
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="mx-auto max-w-4xl"
        >
          <motion.div variants={itemVariants} className="mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900">Lab Report Analysis</h2>
            <p className="mt-3 text-lg text-slate-600">
              Upload PDF or image reports. AI-powered analysis in seconds.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <motion.label
              variants={itemVariants}
              htmlFor="uploader"
              onDragOver={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragActive(false);
                handleFiles(e.dataTransfer.files);
              }}
              whileHover={{ scale: 1.02 }}
              className={`flex cursor-pointer flex-col items-center justify-center rounded-3xl border-3 border-dashed p-12 text-center shadow-lg transition-all ${
                dragActive
                  ? "border-red-500 bg-red-50"
                  : "border-slate-300 bg-white hover:border-red-400"
              }`}
            >
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <UploadCloud className="h-16 w-16 text-red-500 mx-auto mb-4" />
              </motion.div>
              <p className="text-xl font-bold text-slate-900">Drag & Drop</p>
              <p className="text-slate-600 mt-2">Upload your lab report (PDF or Image)</p>
              <input
                id="uploader"
                type="file"
                accept=".pdf,image/*"
                className="sr-only"
                onChange={(e) => handleFiles(e.target.files)}
              />
              <motion.button
                type="button"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => document.getElementById("uploader")?.click()}
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 px-6 py-3 text-sm font-semibold text-white shadow-md"
              >
                <Plus className="h-5 w-5" /> Browse Files
              </motion.button>
            </motion.label>

            <motion.div
              variants={itemVariants}
              className="rounded-3xl bg-white p-8 shadow-xl border border-slate-100"
            >
              <div className="flex items-center gap-3 mb-6">
                <FileText className="h-8 w-8 text-red-500" />
                <div>
                  <p className="text-sm text-slate-500">Current File</p>
                  <p className="font-bold text-slate-900">
                    {reportFile ? reportFile.name : "No file selected"}
                  </p>
                </div>
              </div>

              {reportDetails?.analysis ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-4"
                >
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <p className="text-sm font-semibold text-slate-700 mb-2">Summary</p>
                    <p className="text-slate-700">{reportDetails.analysis.summary}</p>
                  </div>

                  {reportDetails.analysis.riskLevel && (
                    <div className="p-4 rounded-xl bg-white border border-slate-200">
                      <p className="text-sm text-slate-600">Risk Level</p>
                      <p className={`text-2xl font-bold mt-1 ${
                        reportDetails.analysis.riskLevel === "Critical" || reportDetails.analysis.riskLevel === "High"
                          ? "text-red-600"
                          : reportDetails.analysis.riskLevel === "Medium"
                          ? "text-yellow-600"
                          : "text-green-600"
                      }`}>
                        {reportDetails.analysis.riskLevel}
                      </p>
                    </div>
                  )}

                  {reportDetails.analysis.levels && reportDetails.analysis.levels.length > 0 && (
                    <div>
                      <p className="text-sm font-semibold text-slate-700 mb-3">Lab Values</p>
                      <div className="space-y-2">
                        {reportDetails.analysis.levels.slice(0, 3).map((level, idx) => (
                          <motion.div
                            key={idx}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            className="p-3 rounded-lg bg-slate-50 border border-slate-200"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-slate-800">{level.name}</span>
                              <span className={`text-xs font-bold rounded-full px-2 py-1 ${
                                level.status === "Critical" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
                              }`}>
                                {level.status}
                              </span>
                            </div>
                            <p className="text-sm text-slate-600 mt-1">{level.value} {level.unit}</p>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              ) : (
                <div className="text-center text-slate-500 py-8">
                  <p>Upload a report to see AI analysis here</p>
                </div>
              )}
            </motion.div>
          </div>
        </motion.div>
      </motion.section>

      {/* Appointments Section */}
      <motion.section
        id="appointments"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        viewport={{ once: true }}
        className="container py-16 md:py-24"
      >
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="mx-auto max-w-5xl"
        >
          <motion.div variants={itemVariants} className="mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900">Schedule & Share Appointments</h2>
            <p className="mt-3 text-lg text-slate-600">
              Assign doctors, view upcoming appointments, and share via QR code with friends.
            </p>
          </motion.div>

          {/* Top: Available Doctors - Assign Button */}
          <motion.div
            variants={itemVariants}
            className="mb-8 p-8 rounded-3xl bg-white shadow-xl border border-slate-100"
          >
            <h3 className="text-2xl font-bold text-slate-900 mb-6">👨‍⚕️ Available Doctors - Assign Now</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {doctors.map((doc, idx) => (
                <motion.div
                  key={doc.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.1 }}
                  viewport={{ once: true }}
                  className="flex flex-col items-center gap-4 p-6 rounded-2xl hover:bg-gradient-to-br hover:from-red-50 hover:to-red-100 transition-all border border-slate-200 hover:border-red-300"
                >
                  <img
                    src={doc.photo}
                    alt={doc.name}
                    className="h-20 w-20 rounded-full border-4 border-red-300 shadow-lg"
                  />
                  <div className="text-center">
                    <p className="font-bold text-slate-900 text-lg">{doc.name}</p>
                    <p className="text-sm text-slate-600">{doc.specialty}</p>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      if (!patientName) {
                        alert("Please enter your name in the Patient Assessment section first");
                        return;
                      }
                      playSound("success");
                      confirmAppointment(doc.id, new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString());
                    }}
                    className="w-full px-6 py-3 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold shadow-lg transition-all"
                  >
                    🎯 Assign Now
                  </motion.button>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Bottom: Upcoming Appointments + QR Share */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Upcoming Appointments */}
            <motion.div
              variants={itemVariants}
              className="p-8 rounded-3xl bg-gradient-to-br from-blue-50 to-indigo-50 shadow-xl border border-blue-200"
            >
              <div className="flex items-center gap-3 mb-6">
                <CalendarClock className="h-8 w-8 text-blue-600" />
                <h3 className="text-2xl font-bold text-slate-900">📅 Upcoming Appointments</h3>
              </div>
              {appointments.length > 0 ? (
                <motion.div
                  className="space-y-4"
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                >
                  {appointments.map((appt, idx) => (
                    <motion.div
                      key={appt.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="p-5 rounded-xl bg-white border-2 border-blue-200 hover:border-blue-400 hover:shadow-lg transition-all"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <p className="font-bold text-slate-900 text-lg">{appt.patientName}</p>
                          <p className="text-sm text-slate-600 mt-1 font-medium">
                            📍 {new Date(appt.time).toLocaleString()}
                          </p>
                          {/* Find and display doctor name */}
                          {doctors.find((d) => d.id === appt.doctorId) && (
                            <p className="text-xs text-blue-600 mt-2">
                              👨‍⚕️ Dr. {doctors.find((d) => d.id === appt.doctorId)?.name}
                            </p>
                          )}
                        </div>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => {
                            playSound("click");
                            setQrData(
                              `appointment:${encodeURIComponent(appt.patientName)}:${appt.doctorId}:${appt.id}:${Date.now()}`
                            );
                          }}
                          className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md transition-all"
                          title="Share this appointment via QR code"
                        >
                          📤 Share
                        </motion.button>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-12"
                >
                  <p className="text-slate-600 text-lg font-medium">📭 No appointments scheduled yet</p>
                  <p className="text-sm text-slate-500 mt-2">Assign a doctor above to create an appointment</p>
                </motion.div>
              )}
            </motion.div>

            {/* QR Code Share */}
            <motion.div
              variants={itemVariants}
              className="p-8 rounded-3xl bg-gradient-to-br from-purple-50 to-pink-50 shadow-xl border border-purple-200"
            >
              <h3 className="text-2xl font-bold text-slate-900 mb-6">🔗 Share with Friends</h3>

              {qrData ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="space-y-4"
                >
                  <p className="text-sm text-slate-700 font-medium">
                    📱 Send this QR code to your friend. They can scan it to see and manage your appointment.
                  </p>

                  {/* QR Code Display */}
                  <div className="flex justify-center p-6 bg-white rounded-2xl border-2 border-purple-300 shadow-lg">
                    <div className="text-center">
                      <div
                        className="inline-block p-4 bg-white rounded-xl border-4 border-purple-400"
                        style={{
                          fontSize: "0.8em",
                        }}
                      >
                        <svg width="240" height="240" viewBox="0 0 100 100">
                          {/* Simple QR-like pattern from data */}
                          {qrData.split("").map((char, i) => (
                            <rect
                              key={i}
                              x={(i % 10) * 10}
                              y={Math.floor(i / 10) * 10}
                              width="10"
                              height="10"
                              fill={
                                char.charCodeAt(0) % 2 === 0 ? "#DC2626" : "#ffffff"
                              }
                              stroke="none"
                            />
                          ))}
                        </svg>
                      </div>
                      <p className="text-xs text-slate-600 mt-3 font-mono">
                        {qrData.substring(0, 30)}...
                      </p>
                    </div>
                  </div>

                  {/* Copy to Clipboard */}
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      playSound("success");
                      navigator.clipboard.writeText(qrData);
                      alert("✓ QR data copied to clipboard!");
                    }}
                    className="w-full px-4 py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold shadow-md transition-all"
                  >
                    📋 Copy QR Data
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      playSound("click");
                      setQrData(null);
                    }}
                    className="w-full px-4 py-3 rounded-xl bg-slate-300 hover:bg-slate-400 text-slate-900 font-bold shadow-md transition-all"
                  >
                    ✕ Close QR
                  </motion.button>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-4"
                >
                  <p className="text-sm text-slate-700 font-medium">
                    👉 Click "Share" on any appointment above to generate a QR code.
                  </p>

                  <div className="p-6 rounded-2xl bg-white/70 border-2 border-purple-300 text-center">
                    <div className="text-6xl mb-3">🤝</div>
                    <p className="text-slate-700 font-semibold">Share Appointments Instantly</p>
                    <p className="text-xs text-slate-600 mt-2">
                      Your friends can scan the QR code to view and confirm the same appointment
                    </p>
                  </div>

                  {/* Paste QR to Access */}
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-slate-700">
                      Or Paste Friend's QR Data:
                    </label>
                    <textarea
                      value={qrInput}
                      onChange={(e) => setQrInput(e.target.value)}
                      placeholder="Paste QR appointment data here..."
                      className="w-full p-3 rounded-lg border-2 border-purple-300 focus:border-purple-600 focus:outline-none text-sm font-mono"
                      rows={3}
                    />
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleScanOrPaste}
                      className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold shadow-md transition-all"
                    >
                      ✓ Load Friend's Appointment
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </motion.div>
          </div>
        </motion.div>
      </motion.section>
    </div>
  );
}
