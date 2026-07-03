import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { complaintsApi, type ListComplaintsParams, type CreateComplaintInput } from '@/api/complaints.api';
import type { Complaint, ComplaintStatus } from '@/types';

// ── Helper: normalise paginated or plain array response ───────────────────
function toArray(raw: unknown): Complaint[] {
  if (Array.isArray(raw)) return raw as Complaint[];
  if (raw && typeof raw === 'object' && 'data' in (raw as object)) {
    return (raw as { data: Complaint[] }).data;
  }
  return [];
}

export const complaintKeys = {
  all: ['complaints'] as const,
  lists: () => [...complaintKeys.all, 'list'] as const,
  list: (params: ListComplaintsParams) => [...complaintKeys.lists(), params] as const,
  mine: (page?: number) => [...complaintKeys.all, 'mine', page ?? 1] as const,
  detail: (id: string) => [...complaintKeys.all, 'detail', id] as const,
  history: (id: string) => [...complaintKeys.all, 'history', id] as const,
};

export function useComplaints(params?: ListComplaintsParams) {
  return useQuery({
    queryKey: complaintKeys.list(params ?? {}),
    queryFn: async () => {
      const { data } = await complaintsApi.getAll(params);
      return toArray(data);
    },
  });
}

export function useMyComplaints(page = 1) {
  return useQuery({
    queryKey: complaintKeys.mine(page),
    queryFn: async () => {
      const { data } = await complaintsApi.getMy({ page });
      return toArray(data);
    },
  });
}

export function useComplaint(id: string) {
  return useQuery({
    queryKey: complaintKeys.detail(id),
    queryFn: async () => {
      const { data } = await complaintsApi.getById(id);
      return data;
    },
    enabled: !!id,
  });
}

export function useComplaintHistory(id: string) {
  return useQuery({
    queryKey: complaintKeys.history(id),
    queryFn: async () => {
      const { data } = await complaintsApi.getHistory(id);
      return data.map((entry) => ({
        ...entry,
        createdAt: entry.createdAt ?? (entry as { changedAt?: string }).changedAt ?? new Date().toISOString(),
      }));
    },
    enabled: !!id,
  });
}

export function useCreateComplaint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateComplaintInput) => {
      const { data } = await complaintsApi.create(payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: complaintKeys.all });
    },
  });
}

export function useUpdateComplaintStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      status,
      reason,
    }: {
      id: string;
      status: ComplaintStatus;
      reason?: string;
    }) => {
      const { data } = await complaintsApi.updateStatus(id, { status, reason });
      return data;
    },
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: complaintKeys.detail(id) });
      qc.invalidateQueries({ queryKey: complaintKeys.all });
    },
  });
}
