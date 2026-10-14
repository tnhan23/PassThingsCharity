import type { CampaignItemRow, OrgRef } from "@/api/types";

export function orgName(org: OrgRef) {
  if (typeof org === "object" && org?.name) return org.name;
  return "Tổ chức";
}

export function unitLabel(unit: string | undefined) {
  if (unit === "KG") return "kg";
  if (unit === "PAIR") return "đôi";
  if (unit === "BOX") return "thùng";
  if (unit === "PACK") return "gói";
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

export function statusLabel(status: string) {
  if (status === "PUBLISHED") return "Đã phát hành";
  if (status === "ACTIVE") return "Đang nhận";
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
