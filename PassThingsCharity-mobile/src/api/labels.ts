import type { CampaignItemRow, OrgRef } from "@/api/types";

export function orgName(org: OrgRef) {
  if (typeof org === "object" && org?.name) return org.name;
  return "Tổ chức";
}

export function unitSpoken(unit: string | undefined) {
  if (unit === "KG") return "Kg";
  if (unit === "BOX") return "Thùng";
  if (unit === "PACK") return "Lốc/Gói";
  if (unit === "PAIR") return "Đôi/Bộ";
  if (unit === "PIECE") return "Cái/Chiếc";
  return unit || "đơn vị";
}

export function unitLabel(unit: string | undefined) {
  if (unit === "KG") return "kg";
  if (unit === "PAIR") return "đôi";
  if (unit === "BOX") return "thùng";
  if (unit === "PACK") return "gói";
  if (unit === "PIECE") return "cái";
  return "đơn vị";
}

export function itemName(item: CampaignItemRow) {
  if (typeof item.itemTypeId === "object" && item.itemTypeId?.name) return item.itemTypeId.name;
  return "Vật phẩm";
}

export function itemUnit(item: CampaignItemRow) {
  if (typeof item.itemTypeId === "object") return unitLabel(item.itemTypeId?.unit);
  return "đơn vị";
}

function dayStart(value: string | undefined) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

export function hasStarted(campaign: { startDate?: string }) {
  const start = dayStart(campaign.startDate);
  if (start === null) return true;
  const today = new Date();
  return start <= new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
}

export function campaignPhase(campaign: { status: string; startDate?: string }) {
  if (campaign.status === "ACTIVE") return "open" as const;
  if (campaign.status === "PUBLISHED") return hasStarted(campaign) ? "open" as const : "soon" as const;
  return "closed" as const;
}

export function acceptsDonations(campaign: { status: string; startDate?: string; endDate?: string }) {
  return campaignPhase(campaign) === "open";
}

export function donorLabel(campaign: { status: string; startDate?: string }) {
  const phase = campaignPhase(campaign);
  if (phase === "open") return "Đang nhận đồ";
  if (phase === "soon") return "Sắp mở";
  if (campaign.status === "COMPLETED") return "Đã kết thúc";
  if (campaign.status === "CANCELLED") return "Đã hủy";
  if (campaign.status === "DRAFT") return "Bản nháp";
  return campaign.status;
}

export function statusLabel(status: string) {
  if (status === "PUBLISHED" || status === "ACTIVE") return "Đang nhận đồ";
  if (status === "COMPLETED") return "Đã kết thúc";
  if (status === "CANCELLED") return "Đã hủy";
  if (status === "DRAFT") return "Bản nháp";
  return status;
}

export function formatDay(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const day = `${date.getDate()}`.padStart(2, "0");
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  return `${day}/${month}/${date.getFullYear()}`;
}
