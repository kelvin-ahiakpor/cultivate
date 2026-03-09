/**
 * use-systems.ts
 * SWR hook for fetching a farmer's registered farming systems.
 * Pass disabled=true in demo mode to make zero API requests.
 */
import useSWR from "swr";

export interface FarmerSystemItem {
  id: string;
  name: string;
  type: string;
  description: string;
  status: "ACTIVE" | "PENDING_SETUP" | "INACTIVE";
  purchaseDate: string;
  installationDate?: string | null;
  warrantyUntil?: string | null;
  specifications?: {
    size?: string;
    capacity?: string;
    material?: string;
    [key: string]: string | undefined;
  } | null;
}

interface SystemsResponse {
  systems: FarmerSystemItem[];
  isLoading: boolean;
  mutate: () => void;
}

const fetcher = (url: string) => fetch(url).then(r => r.json());

export function useSystems(disabled?: boolean): SystemsResponse {
  const key = disabled ? null : "/api/systems";
  const { data, isLoading, mutate } = useSWR(key, fetcher);

  return {
    systems: data?.data?.systems ?? [],
    isLoading,
    mutate,
  };
}
