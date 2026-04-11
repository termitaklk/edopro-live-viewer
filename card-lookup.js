const path = require('path');
const { execFileSync } = require('child_process');

const CARD_CACHE_MAX = 5000;
const cardCache = new Map();

function touchCache(key, value) {
    if (cardCache.has(key)) {
        cardCache.delete(key);
    }
    cardCache.set(key, value);
    if (cardCache.size > CARD_CACHE_MAX) {
        const oldest = cardCache.keys().next().value;
        cardCache.delete(oldest);
    }
}

function lookupCardById(cardId, dataDir, pythonBin = process.env.PYTHON_BIN || 'python') {
    const cached = cardCache.get(cardId);
    if (cached) {
        return cached;
    }

    const script = `
import glob, json, os, sqlite3, sys
card_id = int(sys.argv[1])
base = sys.argv[2]
files = sorted(glob.glob(os.path.join(base, "*.cdb")))
result = None
for db_path in files:
    try:
        conn = sqlite3.connect(db_path)
        cur = conn.cursor()
        cur.execute("""
            SELECT d.id, t.name, t.desc
            FROM datas d
            LEFT JOIN texts t ON t.id = d.id
            WHERE d.id = ?
            LIMIT 1
        """, (card_id,))
        row = cur.fetchone()
        conn.close()
        if row:
            result = {
                "id": int(row[0]),
                "name": row[1] or str(card_id),
                "desc": row[2] or "",
                "db": os.path.basename(db_path),
            }
            break
    except Exception:
        pass
print(json.dumps(result or {"id": card_id, "name": str(card_id), "desc": "", "db": None}))
`;

    const output = execFileSync(
        pythonBin,
        ['-c', script, String(cardId), path.resolve(dataDir)],
        {
            cwd: path.resolve(dataDir, '..'),
            encoding: 'utf8',
            timeout: 8000,
            maxBuffer: 1024 * 1024,
        }
    );

    const parsed = JSON.parse(output);
    touchCache(cardId, parsed);
    return parsed;
}

module.exports = {
    lookupCardById,
};
