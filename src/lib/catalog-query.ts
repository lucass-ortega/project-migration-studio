import { queryOptions } from "@tanstack/react-query";
import { getCatalog } from "./reservations.functions";

export const catalogQuery = queryOptions({ queryKey: ["catalog"], queryFn: () => getCatalog(), staleTime: 60_000 });
