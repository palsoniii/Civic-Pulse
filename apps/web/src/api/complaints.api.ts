import apiClient from './client';
import type {
  Complaint,
  ComplaintHistory,
  ComplaintStatus,
  ComplaintCategory,
  Priority,
} from '@/types';

export interface CreateComplaintInput {
  category: ComplaintCategory;
  description: string;
  lat: number;
  lng: number;
  priority?: Priority;
}

export interface ListComplaintsParams {
  page?: number;
  status?: ComplaintStatus | '';
  category?: ComplaintCategory | '';
  search?: string;
}

export interface PaginatedComplaints {
  data: Complaint[];
  total: number;
  page: number;
}

export const complaintsApi = {
  create: (data: CreateComplaintInput) =>
    apiClient.post<Complaint>('/complaints', data),

  getAll: (params?: ListComplaintsParams) =>
    apiClient.get<PaginatedComplaints | Complaint[]>('/complaints', { params }),

  getMy: (params?: { page?: number }) =>
    apiClient.get<PaginatedComplaints | Complaint[]>('/complaints/my', { params }),

  getById: (id: string) =>
    apiClient.get<Complaint>(`/complaints/${id}`),

  updateStatus: (id: string, data: { status: ComplaintStatus; reason?: string }) =>
    apiClient.patch<Complaint>(`/complaints/${id}/status`, data),

  getHistory: (id: string) =>
    apiClient.get<ComplaintHistory[]>(`/complaints/${id}/history`),
};
