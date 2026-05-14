// Localhost HTTP server that lets any local tool raise a Codi notice.
//
// Usage from anywhere on the machine:
//   curl -X POST http://127.0.0.1:7777/notify
//   curl -X POST http://127.0.0.1:7777/notify -H 'Content-Type: application/json' \
//     -d '{"title":"Claude needs you","body":"answer in the CLI"}'
//
// We bind to 127.0.0.1 only so other machines on the network cannot reach
// the endpoint. Body fields are optional; the renderer only cares that an
// event happened — the actual title/body is reserved for a future Week 4
// speech-bubble UI.

import * as http from 'http';

export const NOTIFY_PORT = 7777;

export interface NotifyPayload {
	title?: string;
	body?: string;
	source: 'http' | 'claude';
}

export type NotifyListener = (payload: NotifyPayload) => void;

function readBody(req: http.IncomingMessage): Promise<string> {
	return new Promise((resolve) => {
		const chunks: Buffer[] = [];
		req.on('data', (c: Buffer) => chunks.push(c));
		req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
		req.on('error', () => resolve(''));
	});
}

export function startNotifyServer(listener: NotifyListener): () => void {
	const server = http.createServer(async (req, res) => {
		res.setHeader('Access-Control-Allow-Origin', '*');
		if (req.method === 'OPTIONS') {
			res.writeHead(204);
			res.end();
			return;
		}
		if (req.url === '/notify' && (req.method === 'POST' || req.method === 'GET')) {
			let title: string | undefined;
			let body: string | undefined;
			if (req.method === 'POST') {
				const raw = await readBody(req);
				if (raw) {
					try {
						const json = JSON.parse(raw);
						if (typeof json.title === 'string') title = json.title;
						if (typeof json.body === 'string') body = json.body;
					} catch {
						// Plain text body is fine too.
						body = raw;
					}
				}
			}
			listener({ title, body, source: 'http' });
			res.writeHead(200, { 'Content-Type': 'application/json' });
			res.end(JSON.stringify({ ok: true }));
			return;
		}
		res.writeHead(404);
		res.end();
	});

	server.on('error', (err) => {
		console.error('[notify-server] error:', err);
	});

	server.listen(NOTIFY_PORT, '127.0.0.1', () => {
		console.log(`[notify-server] listening on http://127.0.0.1:${NOTIFY_PORT}/notify`);
	});

	return () => {
		server.close();
	};
}
