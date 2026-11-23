import { queryOptions } from '@tanstack/react-query';
import { getAdminData, adminQueryKey } from './functions';
export const adminQuery=queryOptions({queryKey:adminQueryKey,queryFn:()=>getAdminData(),staleTime:15000,refetchInterval:30000});
