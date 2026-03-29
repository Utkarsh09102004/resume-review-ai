"use client";

import dynamic from "next/dynamic";
import { useCallback, useState } from "react";
import Toolbar from "@/components/Toolbar";
import ToolbarBreadcrumbs, {
  type ToolbarBreadcrumb,
} from "@/components/ToolbarBreadcrumbs";
import StatusPill from "@/components/StatusPill";
import SplitPane from "@/components/editor/SplitPane";
import ErrorPanel from "@/components/editor/ErrorPanel";
import { renameResumeAction, saveResumeLatexAction } from "@/app/(app)/editor/[id]/actions";
import { useCompiler } from "@/hooks/useCompiler";
import { compileLatexDocument } from "@/lib/compile";
import type { UserDisplayInfo } from "@/lib/auth";

const EditorPanel = dynamic(() => import("@/components/editor/EditorPanel"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-bg-surface">
      <span className="text-sm text-text-secondary">Loading editor...</span>
    </div>
  ),
});

const PreviewPanel = dynamic(() => import("@/components/editor/PreviewPanel"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-bg-deep">
      <span className="text-sm text-text-secondary">Loading preview...</span>
    </div>
  ),
});

interface EditorDocument {
  id: string;
  title: string;
  latexSource: string;
}

interface EditorWorkspaceClientProps {
  initialDocument: EditorDocument;
  parentTitle: string | null;
  user: UserDisplayInfo;
}

export default function EditorWorkspaceClient({
  initialDocument,
  parentTitle,
  user,
}: EditorWorkspaceClientProps) {
  const [resumeDocument, setResumeDocument] = useState(initialDocument);
  const [latex, setLatex] = useState<string | null>(null);
  const [errorsExpanded, setErrorsExpanded] = useState(true);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const currentLatex = latex ?? resumeDocument.latexSource;
  const hasUnsavedChanges =
    latex !== null && latex !== resumeDocument.latexSource;

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
      const updatedResume = await saveResumeLatexAction(
        resumeDocument.id,
        latex
      );
      setResumeDocument((current) => ({
        ...current,
        title: updatedResume.title,
        latexSource: updatedResume.latex_source,
      }));
      setLatex(null);
    } catch {
      setSaveError("Failed to save");
    } finally {
      setIsSaving(false);
    }
  }, [hasUnsavedChanges, latex, resumeDocument.id]);

  const handleDownload = useCallback(async () => {
    if (!currentLatex.trim()) {
      return;
    }

    try {
      const pdfBytes = await compileLatexDocument(currentLatex);
      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], {
        type: "application/pdf",
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${resumeDocument.title}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download compile failed:", error);
    }
  }, [currentLatex, resumeDocument.title]);

  const handleTitleRename = useCallback(
    async (newTitle: string) => {
      try {
        setIsSaving(true);
        setSaveError(null);
        const updatedResume = await renameResumeAction(
          resumeDocument.id,
          newTitle
        );
        setResumeDocument((current) => ({
          ...current,
          title: updatedResume.title,
        }));
      } catch {
        setSaveError("Failed to rename");
      } finally {
        setIsSaving(false);
      }
    },
    [resumeDocument.id]
  );

  const breadcrumb: ToolbarBreadcrumb[] = [
    { kind: "link", label: "Dashboard", href: "/dashboard" },
  ];

  if (parentTitle) {
    breadcrumb.push({ kind: "text", label: parentTitle });
  }

  breadcrumb.push({
    kind: "editable",
    label: resumeDocument.title,
    onRename: handleTitleRename,
  });

  return (
    <>
      <Toolbar
        navigation={<ToolbarBreadcrumbs items={breadcrumb} />}
        user={user}
        status={
          compileStatus !== "idle" ? (
            compileStatus === "compiling" ? (
              <StatusPill variant="compiling" />
            ) : compileStatus === "error" ? (
              <StatusPill
                variant="error"
                errorCount={compileErrors.length}
                onClick={() => setErrorsExpanded(!errorsExpanded)}
              />
            ) : (
              <StatusPill variant="compiled" compiledAgo={compiledAgo} />
            )
          ) : null
        }
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
      />

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
    </>
  );
}
