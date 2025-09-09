import { RequestHandler } from "express";
import { addClient, removeClient, clientCount } from "../lib/broadcaster";
import { v4 as uuidv4 } from "uuid";

export const handleStream: RequestHandler = (req, res) => {
  // Set headers for SSE
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  const id = uuidv4();
  addClient(id, res);

  // Send initial ping
  res.write(`event: connected\ndata: ${JSON.stringify({ clientId: id, clients: clientCount() })}\n\n`);

  req.on("close", () => {
    removeClient(id);
  });
};
