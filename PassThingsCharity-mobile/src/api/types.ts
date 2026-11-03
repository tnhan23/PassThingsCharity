export type SessionUser = {
  id: string;
  username: string;
  phone: string;
  email?: string;
  fullName?: string;
  avatarUrl?: string;
  role?: string;
};

export type ShiftScheduleRow = {
  _id: string;
  date: string;
  status: string;
  note?: string;
  checkInTime?: string | null;
  checkOutTime?: string | null;
  staffId?: { _id?: string; fullName?: string; username?: string } | string | null;
  templateId?: { name?: string; startTime?: string; endTime?: string } | string;
};

export type NoticeRow = {
  _id: string;
  title: string;
  content: string;
  type?: string;
  isRead?: boolean;
  createdAt?: string;
};

export type OrgRef = { name?: string; code?: string; address?: string; phone?: string } | string;

export type CampaignSummary = {
  _id: string;
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  status: string;
  organizationId: OrgRef;
};

export type ItemTypeRef = { name?: string; unit?: string } | string;

export type CampaignItemRow = {
  _id: string;
  targetQuantity: number;
  currentQuantity: number;
  itemTypeId: ItemTypeRef;
};

export type StationRef = { _id?: string; name?: string; address?: string; isActive?: boolean; distanceKm?: number } | null;

export type CampaignDetail = {
  campaign: CampaignSummary;
  items: CampaignItemRow[];
  stations: StationRef[];
};

export type StationRow = {
  _id: string;
  name: string;
  address: string;
  isActive: boolean;
  latitude?: string;
  longitude?: string;
  openingTime?: string;
  closingTime?: string;
};

export type NamedRef = { _id?: string; name?: string; title?: string; address?: string } | string | null;

export type ContributionRow = {
  _id: string;
  code: string;
  status: string;
  campaignId?: NamedRef;
  stationId?: NamedRef;
};

export type TransferRow = {
  _id: string;
  code: string;
  status: string;
  fromStationId?: NamedRef;
  toStationId?: NamedRef;
};

export type ReliefRow = {
  _id: string;
  code: string;
  status: string;
  recipientName?: string;
  campaignId?: NamedRef;
  stationId?: NamedRef;
};

export type ReliefSummaryItem = {
  itemName?: string;
  unit?: string;
  targetQuantity: number;
  collectedQuantity: number;
  distributedQuantity: number;
  remainingInStock: number;
};

export type TaskRow = {
  _id: string;
  title: string;
  status: string;
  recruitmentStatus?: string;
  rewardPoints?: number;
  stationId?: NamedRef;
  campaignId?: NamedRef;
};

export type AssignmentRow = {
  _id: string;
  status: string;
  taskId?: { title?: string } | string | null;
};

export type PointsPayload = {
  totalPoints: number;
  transactions: { _id: string; points: number; type: string; description?: string; createdAt?: string }[];
};
