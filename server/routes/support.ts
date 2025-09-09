import { RequestHandler } from "express";
import { broadcast } from "../lib/broadcaster";

export const handleSupportRequest: RequestHandler = (req, res) => {
  const { patientName, message } = req.body ?? {};
  if (!patientName) return res.status(400).json({ error: "Missing patientName" });
  const payload = { id: `sup-${Date.now()}`, patientName, message: message || 'Needs assistance', time: new Date().toISOString() };
  try { broadcast('support', payload); } catch (e) {}
  res.json(payload);
};
