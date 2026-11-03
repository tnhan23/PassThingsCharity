import { api, uploadImages, type UploadFile } from "@/api/client";
import type {
  AssignmentRow,
  CampaignDetail,
  CampaignSummary,
  ContributionRow,
  PointsPayload,
  ReliefRow,
  ReliefSummaryItem,
  StationRow,
  TaskRow,
  TransferRow,
  ShiftScheduleRow,
  NoticeRow,
} from "@/api/types";

type Token = string;
type Body = Record<string, unknown>;

function withToken(token: Token, method: string, body?: Body) {
  return { method, body, token };
}

export function resultText(data: unknown) {
  if (data && typeof data === "object" && "message" in data && typeof data.message === "string") {
    return data.message;
  }
  const text = JSON.stringify(data);
  return text.length > 320 ? `${text.slice(0, 320)}…` : text;
}

export const backend = {
  login(username: string, password: string) {
    return api<{ token: string; user: { id: unknown; username: string; phone?: string | null; email?: string | null; fullName?: string | null; avatarUrl?: string | null; role?: string } }>("/auth/login", {
      method: "POST",
      body: { username, password },
    });
  },
  register(body: { email: string; username: string; password: string; fullname: string; phone: string }) {
    return api<{ message: string }>("/auth/register", { method: "POST", body });
  },
  changePassword(token: Token, body: { currentPassword: string; newPassword: string }) {
    return api<{ message: string }>("/auth/change-password", withToken(token, "PATCH", body));
  },
  adminResetPassword(token: Token, userId: string, newPassword: string) {
    return api<{ message: string }>(`/auth/reset-password/${userId}`, withToken(token, "PATCH", { newPassword }));
  },

  listUsers(token: Token, role?: string) {
    const query = role ? `?role=${encodeURIComponent(role)}` : "";
    return api<{ data: { _id: string; username: string; fullName?: string; phone?: string; status?: string }[] }>(
      `/users${query}`,
      { token },
    );
  },
  deleteAccount(token: Token, userId: string, password: string) {
    return api<{ message: string }>(`/users/${userId}`, withToken(token, "DELETE", { password }));
  },
  setUserStatus(token: Token, userId: string, status: string) {
    return api<{ message: string }>(`/users/${userId}/status`, withToken(token, "PATCH", { status }));
  },
  createUser(token: Token, body: Body) {
    return api<{ message: string }>("/users", withToken(token, "POST", body));
  },
  updateProfile(token: Token, body: Body) {
    return api<{ message: string; user: { username: string; phone: string; email?: string; fullName?: string; avatarUrl?: string; role?: string } }>(
      "/users/me/profile",
      withToken(token, "PATCH", body),
    );
  },
  assignStationManager(token: Token, userId: string) {
    return api<{ message: string }>(`/users/${userId}/station-manager`, withToken(token, "PATCH", {}));
  },

  listOrganizations(token: Token) {
    return api<{ data: { _id: string; name: string; code?: string; isVerified?: boolean }[] }>("/organizations", { token });
  },
  getOrganization(token: Token, id: string) {
    return api<{ organization: { name: string; code?: string; address?: string } }>(`/organizations/${id}`, { token });
  },
  createOrganization(token: Token, body: Body) {
    return api<{ message: string }>("/organizations", withToken(token, "POST", body));
  },
  updateOrganization(token: Token, id: string, body: Body) {
    return api<{ message: string }>(`/organizations/${id}`, withToken(token, "PATCH", body));
  },
  deleteOrganization(token: Token, id: string) {
    return api<{ message: string }>(`/organizations/${id}`, withToken(token, "DELETE"));
  },
  createStationForOrganization(token: Token, organizationId: string, body: Body) {
    return api<{ message: string }>(`/organizations/${organizationId}/stations`, withToken(token, "POST", body));
  },

  listStations(token: Token) {
    return api<{ data: StationRow[] }>("/stations", { token });
  },
  getStation(token: Token, id: string) {
    return api<{ station: StationRow }>(`/stations/${id}`, { token });
  },
  updateStation(token: Token, id: string, body: Body) {
    return api<{ message: string }>(`/stations/${id}`, withToken(token, "PATCH", body));
  },
  deleteStation(token: Token, id: string) {
    return api<{ message: string }>(`/stations/${id}`, withToken(token, "DELETE"));
  },
  createStation(token: Token, body: Body) {
    return api<{ message: string }>("/stations", withToken(token, "POST", body));
  },
  assignStaff(token: Token, stationId: string, userId: string) {
    return api<{ message: string }>(`/stations/${stationId}/staff/${userId}`, withToken(token, "POST", {}));
  },
  removeStaffAssignment(token: Token, stationId: string, userId: string) {
    return api<{ message: string }>(`/stations/${stationId}/staff/${userId}`, withToken(token, "DELETE"));
  },

  createStaff(token: Token, stationId: string, body: Body) {
    return api<{ message: string }>(`/stationmanager/${stationId}/staff`, withToken(token, "POST", body));
  },
  listStaff(token: Token, stationId: string) {
    return api<{ data: { _id?: string; username?: string; fullName?: string }[] }>(`/stationmanager/${stationId}/staff`, { token });
  },
  removeStaff(token: Token, stationId: string, staffId: string) {
    return api<{ message: string }>(`/stationmanager/${stationId}/staff/${staffId}`, withToken(token, "DELETE"));
  },

  approveOrganization(token: Token, id: string) {
    return api<{ message: string }>(`/admin/organizations/${id}/approve`, withToken(token, "PATCH", {}));
  },
  approveStation(token: Token, id: string) {
    return api<{ message: string }>(`/admin/stations/${id}/approve`, withToken(token, "PATCH", {}));
  },

  listCategories() {
    return api<{ categories: { _id: string; name: string }[] }>("/catalog/categories");
  },
  createCategory(token: Token, body: Body) {
    return api<{ message: string }>("/catalog/categories", withToken(token, "POST", body));
  },
  updateCategory(token: Token, id: string, body: Body) {
    return api<{ message: string }>(`/catalog/categories/${id}`, withToken(token, "PATCH", body));
  },
  deleteCategory(token: Token, id: string) {
    return api<{ message: string }>(`/catalog/categories/${id}`, withToken(token, "DELETE"));
  },
  listItemTypes() {
    return api<{ itemTypes: { _id: string; name: string; unit?: string }[] }>("/catalog/items");
  },
  createItemType(token: Token, body: Body) {
    return api<{ message: string }>("/catalog/items", withToken(token, "POST", body));
  },
  updateItemType(token: Token, id: string, body: Body) {
    return api<{ message: string }>(`/catalog/items/${id}`, withToken(token, "PATCH", body));
  },
  deleteItemType(token: Token, id: string) {
    return api<{ message: string }>(`/catalog/items/${id}`, withToken(token, "DELETE"));
  },

  listCampaigns(query?: { status?: string; search?: string; organizationId?: string }) {
    const params = new URLSearchParams();
    if (query?.status) params.set("status", query.status);
    if (query?.search) params.set("search", query.search);
    if (query?.organizationId) params.set("organizationId", query.organizationId);
    const suffix = params.toString();
    return api<{ campaigns: CampaignSummary[] }>(`/campaigns${suffix ? `?${suffix}` : ""}`);
  },
  getCampaign(id: string) {
    return api<CampaignDetail>(`/campaigns/${id}`);
  },
  createCampaign(token: Token, body: Body) {
    return api<{ message: string }>("/campaigns", withToken(token, "POST", body));
  },
  updateCampaign(token: Token, id: string, body: Body) {
    return api<{ message: string }>(`/campaigns/${id}`, withToken(token, "PATCH", body));
  },
  updateCampaignStatus(token: Token, id: string, status: string) {
    return api<{ message: string }>(`/campaigns/${id}/status`, withToken(token, "PATCH", { status }));
  },
  addCampaignItem(token: Token, campaignId: string, body: Body) {
    return api<{ message: string }>(`/campaigns/${campaignId}/items`, withToken(token, "POST", body));
  },
  removeCampaignItem(token: Token, campaignId: string, itemId: string) {
    return api<{ message: string }>(`/campaigns/${campaignId}/items/${itemId}`, withToken(token, "DELETE"));
  },
  assignCampaignStation(token: Token, campaignId: string, stationId: string) {
    return api<{ message: string }>(`/campaigns/${campaignId}/stations`, withToken(token, "POST", { stationId }));
  },
  removeCampaignStation(token: Token, campaignId: string, stationId: string) {
    return api<{ message: string }>(`/campaigns/${campaignId}/stations/${stationId}`, withToken(token, "DELETE"));
  },
  campaignStations(campaignId: string, coords?: { userLat: string; userLng: string }) {
    const query = coords ? `?userLat=${encodeURIComponent(coords.userLat)}&userLng=${encodeURIComponent(coords.userLng)}` : "";
    return api<{ totalStations: number; stations: { _id?: string; name?: string; address?: string; distanceKm?: number }[] }>(
      `/campaigns/${campaignId}/stations${query}`,
    );
  },
  listContributions(token: Token) {
    return api<{ data: ContributionRow[] }>("/contributions?limit=100", { token });
  },
  listTransfers(token: Token) {
    return api<{ data: TransferRow[] }>("/transfers?limit=100", { token });
  },
  listRelief(token: Token) {
    return api<{ data: ReliefRow[] }>("/relief?limit=100", { token });
  },
  reliefSummary(token: Token, campaignId: string) {
    return api<{ totalDistributionBatches: number; itemsSummary: ReliefSummaryItem[] }>(`/relief/summary/${campaignId}`, { token });
  },
  listTasks(token: Token, stationId?: string) {
    const station = stationId ? `&stationId=${encodeURIComponent(stationId)}` : "";
    return api<{ data: TaskRow[] }>(`/workforce/tasks?limit=100${station}`, { token });
  },
  myAssignments(token: Token) {
    return api<{ data: AssignmentRow[] }>("/workforce/tasks/me", { token });
  },
  registerVolunteer(token: Token, campaignId: string) {
    return api<{ message: string }>("/workforce/volunteers/register", withToken(token, "POST", { campaignId }));
  },
  applyTask(token: Token, taskId: string) {
    return api<{ message: string }>(`/workforce/tasks/${taskId}/apply`, withToken(token, "POST", {}));
  },
  checkInTask(token: Token, assignmentId: string) {
    return api<{ message: string }>("/workforce/tasks/check-in", withToken(token, "POST", { assignmentId }));
  },
  checkOutTask(token: Token, assignmentId: string, body?: Body) {
    return api<{ message: string; gamification?: { pointsAwarded?: number } }>("/workforce/tasks/check-out", withToken(token, "POST", { assignmentId, ...body }));
  },
  forgotPassword(email: string) {
    return api<{ message: string }>("/auth/forgot-password", { method: "POST", body: { email } });
  },
  resetPassword(body: { email: string; otp: string; newPassword: string }) {
    return api<{ message: string }>("/auth/reset-password", { method: "POST", body });
  },
  rejectOrganization(token: Token, id: string, rejectionReason: string) {
    return api<{ message: string }>(`/admin/organizations/${id}/reject`, withToken(token, "PATCH", { rejectionReason }));
  },
  createStationManager(token: Token, stationId: string, body: Body) {
    return api<{ message: string }>(`/stations/${stationId}/manager`, withToken(token, "POST", body));
  },
  assignStationManagerByContact(token: Token, stationId: string, identifier: string) {
    return api<{ message: string }>(`/stations/${stationId}/manager`, withToken(token, "PATCH", { identifier }));
  },
  removeStationManager(token: Token, stationId: string) {
    return api<{ message: string }>(`/stations/${stationId}/manager`, withToken(token, "DELETE"));
  },
  updateStaff(token: Token, stationId: string, staffId: string, body: Body) {
    return api<{ message: string }>(`/stationmanager/${stationId}/staff/${staffId}`, withToken(token, "PATCH", body));
  },
  lookupDonor(token: Token, q: string) {
    return api<{ data: { _id: string; fullName?: string; phone?: string; username?: string }[] }>(
      `/contributions/lookup?q=${encodeURIComponent(q)}`,
      { token },
    );
  },
  createContribution(token: Token, body: Body) {
    return api<{ message: string }>("/contributions", withToken(token, "POST", body));
  },
  getContribution(token: Token, id: string) {
    return api<unknown>(`/contributions/${id}`, { token });
  },
  updateContributionStatus(token: Token, id: string, body: Body) {
    return api<{ message: string }>(`/contributions/${id}/status`, withToken(token, "PATCH", body));
  },
  addContributionImages(token: Token, id: string, imageUrls: string[]) {
    return api<{ message: string }>(`/contributions/${id}/images`, withToken(token, "POST", { imageUrls }));
  },
  uploadContributionImages(token: Token, files: UploadFile[]) {
    return uploadImages<{ imageUrls: string[] }>("/contributions/upload-images", token, files);
  },
  uploadPersonalImages(token: Token, files: UploadFile[]) {
    return uploadImages<{ imageUrls: string[] }>("/uploads/images", token, files);
  },
  createTransfer(token: Token, body: Body) {
    return api<{ message: string }>("/transfers", withToken(token, "POST", body));
  },
  getTransfer(token: Token, id: string) {
    return api<unknown>(`/transfers/${id}`, { token });
  },
  updateTransferStatus(token: Token, id: string, body: Body) {
    return api<{ message: string }>(`/transfers/${id}/status`, withToken(token, "PATCH", body));
  },
  createRelief(token: Token, body: Body) {
    return api<{ message: string }>("/relief", withToken(token, "POST", body));
  },
  getRelief(token: Token, id: string) {
    return api<unknown>(`/relief/${id}`, { token });
  },
  updateReliefStatus(token: Token, id: string, body: Body) {
    return api<{ message: string }>(`/relief/${id}/status`, withToken(token, "PATCH", body));
  },
  myVolunteerRegistrations(token: Token) {
    return api<unknown>("/workforce/volunteers/me", { token });
  },
  campaignVolunteers(token: Token, campaignId: string) {
    return api<unknown>(`/workforce/volunteers/campaign/${campaignId}`, { token });
  },
  updateVolunteerStatus(token: Token, id: string, body: Body) {
    return api<{ message: string }>(`/workforce/volunteers/${id}/status`, withToken(token, "PATCH", body));
  },
  myTaskApplications(token: Token) {
    return api<unknown>("/workforce/tasks/applications/me", { token });
  },
  taskApplications(token: Token, taskId: string) {
    return api<unknown>(`/workforce/tasks/${taskId}/applications`, { token });
  },
  reviewTaskApplication(token: Token, id: string, body: Body) {
    return api<{ message: string }>(`/workforce/tasks/applications/${id}/review`, withToken(token, "PATCH", body));
  },
  createTask(token: Token, body: Body) {
    return api<{ message: string }>("/workforce/tasks", withToken(token, "POST", body));
  },
  getTask(token: Token, id: string) {
    return api<unknown>(`/workforce/tasks/${id}`, { token });
  },
  updateTask(token: Token, id: string, body: Body) {
    return api<{ message: string }>(`/workforce/tasks/${id}`, withToken(token, "PATCH", body));
  },
  assignTask(token: Token, body: Body) {
    return api<{ message: string }>("/workforce/tasks/assign", withToken(token, "POST", body));
  },

  listShiftTemplates(token: Token, stationId: string) {
    return api<{ data: { _id: string; name: string; startTime: string; endTime: string; requiredStaff?: number; description?: string }[] }>(
      `/shiftstations/${stationId}/shift-templates`,
      { token },
    );
  },
  createShiftTemplate(token: Token, stationId: string, body: Body) {
    return api<{ message: string }>(`/shiftstations/${stationId}/shift-templates`, withToken(token, "POST", body));
  },
  listShiftSchedules(token: Token, stationId: string, date?: string) {
    const query = date ? `?date=${encodeURIComponent(date)}` : "";
    return api<{ data: ShiftScheduleRow[] }>(`/shiftstations/${stationId}/schedules${query}`, { token });
  },
  createShiftSchedule(token: Token, stationId: string, body: Body) {
    return api<{ message: string }>(`/shiftstations/${stationId}/schedules`, withToken(token, "POST", body));
  },
  checkInShift(token: Token, scheduleId: string) {
    return api<{ message: string }>(`/shiftstations/schedules/${scheduleId}/check-in`, withToken(token, "POST", {}));
  },
  checkOutShift(token: Token, scheduleId: string) {
    return api<{ message: string }>(`/shiftstations/schedules/${scheduleId}/check-out`, withToken(token, "POST", {}));
  },
  listStationStaff(token: Token, stationId: string) {
    return api<{ data: { _id: string; fullName?: string; username?: string }[] }>(`/stationmanager/${stationId}/staff`, { token });
  },

  myNotifications(token: Token) {
    return api<{ unreadCount: number; data: NoticeRow[] }>("/notifications/me", { token });
  },
  sendNotification(token: Token, body: Body) {
    return api<{ message: string }>("/notifications", withToken(token, "POST", body));
  },
  markNotificationRead(token: Token, id: string) {
    return api<{ message: string }>(`/notifications/${id}/read`, withToken(token, "PATCH", {}));
  },
  markAllNotificationsRead(token: Token) {
    return api<{ message: string }>("/notifications/me/read-all", withToken(token, "PATCH", {}));
  },

  myPoints(token: Token) {
    return api<PointsPayload>("/gamification/points/me", { token });
  },
  userPoints(token: Token, userId: string) {
    return api<PointsPayload>(`/gamification/points/user/${userId}`, { token });
  },
  awardPoints(token: Token, body: Body) {
    return api<{ message: string }>("/gamification/points/award", withToken(token, "POST", body));
  },
  listAchievements() {
    return api<{ achievements: { _id: string; title: string; criteriaType?: string; criteriaValue?: number }[] }>("/gamification/achievements");
  },
  createAchievement(token: Token, body: Body) {
    return api<{ message: string }>("/gamification/achievements", withToken(token, "POST", body));
  },
  myAchievements(token: Token) {
    return api<{ unlockedAchievements: { achievementId?: { title?: string } | string }[] }>("/gamification/achievements/me", { token });
  },
  userAchievements(token: Token, userId: string) {
    return api<{ unlockedAchievements: { achievementId?: { title?: string } | string }[] }>(
      `/gamification/achievements/user/${userId}`,
      { token },
    );
  },
  myCertificates(token: Token) {
    return api<{ certificates: { title?: string; certificateType?: string }[] }>("/gamification/certificates/me", { token });
  },
  userCertificates(token: Token, userId: string) {
    return api<{ certificates: { title?: string; certificateType?: string }[] }>(`/gamification/certificates/user/${userId}`, { token });
  },
  issueCertificate(token: Token, body: Body) {
    return api<{ message: string }>("/gamification/certificates", withToken(token, "POST", body));
  },
};
