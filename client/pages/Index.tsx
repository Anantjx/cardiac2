import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  UploadCloud,
  Plus,
  CalendarClock,
  FileText,
  UserRound,
} from "lucide-react";

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
  } | null>(null);

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

  useEffect(() => {
    fetchAll();

    // SSE for live updates
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

      // fetch reports for current patient if any
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
  // ensure ref persists across reloads in dev environment
  if (!(window as any).__voiceAbortRef)
    (window as any).__voiceAbortRef = voiceAbortRef;

  function toggleAnswer(id: string, value: boolean) {
    setAnswers((s) => ({ ...s, [id]: value }));
  }

  function handleManualAnswer(id: string, value: boolean) {
    // user chose manual mode; stop voice if active
    setManualMode(true);
    if (voiceActive) {
      voiceAbortRef.current = true;
      setVoiceActive(false);
      setVoiceMessage("Manual input selected — stopping voice triage");
    }
    toggleAnswer(id, value);
  }

  async function listenForQuestion(id: string) {
    // single-shot listen for a specific question to improve recognition
    // if voice flow is active, abort it
    if (voiceActive) {
      voiceAbortRef.current = true;
      setVoiceActive(false);
    }
    setVoiceMessage('Listening... please say yes or no');
    const transcript = await listenOnce(8000);
    if (!transcript) {
      setVoiceMessage('No response detected. Try tapping the mic again or press Yes/No.');
      return;
    }
    const t = transcript.toLowerCase();
    const yes = /\b(yes|yeah|yep|yup|sure)\b/.test(t);
    const no = /\b(no|not|nope)\b/.test(t);
    if (yes) handleManualAnswer(id, true);
    else if (no) handleManualAnswer(id, false);
    else setVoiceMessage('Could not interpret. Use buttons.');
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
      recog.maxAlternatives = 1;

      let finished = false;

      recog.onresult = (ev: any) => {
        finished = true;
        try {
          const t = ev.results[0][0].transcript;
          resolve(t);
        } catch (e) {
          resolve(null);
        }
        try {
          recog.stop();
        } catch {}
      };

      recog.onerror = (ev: any) => {
        finished = true;
        console.error("Recognition error", ev);
        const errMsg = ev && ev.error ? String(ev.error) : String(ev);
        setVoiceMessage(`Recognition error: ${errMsg}`);
        try {
          recog.stop();
        } catch {}
        resolve(null);
      };

      recog.onend = () => {
        if (!finished) resolve(null);
      };

      try {
        // Reset abort flag
        voiceAbortRef.current = false;
        recog.start();
      } catch (e) {
        console.error("Recognition start failed", e);
        resolve(null);
      }

      // Timeout fallback and abort handling
      const timer = setInterval(() => {
        if (voiceAbortRef.current) {
          try {
            recog.stop();
          } catch {}
          clearInterval(timer);
          resolve(null);
        }
      }, 200);

      setTimeout(() => {
        if (!finished) {
          try {
            recog.stop();
          } catch {}
          clearInterval(timer);
          resolve(null);
        }
      }, timeout);
    });
  }

  async function startVoiceTriage() {
    // If the user already used manual mode, advise them
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
        // do not repeat indefinitely; suggest manual answer
        setVoiceMessage(
          "Did not hear a clear response. Please tap Yes or No for this question.",
        );
        await speak(
          "I did not hear a clear response. Please tap yes or no on the screen.",
        );
        continue;
      }

      const t = transcript.toLowerCase();
      const yes = /\b(yes|yeah|yep|yup|sure)\b/.test(t);
      const no = /\b(no|not|nope)\b/.test(t);
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
    try {
      await speak("Voice triage finished. You can submit your answers now.");
    } catch {}
    alert("Voice triage finished. You can submit now.");
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setSubmitted(true);
    setAssigned(null);

    try {
      // Call server-side triage endpoint with answers
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

      // Set lab details from triage response
      if (data.lab)
        setReportDetails({
          cholesterol: data.lab.cholesterol,
          ecg: data.lab.ecg,
        });

      // Create patient
      if (patientName) {
        await fetch("/api/patients", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: patientName }),
        });
        const p = await fetch("/api/patients");
        setPatients(await p.json());
      }
    } catch (err) {
      console.error(err);
      alert("Triage failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const f = files[0];
    setReportFile(f);
    setReportReady(false);
    setReportDetails(null);

    // Derive a pseudorandom cholesterol value from filename + size
    const name = f.name || "file";
    let sum = 0;
    for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i);
    sum += f.size % 100;
    const cholesterol = 180 + (sum % 120); // between 180 and 299
    const ecg =
      Math.random() > 0.7 ? "Mild ST Elevation" : "Normal Sinus Rhythm";

    // mock processing delay
    setTimeout(async () => {
      setReportReady(true);
      setReportDetails({ cholesterol, ecg });

      // Send report to server for patient history
      try {
        await fetch("/api/reports", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            patientName: patientName || "anonymous",
            fileName: name,
            cholesterol,
            ecg,
          }),
        });
        // refresh reports list for this patient
        const r = await fetch(
          `/api/reports?patient=${encodeURIComponent(patientName || "anonymous")}`,
        );
        const list = await r.json();
        setReports(list);
      } catch (e) {
        console.error("Report save failed", e);
      }
    }, 700);
  }

  async function confirmAppointment(doctorId: string, slot: string) {
    if (!patientName) {
      alert("Please enter patient name before confirming an appointment.");
      return;
    }
    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doctorId, patientName, time: slot }),
      });
      const appt = await res.json();
      setAppointments((s) => [appt, ...s]);

      // also ensure patient saved
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
      alert("Unable to confirm appointment");
    }
  }

  function generateQrForPatient() {
    if (!patientName) {
      alert("Enter patient name to generate QR");
      return;
    }
    // Create a simple payload with patient name and timestamp
    const payload = `patient:${encodeURIComponent(patientName)}:${Date.now()}`;
    setQrData(payload);
  }

  async function handleScanOrPaste() {
    if (!qrInput) return alert("Paste QR data or scan result into the field");

    // Clean input: it might be a full URL, or direct payload
    let payload = qrInput.trim();
    try {
      const u = new URL(payload);
      // try to extract data param
      const data = u.searchParams.get("data") || u.searchParams.get("d");
      if (data) payload = decodeURIComponent(data);
    } catch (e) {
      // not a URL, proceed
    }

    // Expect format patient:<name>:<ts>
    const parts = payload.split(":");
    if (parts.length < 2) return alert("Invalid QR payload");
    const prefix = parts[0];
    if (prefix !== "patient" && prefix !== "p")
      return alert("Invalid QR payload");
    const name = decodeURIComponent(parts[1] || "");

    if (!name) return alert("Invalid patient in QR");

    // Use current triage risk if available, else low
    const risk = triage?.risk || "Low";

    try {
      const assignRes = await fetch("/api/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ risk, patientName: name }),
      });
      const assignJson = await assignRes.json();
      setAssigned(assignJson);

      // also add patient if not present
      await fetch("/api/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      // Auto-confirm appointment for prototype
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

        // Refresh reports for patient
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
      alert("Unable to assign from QR");
    }
  }

  const riskBadge = triage ? (
    <div
      className="mt-4 inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold shadow-sm"
      style={{
        backgroundColor:
          triage.risk === "High"
            ? "hsl(var(--danger))"
            : triage.risk === "Medium"
              ? "hsl(var(--warning))"
              : "hsl(var(--success))",
        color: "hsl(var(--success-foreground))",
      }}
      aria-live="polite"
    >
      {triage.risk === "Low" ? (
        <CheckCircle2 className="h-4 w-4" aria-hidden />
      ) : (
        <AlertTriangle className="h-4 w-4" aria-hidden />
      )}
      {triage.risk} Risk
    </div>
  ) : null;

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section id="home" className="relative isolate overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-emerald-50 via-white to-sky-50" />
        <div className="container mx-auto grid grid-cols-1 gap-8 py-16 md:py-24 lg:grid-cols-2">
          <div className="flex flex-col items-start justify-center">
            <h1 className="text-3xl md:text-5xl font-black tracking-tight text-slate-900">
              Welcome to Smart Cardiac Care System
            </h1>
            <p className="mt-4 max-w-2xl text-lg md:text-xl text-slate-600">
              Instant triaging, lab report analysis, and appointment scheduling
              powered by AI.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <a
                href="#check-in"
                className="inline-flex items-center gap-2 rounded-[20px] bg-primary px-6 py-4 text-lg font-semibold text-white shadow-md transition hover:brightness-110"
              >
                Start Patient Check-In Now
              </a>
              <a
                href="#help"
                className="inline-flex items-center gap-2 rounded-[20px] bg-white px-6 py-4 text-lg font-semibold text-slate-900 shadow ring-1 ring-slate-200 transition hover:bg-slate-50"
              >
                Need Help?
              </a>
            </div>
          </div>
          <div className="flex items-center justify-center">
            <div className="relative aspect-[4/3] w-full max-w-xl overflow-hidden rounded-[20px] bg-white shadow-xl ring-1 ring-slate-200">
              <div className="relative z-10 p-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center">
                    <UserRound className="h-6 w-6 text-emerald-700" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">AI-Powered</p>
                    <p className="font-semibold text-slate-800">
                      Emergency Cardiac Care
                    </p>
                  </div>
                </div>
                <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
                  <div className="rounded-xl bg-white p-4 shadow ring-1 ring-slate-200">
                    <p className="font-semibold text-slate-800">
                      Instant Triage
                    </p>
                    <p className="mt-1 text-slate-600">
                      Real-time risk assessment
                    </p>
                  </div>
                  <div className="rounded-xl bg-white p-4 shadow ring-1 ring-slate-200">
                    <p className="font-semibold text-slate-800">Lab Insights</p>
                    <p className="mt-1 text-slate-600">Smart report analysis</p>
                  </div>
                  <div className="rounded-xl bg-white p-4 shadow ring-1 ring-slate-200">
                    <p className="font-semibold text-slate-800">Appointments</p>
                    <p className="mt-1 text-slate-600">Fast scheduling</p>
                  </div>
                  <div className="rounded-xl bg-white p-4 shadow ring-1 ring-slate-200">
                    <p className="font-semibold text-slate-800">
                      Accessibility
                    </p>
                    <p className="mt-1 text-slate-600">Inclusive for all</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Patient Check-In */}
      <section id="check-in" className="container py-16 md:py-24">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900">
            Patient Check-In
          </h2>
          <p className="mt-2 text-slate-600">
            Enter details in simple words. Our AI helps assess urgency
            instantly.
          </p>

          <form
            onSubmit={onSubmit}
            className="mt-8 space-y-6"
            aria-labelledby="checkin-heading"
          >
            <div>
              <label
                htmlFor="name"
                className="block text-base font-medium text-slate-800"
              >
                Patient Name
              </label>
              <input
                id="name"
                name="name"
                placeholder="Enter full name"
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                required
                className="mt-2 w-full rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-lg shadow-sm placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>

            {/* Triage Q&A */}
            <div>
              <p className="text-base font-medium text-slate-800">
                Quick Triage Questions
              </p>
              <p className="text-sm text-slate-500 mt-1">
                Answer a few yes/no questions to help us triage quickly. You can
                also paste answers from a voice assistant.
              </p>

              <div className="mt-3 grid grid-cols-1 gap-3">
                {[
                  { id: "chest_pain", q: "Are you feeling chest pain?" },
                  {
                    id: "shortness_breath",
                    q: "Do you have shortness of breath?",
                  },
                  {
                    id: "dizziness",
                    q: "Are you feeling dizzy or lightheaded?",
                  },
                  {
                    id: "palpitations",
                    q: "Are you experiencing palpitations or irregular heartbeat?",
                  },
                  { id: "nausea", q: "Do you have nausea or vomiting?" },
                  {
                    id: "fainting",
                    q: "Have you fainted or felt close to fainting?",
                  },
                ].map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 rounded-md border border-slate-100 bg-white px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-800">
                        {item.q}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleManualAnswer(item.id, true)}
                        aria-pressed={!!answers[item.id]}
                        className={`inline-flex items-center gap-2 rounded-md px-3 py-1 text-sm font-semibold ${answers[item.id] === true ? "bg-primary text-white" : "bg-emerald-50 text-emerald-800"}`}
                      >
                        Yes
                      </button>
                      <button
                        type="button"
                        onClick={() => handleManualAnswer(item.id, false)}
                        aria-pressed={answers[item.id] === false}
                        className={`inline-flex items-center gap-2 rounded-md px-3 py-1 text-sm font-semibold ${answers[item.id] === false ? "bg-danger text-white" : "bg-white text-slate-800"}`}
                      >
                        No
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label
                htmlFor="symptoms"
                className="block text-base font-medium text-slate-800"
              >
                Additional Notes (optional)
              </label>
              <textarea
                id="symptoms"
                name="symptoms"
                placeholder="Describe other symptoms or context"
                value={symptoms}
                onChange={(e) => setSymptoms(e.target.value)}
                rows={3}
                className="mt-2 w-full rounded-[12px] border border-slate-200 bg-white px-3 py-2 text-lg shadow-sm placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                className="inline-flex items-center rounded-[20px] bg-success px-6 py-3 text-lg font-semibold text-white shadow-md transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success/70"
                disabled={loading}
              >
                {loading ? "Assessing..." : "Check-In & Triage"}
              </button>

              {!voiceActive ? (
                <button
                  type="button"
                  onClick={() => {
                    setManualMode(false);
                    startVoiceTriage();
                  }}
                  className="inline-flex items-center gap-2 rounded-[20px] bg-white px-5 py-3 text-lg font-semibold text-slate-900 shadow ring-1 ring-slate-200 hover:bg-slate-50"
                >
                  Voice Triage
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    voiceAbortRef.current = true;
                    setVoiceActive(false);
                    setVoiceMessage("Voice triage stopped");
                  }}
                  className="inline-flex items-center gap-2 rounded-[20px] bg-red-600 px-5 py-3 text-lg font-semibold text-white shadow ring-1 ring-red-700 hover:brightness-110"
                >
                  Stop Voice
                </button>
              )}
            </div>
            {voiceMessage && (
              <p className="mt-2 text-sm text-slate-600">{voiceMessage}</p>
            )}
          </form>

          {triage && (
            <div
              className="mt-6 rounded-[15px] bg-white p-6 shadow ring-1 ring-slate-200"
              role="status"
              aria-live="polite"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Triage Result</p>
                  <p className="mt-1 text-xl font-extrabold text-slate-900">
                    {patientName ? `${patientName.split(" ")[0]}, ` : ""}Your
                    current risk level:
                  </p>
                </div>
                {riskBadge}
              </div>
              <p className="mt-4 text-slate-600">{triage.summary}</p>

              {/* Assigned doctor suggestion */}
              {assigned ? (
                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                  <div className="flex items-center gap-4">
                    <img
                      src={assigned.doctor.photo}
                      alt={assigned.doctor.name}
                      className="h-12 w-12 rounded-full"
                    />
                    <div>
                      <p className="text-sm text-slate-500">Suggested</p>
                      <p className="font-semibold text-slate-800">
                        {assigned.doctor.name}
                      </p>
                      <p className="text-sm text-slate-500">
                        {assigned.doctor.specialty}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-3">
                    <p className="text-sm text-slate-600">
                      Suggested slot:{" "}
                      <span className="font-semibold text-slate-800">
                        {new Date(assigned.slot).toLocaleString()}
                      </span>
                    </p>
                    <button
                      onClick={() =>
                        confirmAppointment(assigned.doctor.id, assigned.slot)
                      }
                      className="ml-2 inline-flex items-center gap-2 rounded-[20px] bg-primary px-4 py-2 text-sm font-semibold text-white shadow hover:brightness-110"
                    >
                      Assign & Confirm
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-6 text-sm text-slate-500">
                  Assigning doctor based on triage...
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Lab Report Upload */}
      <section id="reports" className="container py-16 md:py-24">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900">
            Lab Report Upload
          </h2>
          <p className="mt-2 text-slate-600">
            Upload PDF or image lab reports. We’ll show a simple summary.
          </p>

          <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
            <label
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
              className={`flex cursor-pointer flex-col items-center justify-center rounded-[15px] border-2 border-dashed p-8 text-center shadow-sm transition ${dragActive ? "border-primary bg-emerald-50" : "border-slate-300 bg-white"}`}
            >
              <UploadCloud className="h-10 w-10 text-slate-500" aria-hidden />
              <p className="mt-3 font-semibold text-slate-800">Drag & drop</p>
              <p className="text-slate-600">Upload PDF or Image Lab Report</p>
              <input
                id="uploader"
                type="file"
                accept=".pdf,image/*"
                className="sr-only"
                onChange={(e) => handleFiles(e.target.files)}
              />
              <span className="mt-4 inline-flex items-center gap-2 rounded-[20px] bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow ring-1 ring-slate-200 transition hover:bg-slate-50">
                <Plus className="h-4 w-4" /> Choose file
              </span>
            </label>

            <div className="rounded-[15px] bg-white p-6 shadow ring-1 ring-slate-200">
              <div className="flex items-center gap-3">
                <FileText className="h-6 w-6 text-slate-500" />
                <div className="min-w-0">
                  <p className="truncate text-sm text-slate-500">
                    {reportFile ? reportFile.name : "No file selected"}
                  </p>
                  <p className="text-lg font-semibold text-slate-800">
                    Mock Report Summary
                  </p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                  <p className="text-sm text-slate-500">Cholesterol Level</p>
                  <p className="mt-1 text-xl font-bold text-slate-900">
                    {reportDetails ? `${reportDetails.cholesterol} mg/dL` : "—"}
                  </p>
                </div>
                <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                  <p className="text-sm text-slate-500">ECG Summary</p>
                  <p className="mt-1 text-xl font-bold text-slate-900">
                    {reportDetails ? reportDetails.ecg : "—"}
                  </p>
                </div>
              </div>

              <p className="mt-3 text-sm text-slate-500">
                {reportFile
                  ? reportReady
                    ? "This is a prototype preview based on your upload."
                    : "Processing report..."
                  : "Upload a report to see a preview here."}
              </p>

              {reports.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm text-slate-500">
                    Previous Reports for {patientName || "anonymous"}
                  </p>
                  <ul className="mt-2 space-y-2">
                    {reports.map((r: any) => (
                      <li
                        key={r.id}
                        className="flex items-center justify-between rounded-md bg-slate-50 p-3"
                      >
                        <div>
                          <p className="font-semibold text-slate-800">
                            {r.fileName}
                          </p>
                          <p className="text-sm text-slate-600">
                            {r.cholesterol} mg/dL • {r.ecg}
                          </p>
                          <p className="text-xs text-slate-500">
                            {new Date(r.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <div className="text-sm text-slate-500">{r.id}</div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* QR generation & scan */}
              <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <p className="text-sm text-slate-500">Generate Check-In QR</p>
                  <div className="mt-2 flex items-center gap-3">
                    <button
                      onClick={generateQrForPatient}
                      className="inline-flex items-center gap-2 rounded-[12px] bg-primary px-3 py-2 text-sm font-semibold text-white shadow hover:brightness-110"
                    >
                      Generate QR
                    </button>
                    {qrData && (
                      <div className="flex items-center gap-3">
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrData)}`}
                          alt="QR code"
                          className="h-20 w-20 rounded-md bg-white p-1 shadow"
                        />
                        <div>
                          <p className="text-sm text-slate-700">Patient:</p>
                          <p className="font-semibold text-slate-900">
                            {patientName}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <p className="text-sm text-slate-500">Scan QR / Paste code</p>
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      value={qrInput}
                      onChange={(e) => setQrInput(e.target.value)}
                      placeholder="Paste QR payload here"
                      className="w-full rounded-md border border-slate-200 px-3 py-2"
                    />
                    <button
                      onClick={handleScanOrPaste}
                      className="inline-flex items-center gap-2 rounded-[12px] bg-emerald-600 px-3 py-2 text-sm font-semibold text-white shadow"
                    >
                      Assign
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    Simulate scanning by pasting the QR payload or use the
                    generated QR for demo.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Appointment Scheduling */}
      <section id="appointments" className="container py-16 md:py-24">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900">
            Appointment Scheduling
          </h2>
          <p className="mt-2 text-slate-600">
            View available doctors and confirm an appointment in real time.
          </p>

          <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="rounded-[15px] bg-white p-6 shadow ring-1 ring-slate-200">
              <p className="text-lg font-semibold text-slate-800">
                Available Doctors
              </p>
              <div className="mt-4 space-y-4">
                {doctors.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={doc.photo}
                        alt={`Photo of ${doc.name}`}
                        className="h-12 w-12 rounded-full"
                      />
                      <div>
                        <p className="text-sm text-slate-500">
                          {doc.specialty}
                        </p>
                        <p className="font-semibold text-slate-800">
                          {doc.name}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {doc.slots?.map((slot: string) => (
                        <button
                          key={slot}
                          onClick={() => confirmAppointment(doc.id, slot)}
                          className="ml-2 inline-flex items-center gap-2 rounded-[20px] bg-primary px-3 py-2 text-sm font-semibold text-white shadow hover:brightness-110"
                        >
                          Confirm{" "}
                          {new Date(slot).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[15px] bg-white p-6 shadow ring-1 ring-slate-200">
              <p className="text-lg font-semibold text-slate-800">
                Upcoming Appointments
              </p>
              <ul className="mt-4 space-y-3">
                {appointments.length === 0 && (
                  <li className="text-sm text-slate-500">
                    No appointments yet
                  </li>
                )}
                {appointments.map((a) => (
                  <li key={a.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-slate-800">
                        {a.patientName}
                      </p>
                      <p className="text-sm text-slate-500">
                        {new Date(a.time).toLocaleString()}
                      </p>
                    </div>
                    <p className="text-sm text-slate-500">{a.doctorId}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Patients list */}
      <section id="patients" className="container py-8">
        <div className="mx-auto max-w-4xl">
          <h3 className="text-xl font-semibold">Checked-in Patients</h3>
          <div className="mt-4 grid grid-cols-1 gap-3">
            {patients.length === 0 && (
              <p className="text-sm text-slate-500">
                No patients checked in yet.
              </p>
            )}
            {patients.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-[12px] bg-white p-3 shadow ring-1 ring-slate-200"
              >
                <div>
                  <p className="font-semibold text-slate-800">{p.name}</p>
                  <p className="text-sm text-slate-500">
                    Checked in {new Date(p.checkedInAt).toLocaleString()}
                  </p>
                </div>
                <div className="text-sm text-slate-500">{p.id}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Help / Footer CTA */}
      <section id="help" className="container pb-16 md:pb-24">
        <div className="mx-auto max-w-4xl rounded-[15px] bg-emerald-50 p-8 ring-1 ring-emerald-100">
          <div className="md:flex md:items-start md:justify-between">
            <div>
              <h3 className="text-xl md:text-2xl font-extrabold text-emerald-900">
                Need assistance?
              </h3>
              <p className="mt-2 text-emerald-800">
                Our support is here to help you with accessibility needs and
                questions.
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href="#contact"
              className="inline-flex items-center rounded-[20px] bg-primary px-5 py-3 text-base font-semibold text-white shadow hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
            >
              Contact Support
            </a>
            <a
              href="#privacy"
              className="inline-flex items-center rounded-[20px] bg-white px-5 py-3 text-base font-semibold text-slate-900 shadow ring-1 ring-slate-200 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
            >
              Privacy Info
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
