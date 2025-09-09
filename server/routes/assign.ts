import { RequestHandler } from "express";
import { doctors } from "./doctors";

export const handleAssign: RequestHandler = (req, res) => {
  const { risk, patientName } = req.body ?? {};
  if (!risk) return res.status(400).json({ error: "Missing risk" });

  // Simple mapping: High -> first doc, Medium -> second, Low -> any
  let doc = doctors[0];
  if (risk === "Medium" && doctors[1]) doc = doctors[1];
  if (risk === "Low" && doctors.length > 0) doc = doctors[Math.floor(Math.random() * doctors.length)];

  // Choose earliest available slot
  const slot = (doc.slots && doc.slots[0]) || new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString();

  res.json({ doctor: doc, slot });
};
