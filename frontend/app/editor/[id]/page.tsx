"use client";

import { useState } from "react";
import Toolbar from "@/components/Toolbar";
import StatusPill from "@/components/StatusPill";
import SplitPane from "@/components/editor/SplitPane";
import EditorPanel from "@/components/editor/EditorPanel";
import PreviewPanel from "@/components/editor/PreviewPanel";
import ErrorPanel from "@/components/editor/ErrorPanel";

// Mock LaTeX source
const MOCK_LATEX = `\\documentclass[11pt,a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage{geometry}
\\geometry{left=0.75in,right=0.75in,top=0.6in,bottom=0.6in}
\\usepackage{enumitem}
\\usepackage{hyperref}
\\usepackage{titlesec}

\\titleformat{\\section}{\\large\\bfseries}{}{0em}{}[\\titlerule]
\\titlespacing*{\\section}{0pt}{8pt}{4pt}

\\pagestyle{empty}

\\begin{document}

\\begin{center}
  {\\Huge\\bfseries Jane Doe} \\\\[4pt]
  \\href{mailto:jane@example.com}{jane@example.com} \\;|\\;
  (555) 123-4567 \\;|\\;
  \\href{https://github.com/janedoe}{github.com/janedoe} \\;|\\;
  San Francisco, CA
\\end{center}

\\section{Experience}

\\textbf{Senior Software Engineer} \\hfill \\textit{2024 -- Present} \\\\
\\textit{Acme Corp} \\hfill San Francisco, CA
\\begin{itemize}[nosep,leftmargin=*]
  \\item Led migration of monolithic backend to microservices, reducing deploy times by 60\\%
  \\item Designed and implemented real-time event processing pipeline handling 50k events/sec
  \\item Mentored 4 junior engineers through structured 1:1s and code review sessions
\\end{itemize}

\\section{Education}

\\textbf{B.S. Computer Science} \\hfill \\textit{2016 -- 2020} \\\\
\\textit{Stanford University} \\hfill Stanford, CA

\\section{Skills}

\\textbf{Languages:} TypeScript, Python, Go, Rust \\\\
\\textbf{Frameworks:} React, Next.js, FastAPI, gRPC \\\\
\\textbf{Tools:} Docker, Kubernetes, Terraform, PostgreSQL, Redis

\\end{document}
`;

// Mock errors
const MOCK_ERRORS = [
  { line: 12, message: "Undefined control sequence \\titlerule" },
  { line: 28, message: "Missing $ inserted" },
];

export default function EditorPage() {
  const [latex, setLatex] = useState(MOCK_LATEX);
  const [errorsExpanded, setErrorsExpanded] = useState(true);

  // Mock status — toggle to see different states
  const [status] = useState<"compiling" | "compiled" | "error">("error");

  function handleLineClick(line: number) {
    console.log("Navigate to line:", line);
  }

  return (
    <div className="flex h-screen flex-col">
      <Toolbar
        breadcrumb={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Software Engineer \u2014 Master" },
          { label: "Frontend Focus" },
        ]}
        user={{ name: "Utkarsh Agarwal" }}
      >
        <StatusPill
          status={status}
          compiledAgo="2s ago"
          errorCount={MOCK_ERRORS.length}
          onErrorClick={() => setErrorsExpanded(!errorsExpanded)}
        />
      </Toolbar>

      {/* Main editor area */}
      <div className="flex flex-1 flex-col overflow-hidden md:flex-row">
        {/* Mobile: stacked layout */}
        <div className="hidden md:flex md:flex-1 md:flex-col md:overflow-hidden">
          <div className="flex-1 overflow-hidden">
            <SplitPane
              left={
                <div className="flex h-full flex-col">
                  <div className="flex-1 overflow-hidden">
                    <EditorPanel value={latex} onChange={setLatex} />
                  </div>
                  <ErrorPanel
                    errors={MOCK_ERRORS}
                    expanded={errorsExpanded}
                    onToggle={() => setErrorsExpanded(!errorsExpanded)}
                    onLineClick={handleLineClick}
                  />
                </div>
              }
              right={<PreviewPanel pdfData={null} />}
              defaultSize={50}
            />
          </div>
        </div>

        {/* Mobile: stacked fallback */}
        <div className="flex flex-1 flex-col overflow-hidden md:hidden">
          <div className="flex-1 overflow-hidden">
            <EditorPanel value={latex} onChange={setLatex} />
          </div>
          <ErrorPanel
            errors={MOCK_ERRORS}
            expanded={errorsExpanded}
            onToggle={() => setErrorsExpanded(!errorsExpanded)}
            onLineClick={handleLineClick}
          />
          <div className="h-64 border-t border-bg-border">
            <PreviewPanel pdfData={null} />
          </div>
        </div>
      </div>
    </div>
  );
}
