import useSWR from "swr";

const API_URL = process.env.NEXT_PUBLIC_STACK_AI_API_URL;
const TOKEN = process.env.NEXT_PUBLIC_STACK_AI_TOKEN;

const fetcher = (url: string) =>
  fetch(url, {
    headers: {
      Authorization: `Bearer ${TOKEN}`,
    },
  }).then((res) => res.json());

export const useDriveResources = (
  connectionId: string,
  resourceId?: string
) => {
  const endpoint = resourceId
    ? `${API_URL}/connections/${connectionId}/resources/children?resource_id=${resourceId}`
    : `${API_URL}/connections/${connectionId}/resources/children`;

  const { data, error, isLoading } = useSWR(endpoint, fetcher);

  return {
    resources: data?.data || [],
    isLoading,
    error,
  };
};
