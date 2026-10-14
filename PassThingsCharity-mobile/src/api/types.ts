export type SessionUser = {
  id: string;
  username: string;
  phone: string;
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

export type StationRef = { _id?: string; name?: string; address?: string; isActive?: boolean } | null;

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
};

export type PointsPayload = {
  totalPoints: number;
  transactions: { _id: string; points: number; type: string; description?: string; createdAt?: string }[];
};
