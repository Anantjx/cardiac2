import { RequestHandler } from "express";
import { broadcast } from "../lib/broadcaster";

type Report = { id: string; patientName: string; fileName: string; cholesterol?: number; ecg?: string; createdAt: string };

const reports: Report[] = [];

export const handleCreateReport: RequestHandler = (req, res) => {
  const { patientName, fileName, cholesterol, ecg } = req.body ?? {};
  if (!patientName || !fileName) return res.status(400).json({ error: "Missing fields" });
  const r: Report = { id: `rep-${Date.now()}`, patientName, fileName, cholesterol, ecg, createdAt: new Date().toISOString() };
  reports.unshift(r);
  try { broadcast("reports", reports); } catch {}
  res.json(r);
};

export const handleGetReports: RequestHandler = (req, res) => {
  const patientName = String(req.query.patient || "");
  if (patientName) {
    const filtered = reports.filter((r) => r.patientName === patientName);
    res.json(filtered);
    return;
  }
  res.json(reports);
};
