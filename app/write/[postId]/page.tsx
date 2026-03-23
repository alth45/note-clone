"use client";

import { useParams } from "next/navigation";
import EditorCanvas from "@/components/write/EditorCanvas";

export default function WriteEditorPage() {
    const params = useParams();
    const postId = params.postId as string;
    return <EditorCanvas postId={postId} />;
}