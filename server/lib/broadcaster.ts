type SSEClient = {
  id: string;
  res: any;
};

const clients = new Map<string, SSEClient>();

export function addClient(id: string, res: any) {
  clients.set(id, { id, res });
}

export function removeClient(id: string) {
  clients.delete(id);
}

export function broadcast(event: string, data: any) {
  const payload = `event: ${event}\n` + `data: ${JSON.stringify(data)}\n\n`;
  for (const [, client] of clients) {
    try {
      client.res.write(payload);
    } catch (e) {
      // ignore
    }
  }
}

export function clientCount() {
  return clients.size;
}
