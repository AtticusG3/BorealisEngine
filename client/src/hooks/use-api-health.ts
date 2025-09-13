import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useApiHealth() {
  return useQuery({
    queryKey: ["api", "health"],
    queryFn: api.health.check,
    refetchInterval: 30000, // Check every 30 seconds
    refetchIntervalInBackground: true,
  });
}
