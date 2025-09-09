import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Example API routes
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get("/api/demo", handleDemo);

  // New prototype endpoints
  const { handleAssess } = await import("./routes/assess");
  const { handleGetDoctors } = await import("./routes/doctors");
  const { handleGetAppointments, handleCreateAppointment } = await import("./routes/appointments");
  const { handleGetPatients, handleCreatePatient } = await import("./routes/patients");

  app.post("/api/assess", handleAssess);
  app.get("/api/doctors", handleGetDoctors);
  app.get("/api/appointments", handleGetAppointments);
  app.post("/api/appointments", handleCreateAppointment);
  app.get("/api/patients", handleGetPatients);
  app.post("/api/patients", handleCreatePatient);

  return app;
}
