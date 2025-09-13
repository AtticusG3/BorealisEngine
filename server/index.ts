import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes, requireTenant } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from 'url';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Python services management
let surveyProcess: any = null;
let reportsProcess: any = null;

const installPythonDependencies = async (appDir: string, appName: string) => {
  return new Promise<void>((resolve, reject) => {
    log(`Installing dependencies for ${appName}...`);
    const installProcess = spawn('pip', ['install', '--user', '-e', '.'], {
      cwd: appDir,
      env: { ...process.env }
    });

    installProcess.stdout.on('data', (data: Buffer) => {
      log(`[${appName} Install] ${data.toString().trim()}`);
    });

    installProcess.stderr.on('data', (data: Buffer) => {
      log(`[${appName} Install Error] ${data.toString().trim()}`);
    });

    installProcess.on('close', (code) => {
      if (code === 0) {
        log(`${appName} dependencies installed successfully`);
        resolve();
      } else {
        log(`Failed to install ${appName} dependencies (exit code: ${code})`);
        reject(new Error(`Dependency installation failed for ${appName}`));
      }
    });
  });
};

const startPythonServices = async () => {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const rootDir = path.resolve(__dirname, '..');
  
  try {
    const surveyDir = path.join(rootDir, 'apps/borealis-survey');
    const reportsDir = path.join(rootDir, 'apps/borealis-reports');

    // Install dependencies for both apps
    await installPythonDependencies(surveyDir, 'Survey');
    await installPythonDependencies(reportsDir, 'Reports');

    // Start Survey Service
    log('Starting Survey Service on port 8010...');
    surveyProcess = spawn('python', [
      '-m', 'uvicorn',
      'borealis_survey.main:app',
      '--host', '127.0.0.1',
      '--port', '8010'
    ], {
      env: { 
        ...process.env, 
        PYTHONPATH: surveyDir
      },
      cwd: surveyDir
    });

    surveyProcess.stdout.on('data', (data: Buffer) => {
      log(`[Survey] ${data.toString().trim()}`);
    });
    
    surveyProcess.stderr.on('data', (data: Buffer) => {
      log(`[Survey ERROR] ${data.toString().trim()}`);
    });

    surveyProcess.on('error', (error: any) => {
      log(`[Survey Process Error] ${error.message}`);
    });

    surveyProcess.on('exit', (code: number | null, signal: NodeJS.Signals | null) => {
      log(`[Survey] Process exited with code ${code} and signal ${signal}`);
    });

    // Start Reports Service  
    log('Starting Reports Service on port 8020...');
    reportsProcess = spawn('python', [
      '-m', 'uvicorn', 
      'borealis_reports.main:app',
      '--host', '127.0.0.1', 
      '--port', '8020'
    ], {
      env: {
        ...process.env,
        PYTHONPATH: reportsDir
      },
      cwd: reportsDir
    });

    reportsProcess.stdout.on('data', (data: Buffer) => {
      log(`[Reports] ${data.toString().trim()}`);
    });
    
    reportsProcess.stderr.on('data', (data: Buffer) => {
      log(`[Reports ERROR] ${data.toString().trim()}`);
    });

    reportsProcess.on('error', (error: any) => {
      log(`[Reports Process Error] ${error.message}`);
    });

    reportsProcess.on('exit', (code: number | null, signal: NodeJS.Signals | null) => {
      log(`[Reports] Process exited with code ${code} and signal ${signal}`);
    });

    // Wait for services to start and check health
    log('Waiting for Python services to start...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Simple health check
    try {
      const surveyHealthCheck = await fetch('http://127.0.0.1:8010/health');
      const reportsHealthCheck = await fetch('http://127.0.0.1:8020/health');
      
      if (surveyHealthCheck.ok && reportsHealthCheck.ok) {
        log('Python services started and health checks passed');
      } else {
        log('Python services started but health checks failed');
      }
    } catch (error) {
      log('Python services started but health checks could not connect');
    }
    
  } catch (error) {
    log(`Error starting Python services: ${error}`);
  }
};

// Proxy routes for Python services
const addProxyRoutes = (app: express.Application) => {
  // Survey service proxy routes
  app.all('/api/survey/*', requireTenant, async (req, res) => {
    try {
      // Map paths correctly: health goes to /health, others go to /surveys/*
      const originalPath = req.path;
      let targetPath;
      if (originalPath === '/api/survey/health') {
        targetPath = '/health';
      } else {
        targetPath = originalPath.replace('/api/survey', '/surveys');
      }
      const queryString = req.url.includes('?') ? '?' + req.url.split('?')[1] : '';
      const url = `http://127.0.0.1:8010${targetPath}${queryString}`;
      
      log(`Survey proxy: ${originalPath} -> ${url}`);
      
      // Prepare headers
      const headers: Record<string, string> = {
        'x-tenant-id': req.tenant,
      };
      
      // Handle different content types
      let body: any = undefined;
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        const contentType = req.headers['content-type'];
        if (contentType?.includes('application/json')) {
          headers['Content-Type'] = 'application/json';
          body = JSON.stringify(req.body);
        } else if (contentType?.includes('multipart/form-data')) {
          // For FormData, we need to handle this differently
          body = req.body;
        } else {
          headers['Content-Type'] = contentType || 'application/json';
          body = req.method !== 'GET' ? JSON.stringify(req.body) : undefined;
        }
      }
      
      const response = await fetch(url, {
        method: req.method,
        headers,
        body
      });

      const data = await response.text();
      res.status(response.status).send(data);
    } catch (error) {
      log(`Survey proxy error: ${error}`);
      res.status(503).json({ error: 'Survey service unavailable' });
    }
  });

  // Reports service proxy routes  
  app.all('/api/reports*', requireTenant, async (req, res) => {
    try {
      // Keep the path as-is since reports service expects /reports, /templates etc.
      const targetPath = req.path.replace('/api/reports', '');
      const queryString = req.url.includes('?') ? '?' + req.url.split('?')[1] : '';
      const url = `http://127.0.0.1:8020${targetPath}${queryString}`;
      
      const headers: Record<string, string> = {
        'x-tenant-id': req.tenant,
      };
      
      let body: any = undefined;
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        const contentType = req.headers['content-type'];
        headers['Content-Type'] = contentType || 'application/json';
        body = JSON.stringify(req.body);
      }
      
      const response = await fetch(url, {
        method: req.method,
        headers,
        body
      });

      const data = await response.text();
      res.status(response.status).send(data);
    } catch (error) {
      log(`Reports proxy error: ${error}`);
      res.status(503).json({ error: 'Reports service unavailable' });
    }
  });
};

(async () => {
  const server = await registerRoutes(app);
  
  // Add proxy routes
  addProxyRoutes(app);
  
  // Start Python services
  await startPythonServices();

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
