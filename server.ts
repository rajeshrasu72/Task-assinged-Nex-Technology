import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, getApps, getApp } from 'firebase-admin/app';
import { getAuth, DecodedIdToken } from 'firebase-admin/auth';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface FirebaseAppletConfig {
  projectId?: string;
}

function loadProjectId(): string | undefined {
  try {
    const configPath = path.resolve(__dirname, 'firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      const raw = JSON.parse(fs.readFileSync(configPath, 'utf-8')) as FirebaseAppletConfig;
      if (raw.projectId && raw.projectId !== 'remixed-project-id') {
        return raw.projectId;
      }
    }
  } catch {
    // Fallback to environment if config is absent during static analysis
  }
  return process.env.GOOGLE_CLOUD_PROJECT || undefined;
}

const projectId = loadProjectId();
if (projectId) {
  if (!getApps().length) {
    initializeApp({ projectId });
  } else {
    getApp();
  }
}

interface AuthenticatedRequest extends Request {
  decodedToken?: DecodedIdToken;
}

async function verifyBearerToken(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid authorization token.' });
    return;
  }
  if (!projectId) {
    res.status(503).json({ error: 'Firebase project is not configured on the server.' });
    return;
  }
  const token = authHeader.slice('Bearer '.length).trim();
  try {
    const decoded = await getAuth().verifyIdToken(token);
    if (!decoded.email_verified) {
      res.status(403).json({ error: 'Email verification is required.' });
      return;
    }
    req.decodedToken = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired authentication token.' });
  }
}

function escapeCsvCell(value: unknown): string {
  const str = String(value ?? '');
  const sanitized = /^[=+\-@\t\r]/.test(str) ? `'${str}` : str;
  return `"${sanitized.replace(/"/g, '""')}"`;
}

async function startServer() {
  const app = express();
  const port = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      service: 'nex-task-manager',
      firebaseConfigured: Boolean(projectId),
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/api/auth/verify', verifyBearerToken, (req: AuthenticatedRequest, res: Response) => {
    res.json({
      uid: req.decodedToken?.uid,
      email: req.decodedToken?.email,
      emailVerified: Boolean(req.decodedToken?.email_verified),
    });
  });

  app.post('/api/reports/export', verifyBearerToken, (req: AuthenticatedRequest, res: Response) => {
    const { title, headers, rows } = req.body as {
      title?: unknown;
      headers?: unknown;
      rows?: unknown;
    };

    if (!Array.isArray(headers) || !Array.isArray(rows) || headers.length === 0 || headers.length > 30 || rows.length > 5000) {
      res.status(400).json({ error: 'Invalid report payload.' });
      return;
    }

    const csvLines: string[] = [];
    csvLines.push(headers.map(escapeCsvCell).join(','));
    for (const row of rows) {
      if (!Array.isArray(row)) continue;
      csvLines.push(row.slice(0, headers.length).map(escapeCsvCell).join(','));
    }

    const safeTitle = String(title || 'nex-report')
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '-')
      .slice(0, 50);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}.csv"`);
    res.send(csvLines.join('\r\n'));
  });

  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Nex Task Manager running on http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
