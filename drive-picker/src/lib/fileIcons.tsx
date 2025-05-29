import React from "react";
import {
  FolderIcon,
  FileIcon,
  FileText,
  FileSpreadsheet,
  FileImage,
  FileVideo,
  FileArchive,
  FileAudio,
  FileCode,
  FileJson,
} from "lucide-react";
import type { FileResource } from "@/types";

export function getFileIcon(resource: FileResource): React.ReactNode {
  if (resource.inode_type === "directory") {
    return <FolderIcon className="h-5 w-5 mr-2 text-blue-500/90" />;
  }
  const name = resource.inode_path.path.toLowerCase();
  if (name.endsWith(".pdf"))
    return <FileText className="h-5 w-5 mr-2 text-red-500" />;
  if (name.match(/\.(jpg|jpeg|png|gif|bmp|svg|webp)$/))
    return <FileImage className="h-5 w-5 mr-2 text-yellow-500" />;
  if (name.match(/\.(mp4|mov|avi|mkv|webm)$/))
    return <FileVideo className="h-5 w-5 mr-2 text-purple-500" />;
  if (name.match(/\.(mp3|wav|ogg|flac)$/))
    return <FileAudio className="h-5 w-5 mr-2 text-pink-500" />;
  if (name.match(/\.(xls|xlsx|csv)$/))
    return <FileSpreadsheet className="h-5 w-5 mr-2 text-green-600" />;
  if (name.match(/\.(zip|rar|tar|gz|7z)$/))
    return <FileArchive className="h-5 w-5 mr-2 text-orange-500" />;
  if (name.match(/\.(js|ts|jsx|tsx|py|java|cpp|c|cs|rb|go|php|sh)$/))
    return <FileCode className="h-5 w-5 mr-2 text-blue-400" />;
  if (name.match(/\.(json)$/))
    return <FileJson className="h-5 w-5 mr-2 text-emerald-500" />;
  if (name.match(/\.(txt|md|rtf|log)$/))
    return <FileText className="h-5 w-5 mr-2 text-gray-500" />;
  return <FileIcon className="h-5 w-5 mr-2 text-gray-400" />;
}
