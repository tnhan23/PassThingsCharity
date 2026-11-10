export type SessionUser = {
  id: string;
  username: string;
  phone: string;
  email?: string;
  fullName?: string;
  avatarUrl?: string;
  role?: string;
  stations?: StationRow[];
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

export type CampaignProgress = {
  totalItemTypes: number;
  fulfilledItemTypes: number;
  isFulfilled: boolean;
};

export type CampaignSummary = {
  _id: string;
  title: string;
  description?: string;
  imageUrl?: string | null;
  startDate: string;
  endDate: string;
  status: string;
  organizationId: OrgRef;
  items?: CampaignItemRow[];
  progress?: CampaignProgress;
};

export type ItemTypeRef = { _id?: string; name?: string; unit?: string } | string;

export type CampaignItemRow = {
  _id: string;
  targetQuantity: number;
  currentQuantity: number;
  itemTypeId: ItemTypeRef;
  remainingQuantity?: number;
  progressPercent?: number;
  isFulfilled?: boolean;
};

export type StationRef = {
  _id?: string;
  name?: string;
  address?: string;
  imageUrl?: string | null;
  openingTime?: string;
  closingTime?: string;
  isActive?: boolean;
  latitude?: string | number;
  longitude?: string | number;
  distanceKm?: number;
} | null;

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
  managerId?: string | { _id?: string } | null;
  latitude?: string | number;
  longitude?: string | number;
  openingTime?: string;
  closingTime?: string;
  imageUrl?: string | null;
  distanceKm?: number | null;
  formattedDistance?: string | null;
};

export type NamedRef = { _id?: string; name?: string; title?: string; address?: string } | string | null;

export type ContributionItemRow = {
  itemTypeId?: { _id?: string; name?: string; unit?: string } | string;
  quantity: number;
  unit: string;
  note?: string;
};

export type ContributionRow = {
  _id: string;
  code: string;
  status: string;
  createdAt?: string;
  notes?: string;
  campaignId?: NamedRef;
  stationId?: NamedRef;
};

export type ContributionDetail = {
  contribution: ContributionRow;
  items: ContributionItemRow[];
  images: { imageUrl?: string }[];
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
  imageUrl?: string | null;
  images?: string[];
  notes?: string;
};

export type ReliefSummaryItem = {
  itemName?: string;
  unit?: string;
  targetQuantity: number;
  collectedQuantity: number;
  distributedQuantity: number;
  remainingInStock: number;
};

export type InventoryTransactionRow = {
  _id: string;
  inventoryId?: string;
  stationId?: { _id?: string; name?: string; address?: string } | string;
  itemTypeId?: { _id?: string; name?: string; unit?: string } | string;
  unit: string;
  type: string;
  quantityDelta: number;
  balanceBefore: number;
  balanceAfter: number;
  counterpartyStationId?: { _id?: string; name?: string; address?: string } | string | null;
  campaignId?: { _id?: string; title?: string; status?: string } | string | null;
  performedBy?: { _id?: string; fullName?: string; username?: string } | string | null;
  description: string;
  createdAt: string;
};

export type TaskRow = {
  _id: string;
  title: string;
  description?: string;
  imageUrl?: string | null;
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

export type OrgApplication = {
  _id: string;
  name: string;
  code?: string;
  address?: string;
  phone?: string;
  email?: string;
  description?: string;
  operatingArea?: string;
  idCardNumber?: string;
  evidenceImageUrls?: string[];
  status?: string;
  isVerified?: boolean;
  rejectionReason?: string;
};

export type PointsPayload = {
  totalPoints: number;
  transactions: { _id: string; points: number; type: string; sourceId?: string; description?: string; createdAt?: string }[];
};
