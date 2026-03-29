import EditorPageClient from "@/components/editor/EditorPageClient";
import { requireUserDisplayInfo } from "@/lib/auth";

export default async function EditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [user, { id }] = await Promise.all([requireUserDisplayInfo(), params]);

  return <EditorPageClient resumeId={id} user={user} />;
}
