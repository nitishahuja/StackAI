import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type File = {
  resource_id: string;
  inode_type: "directory" | "file";
  inode_path: { path: string };
  indexed_at: string | null;
};

type Props = {
  file: File;
  onOpen?: () => void;
  onImport?: () => void;
  onRemove?: () => void;
};

export default function FileItem({ file, onOpen, onImport, onRemove }: Props) {
  const isFolder = file.inode_type === "directory";
  const isIndexed = !!file.indexed_at;

  return (
    <div className="flex items-center justify-between border rounded-md p-3 hover:shadow-sm transition">
      <div className="flex items-center gap-3">
        <span
          className="text-lg cursor-pointer"
          onClick={isFolder ? onOpen : undefined}
        >
          {isFolder ? "📁" : "📄"} {file.inode_path.path}
        </span>
        <Badge variant={isIndexed ? "default" : "secondary"}>
          {isIndexed ? "Indexed" : "Not Indexed"}
        </Badge>
      </div>
      <div className="flex gap-2">
        {isIndexed ? (
          <Button variant="destructive" size="sm" onClick={onRemove}>
            Remove
          </Button>
        ) : (
          <Button variant="default" size="sm" onClick={onImport}>
            Import
          </Button>
        )}
      </div>
    </div>
  );
}
