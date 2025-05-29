export async function indexFile(resourceId: string): Promise<void> {
  const response = await fetch(`/api/index/${resourceId}`, {
    method: "POST",
  });
  if (!response.ok) {
    throw new Error("Failed to index file");
  }
}

export async function isFileIndexed(resourceId: string): Promise<boolean> {
  const response = await fetch(`/api/index/status/${resourceId}`);
  if (!response.ok) {
    throw new Error("Failed to fetch index status");
  }
  const data = await response.json();
  return data.isIndexed;
}
