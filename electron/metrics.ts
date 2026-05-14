import { powerMonitor } from 'electron';
import si from 'systeminformation';

export interface PetMetrics {
	cpuLoad: number;        // 0..100 (percent)
	systemIdleSec: number;  // seconds since last user input
}

// systeminformation needs a warm-up call; the first sample is bootup-cumulative
// and not meaningful. We discard it and start the cadence afterwards.
async function warmUp(): Promise<void> {
	await si.currentLoad();
}

async function sample(): Promise<PetMetrics> {
	const load = await si.currentLoad();
	return {
		cpuLoad: Math.round(load.currentLoad),
		systemIdleSec: powerMonitor.getSystemIdleTime(),
	};
}

export type MetricsListener = (m: PetMetrics) => void;

export function startMetricsPoller(intervalMs: number, listener: MetricsListener): () => void {
	let stopped = false;
	let timer: NodeJS.Timeout | null = null;

	const tick = async () => {
		if (stopped) return;
		try {
			const m = await sample();
			if (!stopped) listener(m);
		} catch (err) {
			console.error('[metrics] sample failed:', err);
		}
		if (!stopped) {
			timer = setTimeout(tick, intervalMs);
		}
	};

	// Warm-up first so the first emitted sample is meaningful.
	warmUp().finally(() => {
		if (!stopped) timer = setTimeout(tick, 0);
	});

	return () => {
		stopped = true;
		if (timer) clearTimeout(timer);
	};
}
