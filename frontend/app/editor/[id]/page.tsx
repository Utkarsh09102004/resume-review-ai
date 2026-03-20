"use client";

import { useState, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import Toolbar from "@/components/Toolbar";
import StatusPill from "@/components/StatusPill";
import SplitPane from "@/components/editor/SplitPane";
import EditorPanel from "@/components/editor/EditorPanel";
import PreviewPanel from "@/components/editor/PreviewPanel";
import ErrorPanel from "@/components/editor/ErrorPanel";
import { useResumeEditor } from "@/hooks/useResumeEditor";
import { useCompiler } from "@/hooks/useCompiler";
import api from "@/lib/api";

export default function EditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { resume, parentResume, loading, notFound, error, isSaving, save } =
    useResumeEditor(id);

  const [latex, setLatex] = useState<string | null>(null);
  const [errorsExpanded, setErrorsExpanded] = useState(true);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Track whether we've initialized the editor from the loaded resume
  const [initialized, setInitialized] = useState(false);

  // Once resume loads, set initial LaTeX in editor
  if (resume && !initialized) {
    setLatex(resume.latex_source);
    setInitialized(true);
  }

  const currentLatex = latex ?? "";

  const {
    pdfData,
    errors: compileErrors,
    status: compileStatus,
    compiledAgo,
  } = useCompiler(currentLatex);

  const handleLineClick = useCallback((line: number) => {
    // Could scroll CodeMirror to line in the future
    console.log("Navigate to line:", line);
  }, []);

  const handleSave = useCallback(async () => {
    if (!resume || latex === null) return;
    try {
      setSaveError(null);
      await save({ latex_source: latex });
    } catch {
      setSaveError("Failed to save");
    }
  }, [resume, latex, save]);

  const handleDownload = useCallback(async () => {
    if (!currentLatex.trim()) return;

    try {
      const resp = await api.post(
        "/api/compile",
        { latex: currentLatex },
        { responseType: "arraybuffer" }
      );
      const blob = new Blob([resp.data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${resume?.title ?? "resume"}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download compile failed:", err);
    }
  }, [currentLatex, resume?.title]);

  // Build breadcrumb
  const breadcrumb: { label: string; href?: string }[] = [
    { label: "Dashboard", href: "/dashboard" },
  ];
  if (parentResume) {
    breadcrumb.push({ label: parentResume.title });
  }
  if (resume) {
    breadcrumb.push({ label: resume.title });
  }

  // Map compile status to StatusPill status
  const pillStatus: "compiling" | "compiled" | "error" =
    compileStatus === "compiling"
      ? "compiling"
      : compileStatus === "error"
        ? "error"
        : compileStatus === "compiled"
          ? "compiled"
          : "compiled";

  if (loading) {
    return (
      <div className="flex h-screen flex-col">
        <Toolbar user={{ name: "Utkarsh Agarwal" }} />
        <div className="flex flex-1 items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-bg-border border-t-accent-amber" />
            <p className="text-sm text-text-secondary">Loading resume...</p>
          </div>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="flex h-screen flex-col">
        <Toolbar user={{ name: "Utkarsh Agarwal" }} />
        <div className="flex flex-1 items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-center">
            <p className="text-lg font-semibold text-text-primary">
              Resume not found
            </p>
            <p className="text-sm text-text-secondary">
              This resume may have been deleted.
            </p>
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="mt-2 text-sm text-accent-amber hover:underline cursor-pointer"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen flex-col">
        <Toolbar user={{ name: "Utkarsh Agarwal" }} />
        <div className="flex flex-1 items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-center">
            <p className="text-sm text-status-error">{error}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="text-sm text-accent-amber hover:underline cursor-pointer"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col">
      <Toolbar
        breadcrumb={breadcrumb}
        user={{ name: "Utkarsh Agarwal" }}
        actions={
          <div className="flex items-center gap-2">
            {saveError && (
              <span className="text-xs text-status-error">{saveError}</span>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="flex h-8 items-center gap-1.5 rounded-md border border-bg-border px-3 text-xs font-medium text-text-secondary transition-colors hover:border-accent-amber hover:text-accent-amber disabled:opacity-50 cursor-pointer"
            >
              {isSaving ? "Saving..." : "Save"}
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="flex h-8 items-center gap-1.5 rounded-md bg-accent-amber px-3 text-xs font-semibold text-bg-deep transition-opacity hover:opacity-90 cursor-pointer"
            >
              Download PDF
            </button>
          </div>
        }
      >
        {compileStatus !== "idle" && (
          <StatusPill
            status={pillStatus}
            compiledAgo={compiledAgo}
            errorCount={compileErrors.length}
            onErrorClick={() => setErrorsExpanded(!errorsExpanded)}
          />
        )}
      </Toolbar>

      {/* Main editor area */}
      <div className="flex flex-1 flex-col overflow-hidden md:flex-row">
        {/* Desktop: split pane layout */}
        <div className="hidden md:flex md:flex-1 md:flex-col md:overflow-hidden">
          <div className="flex-1 overflow-hidden">
            <SplitPane
              left={
                <div className="flex h-full flex-col">
                  <div className="flex-1 overflow-hidden">
                    <EditorPanel value={currentLatex} onChange={setLatex} />
                  </div>
                  <ErrorPanel
                    errors={compileErrors}
                    expanded={errorsExpanded}
                    onToggle={() => setErrorsExpanded(!errorsExpanded)}
                    onLineClick={handleLineClick}
                  />
                </div>
              }
              right={<PreviewPanel pdfData={pdfData} />}
              defaultSize={50}
            />
          </div>
        </div>

        {/* Mobile: stacked fallback */}
        <div className="flex flex-1 flex-col overflow-hidden md:hidden">
          <div className="flex-1 overflow-hidden">
            <EditorPanel value={currentLatex} onChange={setLatex} />
          </div>
          <ErrorPanel
            errors={compileErrors}
            expanded={errorsExpanded}
            onToggle={() => setErrorsExpanded(!errorsExpanded)}
            onLineClick={handleLineClick}
          />
          <div className="h-64 border-t border-bg-border">
            <PreviewPanel pdfData={pdfData} />
          </div>
        </div>
      </div>
    </div>
  );
}
