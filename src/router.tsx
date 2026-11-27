import { QueryClient, dehydrate, hydrate } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  // One client per request: a module-level QueryClient leaks cached data between SSR requests.
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    // Lets Query own freshness; set caching defaults on the QueryClient, not the router.
    defaultPreloadStaleTime: 0,
    dehydrate: () => ({ queryCache: JSON.stringify(dehydrate(queryClient, {
      shouldDehydrateMutation: () => false,
      shouldDehydrateQuery: (query) => query.queryKey[0] === 'catalog' && query.state.status === 'success',
    })) }),
    hydrate: (data: { queryCache?: string }) => {
      if (data.queryCache) hydrate(queryClient, JSON.parse(data.queryCache));
    },
  });

  return router;
};
