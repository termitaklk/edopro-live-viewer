const DEFAULT_ALLOWED_ROOM_API_HOSTS = [
    'server.evolutionygo.com',
    'us.projectignis.org',
];

function inferRoomClient(room) {
    const roomName = String(room?.roomname || '').trim();
    return roomName ? 'mercury' : 'edopro';
}

function normalizeRoomMeta(room) {
    if (!room || typeof room !== 'object') {
        return null;
    }
    return {
        ...room,
        roomClient: normalizeClientFlow(room.roomClient, room),
    };
}

function normalizeClientFlow(explicitFlow, room) {
    const requested = String(explicitFlow || '').trim().toLowerCase();
    if (requested === 'mercury' || requested === 'edopro') {
        return requested;
    }

    const roomClient = String(room?.roomClient || '').trim().toLowerCase();
    if (roomClient === 'mercury' || roomClient === 'edopro') {
        return roomClient;
    }

    return inferRoomClient(room);
}

function isValidIpv4(hostname) {
    const parts = String(hostname || '').split('.');
    if (parts.length !== 4) {
        return false;
    }
    return parts.every((part) => /^\d+$/.test(part) && Number(part) >= 0 && Number(part) <= 255);
}

function isPrivateIpv4(hostname) {
    if (!isValidIpv4(hostname)) {
        return false;
    }
    const [a, b] = hostname.split('.').map((value) => Number(value));
    return (
        a === 10 ||
        (a === 172 && b >= 16 && b <= 31) ||
        (a === 192 && b === 168) ||
        (a === 127)
    );
}

function isLocalHostname(hostname) {
    const normalized = String(hostname || '').trim().toLowerCase();
    return normalized === 'localhost' || normalized.endsWith('.local');
}

function parseAllowedHosts(rawHosts) {
    if (!rawHosts) {
        return new Set(DEFAULT_ALLOWED_ROOM_API_HOSTS);
    }
    return new Set(
        String(rawHosts)
            .split(',')
            .map((item) => item.trim().toLowerCase())
            .filter(Boolean)
    );
}

function resolveServerBase(inputBase, defaultBase, options = {}) {
    const {
        allowedHosts = parseAllowedHosts(process.env.ROOM_API_ALLOWED_HOSTS),
        allowPrivateNetwork = String(process.env.ALLOW_PRIVATE_ROOM_API || '1') !== '0',
    } = options;

    const candidate = String(inputBase || defaultBase || '').trim();
    if (!candidate) {
        throw new Error('serverBase is required');
    }

    let parsed;
    try {
        parsed = new URL(candidate);
    } catch (_) {
        throw new Error('serverBase is not a valid URL');
    }

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        throw new Error('serverBase protocol must be http or https');
    }

    const hostname = parsed.hostname.toLowerCase();
    const hostAllowed =
        allowedHosts.has('*') ||
        allowedHosts.has(hostname) ||
        (allowPrivateNetwork && (isLocalHostname(hostname) || isPrivateIpv4(hostname)));

    if (!hostAllowed) {
        throw new Error(`serverBase host is not allowed: ${hostname}`);
    }

    return parsed.toString().replace(/\/$/, '');
}

function resolveConnectionOptions(serverBase, duelPort, defaults = {}) {
    const fallbackHost = defaults.fallbackHost || process.env.DUEL_SERVER_HOST || 'us.projectignis.org';
    const fallbackPort = Number(defaults.defaultDuelPort || process.env.DUEL_SERVER_PORT || 7911);

    try {
        const parsed = new URL(serverBase || defaults.defaultRoomApiBase || '');
        return {
            serverHost: parsed.hostname,
            serverPort: Number(duelPort || fallbackPort),
        };
    } catch (_) {
        return {
            serverHost: fallbackHost,
            serverPort: Number(duelPort || fallbackPort),
        };
    }
}

module.exports = {
    inferRoomClient,
    normalizeRoomMeta,
    normalizeClientFlow,
    parseAllowedHosts,
    resolveServerBase,
    resolveConnectionOptions,
};
