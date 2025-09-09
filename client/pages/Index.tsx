import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, UploadCloud, Plus, CalendarClock, FileText, UserRound } from "lucide-react";

type RiskLevel = "High" | "Medium" | "Low";

function computeRisk(symptoms: string): RiskLevel {
  const s = symptoms.toLowerCase();
  const high = [
    "chest pain",
    "severe chest",
    "tightness",
    "shortness of breath",
    "breathlessness",
    "fainting",
    "collapse",
    "sweating",
    "left arm",
    "jaw pain",
    "radiating",
  ];
  const medium = [
    "dizziness",
    "lightheaded",
    "palpit",
    "irregular",
    "fatigue",
    "nausea",
    "weakness",
  ];

  const highHit = high.some((k) => s.includes(k)) || s.split(/\s+/).length > 40;
  if (highHit) return "High";
  const medHit = medium.some((k) => s.includes(k)) || s.split(/\s+/).length > 15;
  if (medHit) return "Medium";
  return "Low";
}

export default function Index() {
  const [patientName, setPatientName] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const risk: RiskLevel | null = useMemo(() => (submitted ? computeRisk(symptoms) : null), [submitted, symptoms]);

  const [dragActive, setDragActive] = useState(false);
  const [reportFile, setReportFile] = useState<File | null>(null);
  const [reportReady, setReportReady] = useState(false);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
  }

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const f = files[0];
    setReportFile(f);
    // Mock processing delay
    setReportReady(false);
    window.setTimeout(() => setReportReady(true), 400);
  }

  function onDrop(e: React.DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleFiles(e.dataTransfer.files);
  }

  const riskBadge = risk ? (
    <div className="mt-4 inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold shadow-sm"
      style={{
        backgroundColor:
          risk === "High" ? "hsl(var(--danger))" : risk === "Medium" ? "hsl(var(--warning))" : "hsl(var(--success))",
        color: "hsl(var(--success-foreground))",
      }}
      aria-live="polite"
    >
      {risk === "Low" ? (
        <CheckCircle2 className="h-4 w-4" aria-hidden />
      ) : (
        <AlertTriangle className="h-4 w-4" aria-hidden />
      )}
      {risk} Risk
    </div>
  ) : null;

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section id="home" className="relative isolate overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-emerald-50 via-white to-sky-50" />
        <div className="absolute -top-28 -right-28 -z-10 h-72 w-72 rounded-full bg-emerald-200/40 blur-3xl" />
        <div className="absolute -bottom-28 -left-28 -z-10 h-72 w-72 rounded-full bg-sky-200/40 blur-3xl" />
        <div className="container mx-auto grid grid-cols-1 gap-8 py-16 md:py-24 lg:grid-cols-2">
          <div className="flex flex-col items-start justify-center">
            <h1 className="text-3xl md:text-5xl font-black tracking-tight text-slate-900">
              Welcome to Smart Cardiac Care System
            </h1>
            <p className="mt-4 max-w-2xl text-lg md:text-xl text-slate-600">
              Instant triaging, lab report analysis, and appointment scheduling powered by AI.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <a
                href="#check-in"
                className="inline-flex items-center gap-2 rounded-[20px] bg-primary px-6 py-4 text-lg font-semibold text-white shadow-md transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 hover:brightness-110"
              >
                Start Patient Check-In Now
              </a>
              <a
                href="#help"
                className="inline-flex items-center gap-2 rounded-[20px] bg-white px-6 py-4 text-lg font-semibold text-slate-900 shadow-md ring-1 ring-slate-200 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
              >
                Need Help?
              </a>
            </div>
          </div>
          <div className="flex items-center justify-center">
            <div className="relative aspect-[4/3] w-full max-w-xl overflow-hidden rounded-[20px] bg-white shadow-xl ring-1 ring-slate-200">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(16,185,129,0.15),transparent_40%),radial-gradient(circle_at_80%_30%,rgba(14,165,233,0.18),transparent_45%)]" />
              <div className="relative z-10 p-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center">
                    <UserRound className="h-6 w-6 text-emerald-700" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">AI-Powered</p>
                    <p className="font-semibold text-slate-800">Emergency Cardiac Care</p>
                  </div>
                </div>
                <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
                  <div className="rounded-xl bg-white p-4 shadow ring-1 ring-slate-200">
                    <p className="font-semibold text-slate-800">Instant Triage</p>
                    <p className="mt-1 text-slate-600">Real-time risk assessment</p>
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
                    <p className="font-semibold text-slate-800">Accessibility</p>
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
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900">Patient Check-In</h2>
          <p className="mt-2 text-slate-600">Enter details in simple words. Our AI helps assess urgency instantly.</p>

          <form onSubmit={onSubmit} className="mt-8 space-y-6" aria-labelledby="checkin-heading">
            <div>
              <label htmlFor="name" className="block text-base font-medium text-slate-800">Patient Name</label>
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
            <div>
              <label htmlFor="symptoms" className="block text-base font-medium text-slate-800">Symptoms Description</label>
              <textarea
                id="symptoms"
                name="symptoms"
                placeholder="Describe your symptoms in simple words"
                value={symptoms}
                onChange={(e) => setSymptoms(e.target.value)}
                rows={5}
                className="mt-2 w-full rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-lg shadow-sm placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
            <div>
              <button
                type="submit"
                className="inline-flex items-center rounded-[20px] bg-success px-6 py-4 text-lg font-semibold text-white shadow-md transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success/70"
              >
                Check-In
              </button>
            </div>
          </form>

          {submitted && (
            <div className="mt-6 rounded-[15px] bg-white p-6 shadow ring-1 ring-slate-200" role="status" aria-live="polite">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Triage Result</p>
                  <p className="mt-1 text-xl font-extrabold text-slate-900">
                    {patientName ? `${patientName.split(" ")[0]}, ` : ""}Your current risk level:
                  </p>
                </div>
                {riskBadge}
              </div>
              <p className="mt-4 text-slate-600">
                This is a prototype assessment and does not replace professional medical evaluation.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Lab Report Upload */}
      <section id="reports" className="container py-16 md:py-24">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900">Lab Report Upload</h2>
          <p className="mt-2 text-slate-600">Upload PDF or image lab reports. We’ll show a simple summary.</p>

          <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
            <label
              htmlFor="uploader"
              onDragOver={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={onDrop}
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
                  <p className="truncate text-sm text-slate-500">{reportFile ? reportFile.name : "No file selected"}</p>
                  <p className="text-lg font-semibold text-slate-800">Mock Report Summary</p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                  <p className="text-sm text-slate-500">Cholesterol Level</p>
                  <p className="mt-1 text-xl font-bold text-slate-900">220 mg/dL</p>
                </div>
                <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                  <p className="text-sm text-slate-500">ECG Summary</p>
                  <p className="mt-1 text-xl font-bold text-slate-900">Mild ST Elevation</p>
                </div>
              </div>

              <p className="mt-3 text-sm text-slate-500">
                {reportFile
                  ? reportReady
                    ? "This is a prototype preview based on your upload."
                    : "Processing report..."
                  : "Upload a report to see a preview here."}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Appointment Scheduling */}
      <section id="appointments" className="container py-16 md:py-24">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900">Appointment Scheduling</h2>
          <p className="mt-2 text-slate-600">Quickly confirm your appointment.</p>

          <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="rounded-[15px] bg-white p-6 shadow ring-1 ring-slate-200">
              <div className="flex items-center gap-4">
                <img
                  src="https://i.pravatar.cc/100?img=12"
                  alt="Doctor profile"
                  className="h-16 w-16 rounded-full object-cover ring-2 ring-emerald-200"
                />
                <div>
                  <p className="text-sm text-slate-500">Doctor</p>
                  <p className="text-xl font-extrabold text-slate-900">Dr. Ayesha Kapoor</p>
                </div>
              </div>
              <div className="mt-6 flex items-center gap-3 text-slate-700">
                <CalendarClock className="h-5 w-5 text-emerald-600" />
                <p className="text-lg font-semibold">Today at 2:00 PM</p>
              </div>
              <button
                className="mt-6 inline-flex w-full items-center justify-center rounded-[20px] bg-sky-600 px-6 py-4 text-lg font-semibold text-white shadow-md transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600/70"
              >
                Confirm Appointment
              </button>
            </div>

            <div className="rounded-[15px] bg-white p-6 shadow ring-1 ring-slate-200">
              <p className="text-lg font-semibold text-slate-800">Appointment Details</p>
              <ul className="mt-4 space-y-3 text-slate-600">
                <li><span className="font-semibold text-slate-800">Location:</span> Cardiac Care, Block B</li>
                <li><span className="font-semibold text-slate-800">Visit Type:</span> In-person Consultation</li>
                <li><span className="font-semibold text-slate-800">Preparation:</span> Bring previous reports</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Help / Footer CTA */}
      <section id="help" className="container pb-16 md:pb-24">
        <div className="mx-auto max-w-4xl rounded-[15px] bg-emerald-50 p-8 ring-1 ring-emerald-100">
          <h3 className="text-xl md:text-2xl font-extrabold text-emerald-900">Need assistance?</h3>
          <p className="mt-2 text-emerald-800">Our support is here to help you with accessibility needs and questions.</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <a href="#contact" className="inline-flex items-center rounded-[20px] bg-primary px-5 py-3 text-base font-semibold text-white shadow hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70">Contact Support</a>
            <a href="#privacy" className="inline-flex items-center rounded-[20px] bg-white px-5 py-3 text-base font-semibold text-slate-900 shadow ring-1 ring-slate-200 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70">Privacy Info</a>
          </div>
        </div>
      </section>
    </div>
  );
}
