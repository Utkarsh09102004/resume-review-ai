import { notFound } from "next/navigation";
import EditorWorkspace from "@/components/editor/EditorWorkspace";
import { requireUserDisplayInfo } from "@/lib/auth";
import { getEditorPageData } from "./editor-data";

export default async function EditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [user, pageData] = await Promise.all([
    requireUserDisplayInfo(),
    getEditorPageData(id),
  ]);

  if (!pageData) {
    notFound();
  }

  return (
    <EditorWorkspace
      initialResume={pageData.resume}
      parentResume={pageData.parentResume}
      user={user}
    />
  );
}
