import { RequestHandler } from "express";
import { doctors } from "./doctors";
import { broadcast } from "../lib/broadcaster";

export const handleAssign: RequestHandler = (req, res) => {
  const { risk, patientName } = req.body ?? {};
  if (!risk) return res.status(400).json({ error: "Missing risk" });

  // Simple mapping: High -> first doc, Medium -> second, Low -> any
  let docIndex = 0;
  if (risk === "Medium") docIndex = Math.min(1, doctors.length - 1);
  if (risk === "Low") docIndex = Math.floor(Math.random() * doctors.length);
  const doc = doctors[docIndex] || doctors[0];

  // Choose earliest available slot and remove it from doctor's slots to simulate booking suggestion
  const slot =
    (doc.slots && doc.slots.shift()) ||
    new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString();

  const payload = { doctor: doc, slot, patientName };

  try {
    broadcast("assign", payload);
    broadcast("doctors", doctors);
  } catch (e) {}

  res.json(payload);
};
