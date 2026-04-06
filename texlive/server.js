const express = require("express");
const { execFile } = require("child_process");
const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");

const app = express();
app.use(express.json({ limit: "5mb" }));

const COMPILE_DIR = "/tmp/latex-compile";
const TIMEOUT_MS = 15000;

const LATEX_ENGINE = "pdflatex";

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

    // Run pdflatex twice for references/TOC
    let lastOutput = "";
    const pdfFile = path.join(jobDir, "input.pdf");
    for (let pass = 0; pass < 2; pass++) {
      // Remove stale PDF so the existence check reflects this pass's output
      await fs.promises.rm(pdfFile, { force: true });
      const result = await runLatex(jobDir, texFile);
      lastOutput = result.output;
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

    const pageCount = parsePageCount(lastOutput);
    res.setHeader("Content-Type", "application/pdf");
    if (pageCount !== null) {
      res.setHeader("X-PDF-Pages", String(pageCount));
    }
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
  execFile(LATEX_ENGINE, ["--version"], { timeout: 5000 }, (err, stdout) => {
    if (err) {
      return res.status(503).json({
        status: "error",
        message: `${LATEX_ENGINE} not available`,
      });
    }
    const version = stdout.split("\n")[0];
    res.json({ status: "ok", engine: LATEX_ENGINE, version });
  });
});

function runLatex(cwd, texFile) {
  return new Promise((resolve) => {
    execFile(
      LATEX_ENGINE,
      ["-no-shell-escape", "-interaction=nonstopmode", texFile],
      { cwd, timeout: TIMEOUT_MS },
      (err, stdout, stderr) => {
        const output = (stdout || "") + "\n" + (stderr || "");
        if (err && err.killed) {
          resolve({ success: false, message: "Compilation timed out", output });
          return;
        }
        // IMPORTANT: Do NOT revert this to a simple exit-code check.
        // pdflatex exits non-zero on warnings/non-fatal errors (e.g. undefined
        // commands like \medium) but still produces a valid PDF. This matches
        // Overleaf's behavior — most resume templates from the internet have
        // minor issues that don't prevent PDF generation.
        // We use pdflatex (not xelatex) because virtually all Overleaf resume
        // templates target pdflatex. xelatex breaks on common pdfTeX commands
        // like \input{glyphtounicode} and \pdfgentounicode. pdflatex covers
        // our use case fully.
        const pdfPath = path.join(cwd, "input.pdf");
        fs.access(pdfPath, fs.constants.F_OK, (accessErr) => {
          if (!accessErr) {
            resolve({ success: true, output });
          } else {
            resolve({ success: false, message: "Compilation failed", output });
          }
        });
      }
    );
  });
}

function parsePageCount(output) {
  if (!output) return null;
  // pdflatex prints: "Output written on input.pdf (2 pages, 13338 bytes)."
  const match = output.match(/Output written on .+\((\d+) pages?,/);
  return match ? parseInt(match[1], 10) : null;
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
