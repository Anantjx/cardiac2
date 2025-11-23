import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";
import { handleAssess } from "./routes/assess";
import { handleGetDoctors } from "./routes/doctors";
import {
  handleGetAppointments,
  handleCreateAppointment,
} from "./routes/appointments";
import { handleGetPatients, handleCreatePatient } from "./routes/patients";
import { handleAssign } from "./routes/assign";
import { handleStream } from "./routes/stream";
import { handleTriage } from "./routes/triage";
import { handleCreateReport, handleGetReports } from "./routes/reports";
import { handleSupportRequest } from "./routes/support";
import { handleAnalyzeLabReport } from "./routes/analyze-lab-report";
import {
  handleCreateHistory,
  handleGetHistory,
  handleGetHistoryComparison,
} from "./routes/patient-history";

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors());
  // Increase body size limit to handle large file uploads (50MB)
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));

  // Example API routes
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get("/api/demo", handleDemo);

  // New prototype endpoints
  app.post("/api/assess", handleAssess);
  app.get("/api/doctors", handleGetDoctors);
  app.get("/api/appointments", handleGetAppointments);
  app.post("/api/appointments", handleCreateAppointment);
  app.get("/api/patients", handleGetPatients);
  app.post("/api/patients", handleCreatePatient);
  app.post("/api/assign", handleAssign);
  app.post("/api/triage", handleTriage);
  app.get("/api/availability/stream", handleStream);

  // Reports
  app.post("/api/reports", handleCreateReport);
  app.get("/api/reports", handleGetReports);
  app.post("/api/analyze-lab-report", handleAnalyzeLabReport);

  // Support
  app.post("/api/support", handleSupportRequest);

  // Patient History
  app.post("/api/patient-history", handleCreateHistory);
  app.get("/api/patient-history", handleGetHistory);
  app.post("/api/patient-history/compare", handleGetHistoryComparison);

  return app;
}
