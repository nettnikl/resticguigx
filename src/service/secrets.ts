import http from 'node:http';
import crypto from 'node:crypto';

let server: http.Server;
let serverPort = 0;
export function start(port=58118): Promise<void> {
	if (server) return Promise.resolve();
	server = http.createServer(httpListener);
	serverPort = port; 
	return new Promise((res, rej) => {
		server.listen({ port, hostname: '127.0.0.1' }, () => {
			res()
		})
	})
}

const registry = new Map<string, string>();

function httpListener(req: http.IncomingMessage, res: http.ServerResponse) {
	let url = new URL('http://localhost'+req.url);
	let key = url.searchParams.get('secret')
	if (!key) {
		res.statusCode = 400;
		res.end();
		return;
	}
	if (!registry.has(key)) {
		res.statusCode = 404;
		res.end();
		return;
	}
	let secret = registry.get(key)!;
	// registry.delete(key);
	res.write(secret);
	res.statusCode = 200;
	res.end();
}

export function stop() {
	if (!server) return;
	clearAll();
	return new Promise((res, rej) => {
		server.close((err) => {
			if (err) rej(err)
			else res(true)
		})
	})
}

process.on('SIGTERM', stop)
process.on('SIGINT', stop)

export function registerSecret(secret: string) {
	let key = crypto.randomBytes(8).toString('base64url');
	registry.set(key, secret);
	let url = `http://127.0.0.1:${serverPort}/?secret=${key}`
	return {
		url,
		command: `curl "${url}"`,
		unregister() {
			registry.delete(key);
		}
	}
}

export function clearAll() {
	registry.clear();
}
