import { useDriveResources } from "@/hooks/useDriveResources";

export default function DrivePicker() {
  const connectionId = "6a023d47-efe4-415e-8220-22dc80c6f2ea"; // temp
  const { resources, isLoading } = useDriveResources(connectionId);

 {resources.map((res: any) => (
  <FileItem
    key={res.resource_id}
    file={res}
    onOpen={() => {
      if (res.inode_type === "directory") {
        // You’ll handle this in Step 6
        console.log("Open folder", res.resource_id)
      }
    }}
    onImport={() => {
      // You’ll hook this up in Step 7
      console.log("Import", res.resource_id)
    }}
    onRemove={() => {
      console.log("Remove", res.resource_id)
    }}
  />
))}
