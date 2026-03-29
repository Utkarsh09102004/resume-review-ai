const express = require("express");
const { execFile } = require("child_process");
const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");

const app = express();
app.use(express.json({ limit: "5mb" }));

const COMPILE_DIR = "/tmp/latex-compile";
const TIMEOUT_MS = 15000;

app.post("/compile", async (req, res) => {
  const start = Date.now();
  const { latex } = req.body;

  if (!latex) {
    return res.status(400).json({
      success: false,
      message: "Missing required field: latex",
    });
  }

  const jobId = uuidv4();
  const jobDir = path.join(COMPILE_DIR, jobId);

  try {
    await fs.promises.mkdir(jobDir, { recursive: true });
    const texFile = path.join(jobDir, "input.tex");
    await fs.promises.writeFile(texFile, latex);

    // Run xelatex twice for references/TOC
    for (let pass = 0; pass < 2; pass++) {
      const result = await runXelatex(jobDir, texFile);
      if (!result.success) {
        const duration = Date.now() - start;
        const errorMessage = parseLatexError(result.output) || result.message;
        logCompilation({ duration_ms: duration, success: false, error: errorMessage });
        return res.status(400).json({
          success: false,
          message: errorMessage,
          log: result.output,
        });
      }
    }

    const pdfPath = path.join(jobDir, "input.pdf");
    try {
      await fs.promises.access(pdfPath);
    } catch {
      const duration = Date.now() - start;
      logCompilation({ duration_ms: duration, success: false, error: "PDF not generated" });
      return res.status(400).json({
        success: false,
        message: "PDF not generated",
      });
    }

    const pdfBytes = await fs.promises.readFile(pdfPath);
    const duration = Date.now() - start;
    logCompilation({ duration_ms: duration, success: true });

    res.setHeader("Content-Type", "application/pdf");
    res.send(pdfBytes);
  } catch (err) {
    const duration = Date.now() - start;
    logCompilation({ duration_ms: duration, success: false, error: err.message });
    res.status(500).json({
      success: false,
      message: err.message,
    });
  } finally {
    fs.rm(jobDir, { recursive: true, force: true }, (err) => {
      if (err) console.error(`Cleanup failed for ${jobDir}:`, err.message);
    });
  }
});

app.get("/health", (req, res) => {
  execFile("xelatex", ["--version"], { timeout: 5000 }, (err, stdout) => {
    if (err) {
      return res.status(503).json({
        status: "error",
        message: "xelatex not available",
      });
    }
    const version = stdout.split("\n")[0];
    res.json({ status: "ok", engine: "xelatex", version });
  });
});

function runXelatex(cwd, texFile) {
  return new Promise((resolve) => {
    execFile(
      "xelatex",
      ["--no-shell-escape", "--interaction=nonstopmode", texFile],
      { cwd, timeout: TIMEOUT_MS },
      (err, stdout, stderr) => {
        const output = (stdout || "") + "\n" + (stderr || "");
        if (err) {
          resolve({
            success: false,
            message: err.killed ? "Compilation timed out" : "Compilation failed",
            output,
          });
        } else {
          resolve({ success: true, output });
        }
      }
    );
  });
}

function parseLatexError(output) {
  if (!output) return null;
  const lines = output.split("\n");
  for (const line of lines) {
    if (line.startsWith("!")) {
      return line;
    }
  }
  return null;
}

function logCompilation({ duration_ms, success, error }) {
  const entry = {
    timestamp: new Date().toISOString(),
    duration_ms,
    success,
  };
  if (error) entry.error = error;
  console.log(JSON.stringify(entry));
}

const PORT = process.env.PORT || 3001;
const server = app.listen(PORT, () => {
  console.log(`TeXLive compiler listening on port ${PORT}`);
});

function shutdown(signal) {
  console.log(`Received ${signal}, shutting down gracefully...`);
  server.close(() => {
    console.log("All connections closed, exiting.");
    process.exit(0);
  });
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
