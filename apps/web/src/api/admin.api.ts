import apiClient from './client';
import type { DashboardSummary, Department, SlaViolation, Complaint, ComplaintStatus, AssignmentRecord } from '@/types';

export interface CreateDepartmentPayload {
  name: string;
  description?: string;
}

export const adminApi = {
  getDashboardSummary: () =>
    apiClient.get<DashboardSummary>('/admin/dashboard/summary'),

  getDepartments: () =>
    apiClient.get<Department[]>('/admin/departments'),

  getAssignments: () =>
    apiClient.get<AssignmentRecord[]>('/admin/assignments'),

  createDepartment: (data: CreateDepartmentPayload) =>
    apiClient.post<Department>('/admin/departments', data),

  getSlaViolations: () =>
    apiClient.get<SlaViolation[]>('/admin/sla/violations'),

  assignComplaint: (complaintId: string, departmentId: string) =>
    apiClient.post<Complaint>(`/admin/complaints/${complaintId}/assign`, { departmentId }),

  /** Admin uses the same complaints endpoint as citizens */
  getAllComplaints: (params?: { page?: number; status?: ComplaintStatus | '' }) =>
    apiClient.get<Complaint[]>('/complaints', { params }),
};
