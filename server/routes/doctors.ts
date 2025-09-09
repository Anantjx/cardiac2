import { RequestHandler } from "express";

const doctors = [
  {
    id: "doc-1",
    name: "Dr. Ayesha Kapoor",
    photo: "https://i.pravatar.cc/100?img=12",
    specialty: "Cardiologist",
    slots: [
      new Date(Date.now() + 1000 * 60 * 60).toISOString(),
      new Date(Date.now() + 1000 * 60 * 60 * 3).toISOString(),
    ],
  },
  {
    id: "doc-2",
    name: "Dr. Miguel Santos",
    photo: "https://i.pravatar.cc/100?img=14",
    specialty: "Cardiologist",
    slots: [
      new Date(Date.now() + 1000 * 60 * 60 * 2).toISOString(),
      new Date(Date.now() + 1000 * 60 * 60 * 4).toISOString(),
    ],
  },
];

export const handleGetDoctors: RequestHandler = (_req, res) => {
  res.json(doctors);
};
