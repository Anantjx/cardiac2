import { RequestHandler } from "express"; 

type Appointment = {
  id: string;
  doctorId: string;
  patientName: string;
  time: string;
  confirmedAt: string;
};

const appointments: Appointment[] = [];

import { broadcast } from "../lib/broadcaster";

export const handleGetAppointments: RequestHandler = (_req, res) => {
  res.json(appointments);
};

export const handleCreateAppointment: RequestHandler = (req, res) => {
  const { doctorId, patientName, time } = req.body ?? {};
  if (!doctorId || !patientName || !time)
    return res.status(400).json({ error: "Missing fields" });

  const appt: Appointment = {
    id: `appt-${Date.now()}`,
    doctorId,
    patientName,
    time,
    confirmedAt: new Date().toISOString(),
  };
  appointments.push(appt);

  // Broadcast updated appointments
  try {
    broadcast("appointments", appointments);
  } catch (e) {}

  res.json(appt);
};
