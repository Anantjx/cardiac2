import { RequestHandler } from "express";

const patients: { id: string; name: string; checkedInAt: string }[] = [];

export const handleGetPatients: RequestHandler = (_req, res) => {
  res.json(patients);
};

export const handleCreatePatient: RequestHandler = (req, res) => {
  const { name } = req.body ?? {};
  if (!name) return res.status(400).json({ error: "Missing name" });
  const p = { id: `pat-${Date.now()}`, name, checkedInAt: new Date().toISOString() };
  patients.unshift(p);
  res.json(p);
};
