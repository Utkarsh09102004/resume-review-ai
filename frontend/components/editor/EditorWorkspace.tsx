"use client";

import { useCallback, useState } from "react";
import Toolbar from "@/components/Toolbar";
import StatusPill from "@/components/StatusPill";
import SplitPane from "@/components/editor/SplitPane";
import EditorPanel from "@/components/editor/EditorPanel";
import PreviewPanel from "@/components/editor/PreviewPanel";
import ErrorPanel from "@/components/editor/ErrorPanel";
import { renameResumeAction, saveResumeLatexAction } from "@/app/(app)/editor/[id]/actions";
import { useCompiler } from "@/hooks/useCompiler";
import api from "@/lib/api";
import type { UserDisplayInfo } from "@/lib/auth";
import type { ResumeFromAPI } from "@/lib/resumes";

export default function EditorWorkspace({
  initialResume,
  parentResume,
  user,
}: {
  initialResume: ResumeFromAPI;
  parentResume: ResumeFromAPI | null;
  user: UserDisplayInfo;
}) {
  const [resume, setResume] = useState(initialResume);
  const [latex, setLatex] = useState<string | null>(null);
  const [errorsExpanded, setErrorsExpanded] = useState(true);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const currentLatex = latex ?? resume.latex_source;
  const hasUnsavedChanges =
    latex !== null && latex !== resume.latex_source;

  const {
    pdfData,
    errors: compileErrors,
    status: compileStatus,
    compiledAgo,
  } = useCompiler(currentLatex);

  const handleLineClick = useCallback((line: number) => {
    console.log("Navigate to line:", line);
  }, []);

  const handleSave = useCallback(async () => {
    if (!hasUnsavedChanges || latex === null) {
      return;
    }

    try {
      setIsSaving(true);
      setSaveError(null);
      const updatedResume = await saveResumeLatexAction(resume.id, latex);
      setResume(updatedResume);
      setLatex(null);
    } catch {
      setSaveError("Failed to save");
    } finally {
      setIsSaving(false);
    }
  }, [hasUnsavedChanges, latex, resume.id]);

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
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${resume.title}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download compile failed:", error);
    }
  }, [currentLatex, resume.title]);

  const handleTitleRename = useCallback(
    async (newTitle: string) => {
      try {
        setIsSaving(true);
        setSaveError(null);
        const updatedResume = await renameResumeAction(resume.id, newTitle);
        setResume(updatedResume);
      } catch {
        setSaveError("Failed to rename");
      } finally {
        setIsSaving(false);
      }
    },
    [resume.id]
  );

  const breadcrumb: {
    label: string;
    href?: string;
    editable?: boolean;
    onRename?: (newTitle: string) => void;
  }[] = [{ label: "Dashboard", href: "/dashboard" }];

  if (parentResume) {
    breadcrumb.push({ label: parentResume.title });
  }

  breadcrumb.push({
    label: resume.title,
    editable: true,
    onRename: handleTitleRename,
  });

  const pillStatus: "compiling" | "compiled" | "error" =
    compileStatus === "compiling"
      ? "compiling"
      : compileStatus === "error"
        ? "error"
        : "compiled";

  return (
    <div className="flex h-screen flex-col">
      <Toolbar
        breadcrumb={breadcrumb}
        user={user}
        actions={
          <div className="flex items-center gap-2">
            {saveError ? (
              <span className="text-xs text-status-error">{saveError}</span>
            ) : null}
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || !hasUnsavedChanges}
              className="flex h-8 cursor-pointer items-center gap-1.5 rounded-md border border-bg-border px-3 text-xs font-medium text-text-secondary transition-colors hover:border-accent-amber hover:text-accent-amber disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Save"}
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="flex h-8 cursor-pointer items-center gap-1.5 rounded-md bg-accent-amber px-3 text-xs font-semibold text-bg-deep transition-opacity hover:opacity-90"
            >
              Download PDF
            </button>
          </div>
        }
      >
        {compileStatus !== "idle" ? (
          <StatusPill
            status={pillStatus}
            compiledAgo={compiledAgo}
            errorCount={compileErrors.length}
            onErrorClick={() => setErrorsExpanded(!errorsExpanded)}
          />
        ) : null}
      </Toolbar>

      <div className="flex flex-1 flex-col overflow-hidden md:flex-row">
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
