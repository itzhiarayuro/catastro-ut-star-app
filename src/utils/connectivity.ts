/**
 * connectivity.ts — utilidades de detección y espera de conectividad real.
 *
 * navigator.onLine miente: puede decir "online" con wifi sin internet.
 * Este módulo hace un ping real a un endpoint liviano antes de confirmar
 * que la red está disponible.
 */

const PING_URL = "https://www.gstatic.com/generate_204"; // 204 sin body, Google CDN
const PING_TIMEOUT_MS = 4_000;
const PING_INTERVALS_MS = [2000, 4000, 8000, 15000, 30000]; // backoff hasta 30 s entre pings

export type ConnectivityCallback = (status: "lost" | "waiting" | "restored", attempt?: number) => void;

/** Ping real — devuelve true si hay internet de verdad. Nunca lanza. */
export async function pingConnectivity(): Promise<boolean> {
    try {
        await fetch(PING_URL, {
            method: "HEAD",
            mode: "no-cors",
            cache: "no-store",
            signal: AbortSignal.timeout(PING_TIMEOUT_MS),
        });
        return true;
    } catch {
        return false;
    }
}

/**
 * Espera hasta que haya conectividad real.
 * Notifica via `onStatus` cuando pierde, mientras espera y cuando restaura.
 * Si `abortSignal` se dispara, lanza un error para que el llamador pueda abortar.
 */
export async function waitForConnectivity(
    onStatus?: ConnectivityCallback,
    abortSignal?: AbortSignal
): Promise<void> {
    // Fast path: ya tiene conexión
    if (navigator.onLine && (await pingConnectivity())) return;

    onStatus?.("lost");

    let attempt = 0;

    while (true) {
        if (abortSignal?.aborted) {
            throw new Error("Espera de conectividad cancelada por el usuario");
        }

        const interval = PING_INTERVALS_MS[Math.min(attempt, PING_INTERVALS_MS.length - 1)];
        onStatus?.("waiting", attempt + 1);

        // Esperar el intervalo O hasta que el browser diga "online"
        await Promise.race([
            new Promise<void>((resolve) => setTimeout(resolve, interval)),
            new Promise<void>((resolve) => {
                const handler = () => { window.removeEventListener("online", handler); resolve(); };
                window.addEventListener("online", handler);
            }),
        ]);

        if (abortSignal?.aborted) {
            throw new Error("Espera de conectividad cancelada por el usuario");
        }

        const ok = await pingConnectivity();
        if (ok) {
            onStatus?.("restored");
            return;
        }
        attempt++;
    }
}

/**
 * Wrapper que ejecuta `fn` con reintentos automáticos ante pérdida de red.
 * Si la red cae durante la ejecución de `fn`, espera a que vuelva y reintenta.
 * Los errores permanentes (auth, not-found, invalid-arg) se propagan sin reintentar.
 *
 * @param fn             Función async a ejecutar (puede lanzar en cualquier intento)
 * @param maxRetries     Número máximo de reintentos por red caída (default 10)
 * @param onStatus       Callback de progreso
 * @param abortSignal    Para cancelar la espera externamente
 */
export async function withConnectivityRetry<T>(
    fn: () => Promise<T>,
    maxRetries = 10,
    onStatus?: ConnectivityCallback,
    abortSignal?: AbortSignal
): Promise<T> {
    const PERMANENT_ERRORS = ["unauthenticated", "not-found", "invalid-argument", "permission-denied"];

    let networkRetries = 0;

    while (true) {
        if (abortSignal?.aborted) throw new Error("Operación cancelada");

        try {
            return await fn();
        } catch (err: any) {
            const msg = String(err?.message || err?.code || err || "").toLowerCase();

            // Error permanente → propagar inmediatamente, no reintentar
            const isPermanent = PERMANENT_ERRORS.some((e) => msg.includes(e));
            if (isPermanent) throw err;

            // Error de red → esperar conectividad
            const isNetwork =
                msg.includes("network") ||
                msg.includes("fetch") ||
                msg.includes("failed to fetch") ||
                msg.includes("networkerror") ||
                msg.includes("net::") ||
                msg.includes("quic") ||
                msg.includes("timeout") ||
                msg.includes("abort") ||
                !navigator.onLine;

            if (isNetwork && networkRetries < maxRetries) {
                networkRetries++;
                await waitForConnectivity(onStatus, abortSignal);
                continue; // reintentar fn
            }

            // Reintentos agotados o error desconocido → propagar
            throw err;
        }
    }
}
