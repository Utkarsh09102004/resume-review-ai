import EditorWorkspaceClient from "@/components/editor/EditorWorkspaceClient";
import type { UserDisplayInfo } from "@/lib/auth";
import type { ResumeFromAPI } from "@/lib/resumes";

interface EditorWorkspaceProps {
  initialResume: ResumeFromAPI;
  parentResume: ResumeFromAPI | null;
  user: UserDisplayInfo;
}

export default function EditorWorkspace({
  initialResume,
  parentResume,
  user,
}: EditorWorkspaceProps) {
  return (
    <div className="flex h-screen flex-col">
      <EditorWorkspaceClient
        initialDocument={{
          id: initialResume.id,
          title: initialResume.title,
          latexSource: initialResume.latex_source,
        }}
        parentTitle={parentResume?.title ?? null}
        user={user}
      />
    </div>
  );
}
