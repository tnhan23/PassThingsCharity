import { router } from "expo-router";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { createElement, useEffect, useMemo, useState, type ChangeEvent } from "react";
import { Platform, ScrollView, Text, View } from "react-native";
import { backend } from "@/api/backend";
import { ApiError } from "@/api/client";
import { pickImage } from "@/api/images";
import { donorLabel, unitSpoken } from "@/api/labels";
import { useSession } from "@/api/session";
import type { ContributionDetail, InventoryTransactionRow, StationRow } from "@/api/types";
import { Badge, Body, Button, Card, Photo, Pill, StatRow, Tap, Title } from "@/components/ui";
import { can, Fold, labelOf, Note, OpsGate, PickList, RoleNote, TextField, useJob, useRole, useRows, type Row } from "@/screens/ops/kit";
import { colors, fonts } from "@/theme";

function line(itemId: string, quantity: string, unit: string) {
  return [{ itemTypeId: itemId, quantity: Number(quantity), unit }];
}

function asPerson(row: Row & { userId?: { _id?: string; fullName?: string; username?: string; phone?: string; email?: string } | string }): Row {
  const person = row.userId && typeof row.userId === "object" ? row.userId : undefined;
  return {
    ...row,
    fullName: row.fullName || person?.fullName || person?.username || "Người dùng",
    username: row.username || person?.username,
    phone: row.phone || person?.phone,
    email: row.email || person?.email,
    ownerId: person?._id || (typeof row.userId === "string" ? row.userId : ""),
  };
}

const reliefNext: Record<string, string[]> = {
  PLANNED: ["IN_PROGRESS", "COMPLETED", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED", "CANCELLED"],
};

function reliefLabel(status: string) {
  if (status === "PLANNED") return "Đã lên kế hoạch";
  if (status === "IN_PROGRESS") return "Đang giao";
  if (status === "COMPLETED") return "Đã giao";
  if (status === "CANCELLED") return "Đã hủy";
  return status;
}

function receiptStatus(status: string) {
  if (status === "ACCEPTED") return "Đã tiếp nhận";
  if (status === "REJECTED") return "Từ chối";
  if (status === "PENDING") return "Chờ xử lý";
  if (status === "COMPLETED") return "Hoàn tất";
  return status;
}

function personName(value: unknown) {
  if (value && typeof value === "object" && "fullName" in value) {
    const person = value as { fullName?: string; username?: string };
    return person.fullName || person.username || "";
  }
  return "";
}

export function IntakeWork() {
  const receipts = useRows((token) => backend.listContributions(token).then((data) => data.data as Row[]));
  const job = useJob();
  const role = useRole();
  const canWrite = can(role, ["ADMIN", "STATION_MANAGER", "STAFF"]);
  const canJudge = can(role, ["ADMIN", "STATION_MANAGER"]);
  const [picked, setPicked] = useState("");
  const [receiptFilter, setReceiptFilter] = useState<"ALL" | "PENDING" | "ACCEPTED" | "REJECTED" | "COMPLETED">("ALL");
  const [detail, setDetail] = useState<ContributionDetail | null>(null);
  const [stamp, setStamp] = useState(0);

  useEffect(() => {
    if (!job.token || !picked) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    backend.getContribution(job.token, picked)
      .then((data) => {
        if (!cancelled) setDetail(data);
      })
      .catch(() => {
        if (!cancelled) setDetail(null);
      });
    return () => {
      cancelled = true;
    };
  }, [job.token, picked, stamp]);

  const visible = receipts.rows?.filter((row) => !String(row.code || "").startsWith("SAMPLE-")) ?? null;
  const filteredReceipts = visible?.filter((row) => receiptFilter === "ALL" || row.status === receiptFilter) ?? null;

  return (
    <OpsGate>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <Title>Tiếp nhận</Title>
        {canWrite ? <Button label="Lập phiếu mới" onPress={() => router.push("/receive/new")} /> : null}
      </View>
      <RoleNote />
      <Note text={receipts.error || job.note} />
      {visible ? (
        <StatRow
          items={[
            { label: "Tổng phiếu", value: visible.length, unit: "phiếu", tone: "ink" },
            { label: "Chờ xử lý", value: visible.filter((row) => row.status === "PENDING").length, unit: "phiếu", tone: "coral" },
            { label: "Đã tiếp nhận", value: visible.filter((row) => row.status === "ACCEPTED").length, unit: "phiếu", tone: "primary" },
          ]}
        />
      ) : null}
      {visible && visible.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          <Pill label={`Tất cả (${visible.length})`} active={receiptFilter === "ALL"} onPress={() => { setReceiptFilter("ALL"); setPicked(""); }} />
          <Pill label={`Chờ xử lý (${visible.filter((row) => row.status === "PENDING").length})`} active={receiptFilter === "PENDING"} onPress={() => { setReceiptFilter("PENDING"); setPicked(""); }} />
          <Pill label={`Đã tiếp nhận (${visible.filter((row) => row.status === "ACCEPTED").length})`} active={receiptFilter === "ACCEPTED"} onPress={() => { setReceiptFilter("ACCEPTED"); setPicked(""); }} />
          <Pill label={`Từ chối (${visible.filter((row) => row.status === "REJECTED").length})`} active={receiptFilter === "REJECTED"} onPress={() => { setReceiptFilter("REJECTED"); setPicked(""); }} />
          <Pill label={`Hoàn tất (${visible.filter((row) => row.status === "COMPLETED").length})`} active={receiptFilter === "COMPLETED"} onPress={() => { setReceiptFilter("COMPLETED"); setPicked(""); }} />
        </ScrollView>
      ) : null}
      {filteredReceipts && filteredReceipts.length === 0 && visible?.length ? <Body>Không có phiếu ở trạng thái này.</Body> : null}
      <PickList
        rows={filteredReceipts}
        selected={picked}
        onPick={setPicked}
        detail={(row) => `${receiptStatus(row.status || "")} · ${typeof row.campaignId === "object" ? row.campaignId?.title || "" : ""}`}
        panel={(row) => detail && detail.contribution._id === row._id ? (
          <>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <Badge
                label={receiptStatus(detail.contribution.status)}
                tone={
                  detail.contribution.status === "ACCEPTED"
                    ? "primary"
                    : detail.contribution.status === "REJECTED"
                      ? "danger"
                      : "warning"
                }
              />
              <Body muted>{personName((detail.contribution as { userId?: unknown }).userId) || "Chưa rõ người tặng"}</Body>
            </View>
            <Body muted>{typeof detail.contribution.stationId === "object" ? detail.contribution.stationId?.name || "Trạm" : "Trạm"}</Body>
            <Body muted>{typeof detail.contribution.campaignId === "object" ? detail.contribution.campaignId?.title || "Chiến dịch" : "Chiến dịch"}</Body>
            {detail.contribution.notes ? <Body>{detail.contribution.notes}</Body> : null}
            {detail.items.length === 0 ? <Body>Phiếu chưa có món đồ.</Body> : null}
            {detail.items.map((item, index) => {
              const name = item.itemTypeId && typeof item.itemTypeId === "object" ? item.itemTypeId.name || "Vật phẩm" : "Vật phẩm";
              return (
                <View
                  key={`${name}-${index}`}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                    paddingVertical: 6,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.hairline,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: fonts.semibold, fontSize: 15, color: colors.ink }}>{name}</Text>
                    {item.note ? <Body muted>{item.note}</Body> : null}
                  </View>
                  <Badge label={`${item.quantity} ${unitSpoken(item.unit)}`} tone="primary" />
                </View>
              );
            })}
            {detail.images.filter((image) => image.imageUrl).map((image) => (
              <Photo key={image.imageUrl} uri={image.imageUrl || ""} height={160} radius={16} />
            ))}
            {detail.images.length === 0 ? <Body muted>Phiếu này chưa có ảnh.</Body> : null}
            {canJudge ? (
              <View style={{ gap: 8 }}>
                <Button label="Đã tiếp nhận" onPress={() => void job.run((token) => backend.updateContributionStatus(token, row._id, { status: "ACCEPTED" })).then((ok) => { if (!ok) return false; receipts.reload(); setStamp((value) => value + 1); return true; })} />
                <Button label="Chờ xử lý" tone="ghost" onPress={() => void job.run((token) => backend.updateContributionStatus(token, row._id, { status: "PENDING" })).then((ok) => { if (!ok) return false; receipts.reload(); setStamp((value) => value + 1); return true; })} />
                <Button label="Từ chối" tone="danger" onPress={() => void job.run((token) => backend.updateContributionStatus(token, row._id, { status: "REJECTED" })).then((ok) => { if (!ok) return false; receipts.reload(); setStamp((value) => value + 1); return true; })} />
              </View>
            ) : <Body muted>Nhân viên xem phiếu. Trưởng trạm đổi trạng thái.</Body>}
          </>
        ) : <Body muted>Đang tải phiếu.</Body>}
      />
    </OpsGate>
  );
}

type StockLine = {
  _id: string;
  quantity: number;
  reservedQuantity?: number;
  availableQuantity?: number;
  unit: string;
  stationId?: { _id?: string; name?: string; address?: string } | string;
  itemTypeId?: { _id?: string; name?: string } | string;
};

function refId(value: StockLine["itemTypeId"]) {
  if (!value) return "";
  return typeof value === "string" ? value : value._id || "";
}

function refName(value: StockLine["itemTypeId"], fallback: string) {
  if (!value || typeof value === "string") return fallback;
  return value.name || fallback;
}

function SelectField({
  label,
  placeholder,
  selectedId,
  rows,
  onSelect,
  detail,
  icon = "📋",
}: {
  label: string;
  placeholder: string;
  selectedId: string;
  rows: Row[];
  onSelect: (id: string) => void;
  detail?: (row: Row) => string;
  icon?: string;
}) {
  const [open, setOpen] = useState(false);
  const selectedRow = rows.find((r) => r._id === selectedId);

  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontFamily: fonts.bold, fontSize: 14, color: colors.ink }}>{label}</Text>
      <Tap onPress={() => setOpen((v) => !v)} accessibilityLabel={label}>
        <View
          style={{
            backgroundColor: selectedRow ? colors.primarySoft : colors.card,
            borderWidth: 1.5,
            borderColor: colors.primary,
            borderRadius: 12,
            paddingHorizontal: 14,
            paddingVertical: 12,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
          }}
        >
          <View style={{ flex: 1, gap: 2 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Text style={{ fontSize: 16 }}>{selectedRow ? "✓" : icon}</Text>
              <Text
                style={{
                  fontFamily: fonts.bold,
                  fontSize: 15,
                  color: colors.primary,
                }}
              >
                {selectedRow ? labelOf(selectedRow) : placeholder}
              </Text>
            </View>
            <Text
              style={{
                fontFamily: fonts.medium,
                fontSize: 12,
                color: colors.muted,
                paddingLeft: 24,
              }}
            >
              {selectedRow && detail ? detail(selectedRow) : "Chạm vào đây để mở danh sách lựa chọn"}
            </Text>
          </View>
          <Badge
            label={open ? "Thu gọn ▲" : selectedRow ? "Thay đổi ▼" : "Bấm chọn ▼"}
            tone="primary"
          />
        </View>
      </Tap>

      {open ? (
        <Card style={{ marginTop: 2, borderWidth: 1.5, borderColor: colors.primary }}>
          <View style={{ gap: 8, maxHeight: 260 }}>
            <ScrollView nestedScrollEnabled showsVerticalScrollIndicator style={{ maxHeight: 250 }}>
              <View style={{ gap: 6 }}>
                {rows.length === 0 ? (
                  <Body muted>Không có lựa chọn khả dụng.</Body>
                ) : (
                  rows.map((row) => {
                    const isSelected = selectedId === row._id;
                    const subtitle = detail ? detail(row) : "";
                    return (
                      <Tap
                        key={row._id}
                        onPress={() => {
                          onSelect(row._id);
                          setOpen(false);
                        }}
                        style={{
                          padding: 12,
                          borderRadius: 10,
                          borderWidth: isSelected ? 2 : 1,
                          borderColor: isSelected ? colors.primary : colors.hairline,
                          backgroundColor: isSelected ? colors.primarySoft : colors.card,
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 8,
                        }}
                      >
                        <View style={{ flex: 1, gap: 2 }}>
                          <Text
                            style={{
                              fontFamily: fonts.bold,
                              fontSize: 15,
                              color: isSelected ? colors.primary : colors.ink,
                            }}
                          >
                            {labelOf(row)}
                          </Text>
                          {subtitle ? (
                            <Text style={{ fontFamily: fonts.medium, fontSize: 12, color: colors.muted }}>
                              {subtitle}
                            </Text>
                          ) : null}
                        </View>
                        {isSelected ? <Badge label="✓ Đang chọn" tone="primary" /> : null}
                      </Tap>
                    );
                  })
                )}
              </View>
            </ScrollView>
          </View>
        </Card>
      ) : null}
    </View>
  );
}

function MultiSelectField({
  label,
  placeholder,
  selectedIds,
  rows,
  onToggle,
  detail,
  icon = "👥",
}: {
  label: string;
  placeholder: string;
  selectedIds: string[];
  rows: Row[];
  onToggle: (id: string) => void;
  detail?: (row: Row) => string;
  icon?: string;
}) {
  const [open, setOpen] = useState(false);
  const selectedCount = selectedIds.length;

  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text style={{ fontFamily: fonts.bold, fontSize: 14, color: colors.ink }}>{label}</Text>
        {selectedCount > 0 ? (
          <Badge label={`Đã chọn ${selectedCount} người`} tone="primary" />
        ) : null}
      </View>
      <Tap onPress={() => setOpen((v) => !v)} accessibilityLabel={label}>
        <View
          style={{
            backgroundColor: selectedCount > 0 ? colors.primarySoft : colors.card,
            borderWidth: 1.5,
            borderColor: colors.primary,
            borderRadius: 12,
            paddingHorizontal: 14,
            paddingVertical: 12,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
          }}
        >
          <View style={{ flex: 1, gap: 2 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Text style={{ fontSize: 16 }}>{selectedCount > 0 ? "✓" : icon}</Text>
              <Text
                style={{
                  fontFamily: fonts.bold,
                  fontSize: 15,
                  color: colors.primary,
                }}
              >
                {selectedCount > 0 ? `Đội giao hàng: ${selectedCount} người được chọn` : placeholder}
              </Text>
            </View>
            <Text
              style={{
                fontFamily: fonts.medium,
                fontSize: 12,
                color: colors.muted,
                paddingLeft: 24,
              }}
            >
              {selectedCount > 0
                ? "Chạm để xem hoặc thay đổi thành viên đi giao hàng"
                : "Chạm để chọn 1 hoặc nhiều người (nhân viên, tình nguyện viên) đi giao hàng"}
            </Text>
          </View>
          <Badge
            label={open ? "Thu gọn ▲" : selectedCount > 0 ? "Thay đổi ▼" : "Bấm chọn ▼"}
            tone="primary"
          />
        </View>
      </Tap>

      {open ? (
        <Card style={{ marginTop: 2, borderWidth: 1.5, borderColor: colors.primary }}>
          <View style={{ gap: 8, maxHeight: 280 }}>
            <ScrollView nestedScrollEnabled showsVerticalScrollIndicator style={{ maxHeight: 270 }}>
              <View style={{ gap: 6 }}>
                {rows.length === 0 ? (
                  <Body muted>Không có nhân sự hoặc tình nguyện viên nào khả dụng.</Body>
                ) : (
                  rows.map((row) => {
                    const isSelected = selectedIds.includes(row._id);
                    const subtitle = detail ? detail(row) : "";
                    return (
                      <Tap
                        key={row._id}
                        onPress={() => onToggle(row._id)}
                        style={{
                          padding: 12,
                          borderRadius: 10,
                          borderWidth: isSelected ? 2 : 1,
                          borderColor: isSelected ? colors.primary : colors.hairline,
                          backgroundColor: isSelected ? colors.primarySoft : colors.card,
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 8,
                        }}
                      >
                        <View style={{ flex: 1, gap: 2 }}>
                          <Text
                            style={{
                              fontFamily: fonts.bold,
                              fontSize: 14,
                              color: isSelected ? colors.primary : colors.ink,
                            }}
                          >
                            {`${isSelected ? "✓ " : ""}${labelOf(row)}`}
                          </Text>
                          {subtitle ? (
                            <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.muted }}>
                              {subtitle}
                            </Text>
                          ) : null}
                        </View>
                        <Badge
                          label={isSelected ? "Đã chọn ✓" : "+ Chọn"}
                          tone={isSelected ? "primary" : "neutral"}
                        />
                      </Tap>
                    );
                  })
                )}
              </View>
            </ScrollView>
          </View>
        </Card>
      ) : null}
    </View>
  );
}

const shipmentStatusNames: Record<string, string> = {
  ASSIGNED: "Đã phân công",
  DISPATCHED: "Đang đi giao",
  REPORTED: "Đã báo cáo",
  PARTIAL: "Giao một phần",
  RECEIVED: "Đã nhận",
};

export function TransferWork() {
  const transfers = useRows((token) => backend.listTransfers(token).then((data) => data.data as Row[]));
  const campaigns = useRows(async () => (await backend.listCampaigns()).campaigns as Row[]);
  const stations = useRows((token) => backend.listStations(token).then((data) => data.data as Row[]));
  const destinations = useRows((token) => backend.nearbyStations(token).then((data) => data.data as Row[]));
  const job = useJob();
  const role = useRole();
  const { user } = useSession();
  const canWrite = can(role, ["ADMIN", "STATION_MANAGER", "STAFF"]);
  const [picked, setPicked] = useState("");
  const [transferFilter, setTransferFilter] = useState("ALL");
  const [campaignId, setCampaignId] = useState("");
  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");
  const [stock, setStock] = useState<StockLine[]>([]);
  const [stockError, setStockError] = useState("");
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [transportMethod, setTransportMethod] = useState("");
  const [assignSelf, setAssignSelf] = useState(false);
  const [selectedCarrierIds, setSelectedCarrierIds] = useState<string[]>([]);

  const toggleCarrier = (id: string) => {
    setSelectedCarrierIds((prev) => {
      const isSelected = prev.includes(id);
      const next = isSelected ? prev.filter((item) => item !== id) : [...prev, id];
      if (user?.id) {
        setAssignSelf(next.includes(user.id));
      }
      return next;
    });
  };
  const [stationDeliverers, setStationDeliverers] = useState<Array<{
    _id: string;
    name: string;
    fullName?: string;
    username?: string;
    phone?: string;
    roleType: "STAFF" | "VOLUNTEER" | "SELF" | "OTHER";
    roleLabel: string;
  }>>([]);
  const [loadingDeliverers, setLoadingDeliverers] = useState(false);
  const [formOpen, setFormOpen] = useState(false);

  type TransferDetailData = {
    transfer: Row & {
      code?: string;
      status?: string;
      campaignId?: { _id?: string; title?: string } | string;
      fromStationId?: { _id?: string; name?: string; address?: string; phone?: string } | string;
      toStationId?: { _id?: string; name?: string; address?: string; phone?: string } | string;
      responsibleUserId?: { _id?: string; fullName?: string; username?: string; phone?: string; email?: string } | string;
      receivedBy?: { _id?: string; fullName?: string; username?: string; phone?: string; email?: string } | string;
      createdBy?: { _id?: string; fullName?: string; username?: string } | string;
      transportMethod?: string;
      transportNote?: string;
      createdAt?: string;
    };
    items?: Array<{
      _id: string;
      itemTypeId?: { _id?: string; name?: string; unit?: string } | string;
      quantity: number;
      dispatchedQuantity?: number;
      receivedQuantity?: number;
      unit: string;
    }>;
    shipments?: Array<{
      _id: string;
      carrierId?: { _id?: string; fullName?: string; username?: string; phone?: string };
      status: string;
      items?: Array<{ transferItemId: string; quantity: number; receivedQuantity?: number }>;
    }>;
  };

  const [detail, setDetail] = useState<TransferDetailData | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const origins = (role === "ADMIN" ? (stations.rows ?? []) : (user?.stations ?? [])) as Array<StationRow | Row>;
  const arrival = (destinations.rows ?? stations.rows ?? []).filter((row) => row._id !== fromId);

  // Tự động nhận diện trạm xuất nếu nhân sự chỉ có 1 trạm
  useEffect(() => {
    if (origins.length === 1 && !fromId && origins[0]?._id) {
      setFromId(origins[0]._id);
    }
  }, [origins, fromId]);

  // Loại bỏ các chiến dịch đã kết thúc hoặc đã hủy
  const activeCampaigns = useMemo(() => {
    return (campaigns.rows ?? []).filter((c) => c.status !== "COMPLETED" && c.status !== "CANCELLED");
  }, [campaigns.rows]);

  useEffect(() => {
    if (!job.token || !fromId) {
      setStock([]);
      return;
    }
    let cancelled = false;
    setStockError("");
    backend.listInventory(job.token, fromId)
      .then((data) => {
        if (!cancelled) setStock(data.data);
      })
      .catch((caught) => {
        if (!cancelled) {
          setStock([]);
          setStockError(caught instanceof ApiError ? caught.message : "Không tải được kho trạm đi.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [job.token, fromId]);

  // Tải chi tiết lệnh và người đi giao khi chọn một lệnh chuyển
  useEffect(() => {
    if (!job.token || !picked) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    setLoadingDetail(true);
    backend.getTransfer(job.token, picked)
      .then((data) => {
        if (!cancelled) {
          setDetail(data as TransferDetailData);
          setLoadingDetail(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDetail(null);
          setLoadingDetail(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [job.token, picked]);

  const originStation = useMemo(() => {
    return (stations.rows ?? []).find((s) => s._id === fromId) || (origins ?? []).find((s) => s._id === fromId);
  }, [stations.rows, origins, fromId]);

  const originManagerId = useMemo(() => {
    if (!originStation?.managerId) return null;
    return typeof originStation.managerId === "object"
      ? (originStation.managerId as { _id?: string })._id
      : String(originStation.managerId);
  }, [originStation]);

  // Tải danh sách nhân sự và tình nguyện viên của trạm để phân công giao hàng (trừ trưởng trạm)
  useEffect(() => {
    const token = job.token;
    if (!token || !fromId) {
      setStationDeliverers([]);
      setSelectedCarrierIds([]);
      return;
    }
    let cancelled = false;
    setLoadingDeliverers(true);

    async function loadPersonnel(authToken: string) {
      const map = new Map<string, {
        _id: string;
        name: string;
        fullName?: string;
        username?: string;
        phone?: string;
        roleType: "STAFF" | "VOLUNTEER" | "SELF" | "OTHER";
        roleLabel: string;
      }>();

      // 1. Thêm bản thân nếu người dùng là Staff (không phải Trưởng trạm của trạm này)
      const isSelfManager = originManagerId && user?.id && String(originManagerId) === String(user.id);
      if (user?.id && !isSelfManager && role !== "STATION_MANAGER") {
        map.set(user.id, {
          _id: user.id,
          name: `${user.fullName || user.username || "Tôi"} (Bạn)`,
          fullName: user.fullName,
          username: user.username,
          phone: user.phone,
          roleType: "SELF",
          roleLabel: "Nhân viên trạm (Bạn)",
        });
      }

      // 2. Tải danh sách nhân viên của trạm
      try {
        const staffRes = await backend.listStationStaff(authToken, fromId);
        if (staffRes?.data && Array.isArray(staffRes.data)) {
          for (const st of staffRes.data) {
            const sid = st._id;
            if (!sid) continue;
            // Trừ trưởng trạm ra theo yêu cầu người dùng
            if (originManagerId && String(originManagerId) === String(sid)) continue;
            if (map.has(sid)) continue;
            map.set(sid, {
              _id: sid,
              name: st.fullName || st.username || `Nhân viên trạm (${sid.slice(-4)})`,
              fullName: st.fullName,
              username: st.username,
              phone: (st as { phone?: string }).phone,
              roleType: "STAFF",
              roleLabel: "Nhân viên trạm (Staff)",
            });
          }
        }
      } catch {
        // Fallback: nếu role STAFF không gọi được /stationmanager, gọi /shiftstations
        try {
          const schedRes = await backend.listShiftSchedules(authToken, fromId);
          if (schedRes?.data && Array.isArray(schedRes.data)) {
            for (const item of schedRes.data) {
              const staff = typeof item.staffId === "object" ? item.staffId : null;
              if (staff && staff._id) {
                const sid = staff._id;
                if (originManagerId && String(originManagerId) === String(sid)) continue;
                if (map.has(sid)) continue;
                map.set(sid, {
                  _id: sid,
                  name: staff.fullName || staff.username || "Nhân viên ca trực",
                  fullName: staff.fullName,
                  username: staff.username,
                  phone: (staff as { phone?: string })?.phone,
                  roleType: "STAFF",
                  roleLabel: "Nhân viên ca trực trạm",
                });
              }
            }
          }
        } catch {
          // Bỏ qua lỗi ca trực
        }
      }

      // 3. Tải danh sách Tình nguyện viên của chiến dịch
      if (campaignId) {
        try {
          const volRes = (await backend.campaignVolunteers(authToken, campaignId)) as {
            data?: Array<{
              _id: string;
              status: string;
              userId?: { _id: string; fullName?: string; username?: string; phone?: string };
            }>;
          };
          if (volRes?.data && Array.isArray(volRes.data)) {
            for (const vol of volRes.data) {
              if (vol.userId && vol.userId._id) {
                const vid = vol.userId._id;
                if (originManagerId && String(originManagerId) === String(vid)) continue;
                if (map.has(vid)) continue;
                map.set(vid, {
                  _id: vid,
                  name: vol.userId.fullName || vol.userId.username || "Tình nguyện viên",
                  fullName: vol.userId.fullName,
                  username: vol.userId.username,
                  phone: vol.userId.phone,
                  roleType: "VOLUNTEER",
                  roleLabel: vol.status === "APPROVED" ? "Tình nguyện viên trạm (Đã duyệt)" : "Tình nguyện viên trạm",
                });
              }
            }
          }
        } catch {
          // Bỏ qua lỗi lấy tình nguyện viên
        }
      }

      if (!cancelled) {
        setStationDeliverers(Array.from(map.values()));
        setLoadingDeliverers(false);
      }
    }

    void loadPersonnel(token);
    return () => {
      cancelled = true;
    };
  }, [job.token, fromId, campaignId, originManagerId, user?.id, user?.fullName, user?.username, user?.phone, role]);

  const selectedDeliverers = useMemo(() => {
    return stationDeliverers.filter((d) => selectedCarrierIds.includes(d._id));
  }, [stationDeliverers, selectedCarrierIds]);

  const delivererRows: Row[] = useMemo(() => {
    return stationDeliverers.map((d) => ({
      _id: d._id,
      name: `${d.fullName || d.username || d.name}`,
      address: `${d.roleLabel}${d.phone ? ` • 📞 ${d.phone}` : ""}`,
    }));
  }, [stationDeliverers]);

  const selectedItemsCount = stock.filter((row) => Number(amounts[refId(row.itemTypeId)]) > 0).length;
  const hasOverStock = stock.some((r) => {
    const qty = Number(amounts[refId(r.itemTypeId)]);
    const available = r.availableQuantity ?? r.quantity;
    return qty > available;
  });
  const transferStatuses = ["PENDING", "PREPARING", "IN_TRANSIT", "RECEIVED", "COMPLETED", "CANCELLED"];
  const filteredTransfers = transfers.rows?.filter((row) => transferFilter === "ALL" || row.status === transferFilter) ?? null;

  return (
    <OpsGate>
      <Title>Điều chuyển</Title>
      <RoleNote />
      <Note text={transfers.error || stockError || (job.isError ? job.note : "")} />
      {transfers.rows ? (
        <StatRow
          items={[
            { label: "Tổng lệnh", value: transfers.rows.length, unit: "lệnh", tone: "ink" },
            {
              label: "Đang xử lý",
              value: transfers.rows.filter((r) => ["PENDING", "PREPARING", "IN_TRANSIT", "RECEIVED"].includes(r.status || "")).length,
              unit: "lệnh",
              tone: "coral",
            },
            {
              label: "Hoàn tất",
              value: transfers.rows.filter((r) => r.status === "COMPLETED").length,
              unit: "lệnh",
              tone: "primary",
            },
          ]}
        />
      ) : null}
      {role === "ADMIN" && transfers.rows ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          <Pill label={`Tất cả (${transfers.rows.length})`} active={transferFilter === "ALL"} onPress={() => { setTransferFilter("ALL"); setPicked(""); }} />
          {transferStatuses.map((status) => (
            <Pill
              key={status}
              label={`${({
                PENDING: "Chờ xử lý",
                PREPARING: "Đang chuẩn bị",
                IN_TRANSIT: "Đang vận chuyển",
                RECEIVED: "Đã nhận",
                COMPLETED: "Hoàn tất",
                CANCELLED: "Đã hủy",
              } as Record<string, string>)[status]} (${transfers.rows?.filter((row) => row.status === status).length ?? 0})`}
              active={transferFilter === status}
              onPress={() => { setTransferFilter(status); setPicked(""); }}
            />
          ))}
        </ScrollView>
      ) : null}
      {filteredTransfers && filteredTransfers.length === 0 && transfers.rows?.length ? <Body>Không có lệnh điều chuyển ở trạng thái này.</Body> : null}
      <PickList
        rows={role === "ADMIN" ? filteredTransfers : transfers.rows}
        selected={picked}
        onPick={setPicked}
        detail={(row) => {
          const from = typeof row.fromStationId === "object" ? row.fromStationId?.name || "" : "";
          const to = typeof row.toStationId === "object" ? row.toStationId?.name || "" : "";
          return `${row.status || ""}${from || to ? ` · ${from} → ${to}` : ""}`;
        }}
        panel={(row) => {
          const tDetail = detail && detail.transfer._id === row._id ? detail : null;
          return (
            <View style={{ gap: 10 }}>
              {loadingDetail && picked === row._id ? (
                <Body muted>Đang tải chi tiết lệnh và người đi giao...</Body>
              ) : null}

              {tDetail ? (
                <>
                  {/* Khối Tuyến điều chuyển & Chiến dịch */}
                  <View style={{ backgroundColor: colors.surface, borderRadius: 10, padding: 12, gap: 8, borderWidth: 1, borderColor: colors.hairline }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                      <Text style={{ fontFamily: fonts.bold, fontSize: 15, color: colors.ink }}>
                        {`Lệnh ${tDetail.transfer.code || row.code || ""}`}
                      </Text>
                      <Badge
                        label={
                          row.status === "PENDING"
                            ? "Chờ xử lý"
                            : row.status === "PREPARING"
                              ? "Đang chuẩn bị"
                              : row.status === "IN_TRANSIT"
                                ? "Đang vận chuyển"
                                : row.status === "RECEIVED"
                                  ? "Đã nhận hàng"
                                  : row.status === "COMPLETED"
                                    ? "Hoàn tất"
                                    : row.status === "CANCELLED"
                                      ? "Đã hủy"
                                      : row.status || ""
                        }
                        tone={row.status === "COMPLETED" || row.status === "RECEIVED" ? "primary" : row.status === "CANCELLED" ? "coral" : "neutral"}
                      />
                    </View>

                    {tDetail.transfer.campaignId && typeof tDetail.transfer.campaignId === "object" ? (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <Text style={{ fontFamily: fonts.medium, fontSize: 13, color: colors.muted }}>Chiến dịch:</Text>
                        <Text style={{ fontFamily: fonts.bold, fontSize: 13, color: colors.ink, flex: 1 }}>
                          {tDetail.transfer.campaignId.title}
                        </Text>
                      </View>
                    ) : null}

                    <View style={{ backgroundColor: colors.surfaceContainer, borderRadius: 8, padding: 8, gap: 6 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <Text style={{ fontSize: 14 }}>📤</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontFamily: fonts.bold, fontSize: 13, color: colors.ink }}>
                            {`Trạm xuất: ${typeof tDetail.transfer.fromStationId === "object" ? tDetail.transfer.fromStationId?.name : "Trạm gửi"}`}
                          </Text>
                          {typeof tDetail.transfer.fromStationId === "object" && tDetail.transfer.fromStationId?.address ? (
                            <Text style={{ fontFamily: fonts.regular, fontSize: 11, color: colors.muted }}>
                              {tDetail.transfer.fromStationId.address}
                            </Text>
                          ) : null}
                        </View>
                      </View>

                      <View style={{ height: 1, backgroundColor: colors.hairline, marginVertical: 2 }} />

                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <Text style={{ fontSize: 14 }}>📥</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontFamily: fonts.bold, fontSize: 13, color: colors.primary }}>
                            {`Trạm nhận: ${typeof tDetail.transfer.toStationId === "object" ? tDetail.transfer.toStationId?.name : "Trạm nhận"}`}
                          </Text>
                          {typeof tDetail.transfer.toStationId === "object" && tDetail.transfer.toStationId?.address ? (
                            <Text style={{ fontFamily: fonts.regular, fontSize: 11, color: colors.muted }}>
                              {tDetail.transfer.toStationId.address}
                            </Text>
                          ) : null}
                        </View>
                      </View>
                    </View>

                    {tDetail.transfer.createdBy && typeof tDetail.transfer.createdBy === "object" ? (
                      <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.muted }}>
                        {`Người lập lệnh: ${tDetail.transfer.createdBy.fullName || tDetail.transfer.createdBy.username}`}
                        {tDetail.transfer.createdAt ? ` • ${formatTxDate(tDetail.transfer.createdAt)}` : ""}
                      </Text>
                    ) : null}
                  </View>

                  {/* Khối Thông tin người đi giao */}
                  <View style={{ backgroundColor: colors.surfaceContainer, borderRadius: 10, padding: 12, gap: 6 }}>
                    <Text style={{ fontFamily: fonts.bold, fontSize: 14, color: colors.ink }}>
                      🚚 Người đi giao & Vận chuyển
                    </Text>

                    {tDetail.transfer.responsibleUserId && typeof tDetail.transfer.responsibleUserId === "object" ? (
                      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                        <Text style={{ fontFamily: fonts.semibold, fontSize: 13, color: colors.ink }}>
                          {`Người phụ trách: ${tDetail.transfer.responsibleUserId.fullName || tDetail.transfer.responsibleUserId.username}`}
                        </Text>
                        {tDetail.transfer.responsibleUserId.phone ? (
                          <Badge label={`📞 ${tDetail.transfer.responsibleUserId.phone}`} tone="primary" />
                        ) : null}
                      </View>
                    ) : null}

                    {tDetail.transfer.transportMethod ? (
                      <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.ink }}>
                        {`Phương tiện: ${tDetail.transfer.transportMethod}`}
                      </Text>
                    ) : null}

                    {tDetail.transfer.transportNote ? (
                      <View style={{ backgroundColor: colors.card, padding: 8, borderRadius: 8, borderWidth: 1, borderColor: colors.hairline, gap: 4 }}>
                        <Text style={{ fontFamily: fonts.bold, fontSize: 13, color: colors.ink }}>
                          👥 Chi tiết người đi giao:
                        </Text>
                        {tDetail.transfer.transportNote.includes(" | ") ? (
                          tDetail.transfer.transportNote
                            .replace(/^Đội giao hàng \(\d+ người\):\s*/i, "")
                            .split(" | ")
                            .map((member, mIdx) => (
                              <Text key={mIdx} style={{ fontFamily: fonts.medium, fontSize: 12, color: colors.primary }}>
                                {`• ${member}`}
                              </Text>
                            ))
                        ) : (
                          <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.ink }}>
                            {tDetail.transfer.transportNote}
                          </Text>
                        )}
                      </View>
                    ) : null}

                    {tDetail.shipments && tDetail.shipments.length > 0 ? (
                      <View style={{ gap: 6, marginTop: 4, paddingTop: 6, borderTopWidth: 1, borderTopColor: colors.line }}>
                        <Text style={{ fontFamily: fonts.semibold, fontSize: 13, color: colors.ink }}>
                          {`Danh sách tài xế / người giao hàng (${tDetail.shipments.length} người):`}
                        </Text>
                        {tDetail.shipments.map((sh, idx) => {
                          const carrierName = sh.carrierId?.fullName || sh.carrierId?.username || "Tài xế";
                          const carrierPhone = sh.carrierId?.phone || "";
                          const statusText = shipmentStatusNames[sh.status] || sh.status;
                          return (
                            <View
                              key={sh._id || idx}
                              style={{
                                backgroundColor: colors.card,
                                padding: 8,
                                borderRadius: 8,
                                borderWidth: 1,
                                borderColor: colors.hairline,
                                flexDirection: "row",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: 8,
                              }}
                            >
                              <View style={{ flex: 1 }}>
                                <Text style={{ fontFamily: fonts.bold, fontSize: 13, color: colors.ink }}>
                                  {carrierName}
                                </Text>
                                {carrierPhone ? (
                                  <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.primary }}>
                                    {`📞 ${carrierPhone}`}
                                  </Text>
                                ) : null}
                              </View>
                              <Badge label={statusText} tone={sh.status === "RECEIVED" ? "primary" : "neutral"} />
                            </View>
                          );
                        })}
                      </View>
                    ) : !tDetail.transfer.responsibleUserId && !tDetail.transfer.transportNote ? (
                      <Body muted>Chưa có thông tin người đi giao cho lệnh này.</Body>
                    ) : null}
                  </View>

                  {/* Khối Chi tiết các mặt hàng gửi */}
                  {tDetail.items && tDetail.items.length > 0 ? (
                    <View style={{ backgroundColor: colors.surface, borderRadius: 10, padding: 12, gap: 6, borderWidth: 1, borderColor: colors.hairline }}>
                      <Text style={{ fontFamily: fonts.bold, fontSize: 14, color: colors.ink }}>
                        📦 Chi tiết vật phẩm chuyển đi
                      </Text>
                      {tDetail.items.map((it) => {
                        const name = typeof it.itemTypeId === "object" ? it.itemTypeId?.name || "Vật phẩm" : "Vật phẩm";
                        const unitLabel = unitSpoken(it.unit);
                        return (
                          <View
                            key={it._id}
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              justifyContent: "space-between",
                              paddingVertical: 4,
                              borderBottomWidth: 1,
                              borderBottomColor: colors.hairline,
                            }}
                          >
                            <Text style={{ fontFamily: fonts.semibold, fontSize: 13, color: colors.ink, flex: 1 }}>
                              {name}
                            </Text>
                            <View style={{ alignItems: "flex-end" }}>
                              <Text style={{ fontFamily: fonts.bold, fontSize: 13, color: colors.primary }}>
                                {`Gửi: ${it.quantity} ${unitLabel}`}
                              </Text>
                              {it.receivedQuantity !== undefined && it.receivedQuantity > 0 ? (
                                <Text style={{ fontFamily: fonts.medium, fontSize: 12, color: colors.muted }}>
                                  {`Đã nhận: ${it.receivedQuantity} ${unitLabel}`}
                                </Text>
                              ) : null}
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  ) : (
                    <View style={{ backgroundColor: colors.surface, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: colors.hairline }}>
                      <Text style={{ fontFamily: fonts.bold, fontSize: 14, color: colors.ink, marginBottom: 4 }}>
                        📦 Chi tiết vật phẩm chuyển đi
                      </Text>
                      <Body muted>Phiếu mẫu này không có danh mục vật phẩm đính kèm.</Body>
                    </View>
                  )}
                </>
              ) : null}

              {/* Các nút chuyển trạng thái lệnh */}
              {canWrite ? (() => {
                const originStationId = typeof row.fromStationId === "object" ? (row.fromStationId as { _id?: string })?._id : String(row.fromStationId || "");
                const destStationId = typeof row.toStationId === "object" ? (row.toStationId as { _id?: string })?._id : String(row.toStationId || "");
                const userStationIds = new Set((user?.stations ?? []).map((s) => String(s._id)));
                const isFromStation = role === "ADMIN" || (Boolean(originStationId) && userStationIds.has(String(originStationId)));
                const isToStation = role === "ADMIN" || (Boolean(destStationId) && userStationIds.has(String(destStationId)));

                const originName = typeof row.fromStationId === "object" && row.fromStationId?.name ? row.fromStationId.name : "trạm xuất";
                const destName = typeof row.toStationId === "object" && row.toStationId?.name ? row.toStationId.name : "trạm nhận";

                const possibleNextStatuses = (({
                  PENDING: isFromStation ? ["PREPARING", "CANCELLED"] : [],
                  PREPARING: isFromStation ? ["IN_TRANSIT", "CANCELLED"] : [],
                  IN_TRANSIT: isToStation ? ["RECEIVED"] : [],
                  RECEIVED: isToStation ? ["COMPLETED"] : [],
                  COMPLETED: [],
                  CANCELLED: [],
                } as Record<string, string[]>)[row.status || ""] || []);

                return (
                  <View style={{ gap: 6 }}>
                    {row.status === "PENDING" && !isFromStation ? (
                      <Body muted>{`⏳ Đang chờ quản lý ${originName} duyệt và chuẩn bị hàng...`}</Body>
                    ) : null}

                    {row.status === "PREPARING" && !isFromStation ? (
                      <Body muted>{`⏳ Đang chờ ${originName} chuẩn bị xong và xuất phát giao hàng...`}</Body>
                    ) : null}

                    {row.status === "IN_TRANSIT" && !isToStation ? (
                      <Body muted>{`🚚 Hàng đang trên đường vận chuyển tới ${destName}. Chờ trạm nhận kiểm tra và tiếp nhận...`}</Body>
                    ) : null}

                    {row.status === "RECEIVED" && !isToStation ? (
                      <Body muted>{`📦 ${destName} đã nhận hàng, đang kiểm tra hoàn tất...`}</Body>
                    ) : null}

                    {possibleNextStatuses.length > 0 ? (
                      <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                        {possibleNextStatuses.map((status) => {
                          const isApproving = row.status === "PENDING" && status === "PREPARING";
                          const isManagerOrAdmin = role === "ADMIN" || role === "STATION_MANAGER";
                          const disabled = isApproving && !isManagerOrAdmin;

                          return (
                            <View key={status} style={{ flex: 1, minWidth: 120 }}>
                              <Button
                                label={
                                  status === "CANCELLED"
                                    ? "Hủy lệnh"
                                    : isApproving
                                      ? "Duyệt & Chuẩn bị hàng"
                                      : status === "IN_TRANSIT"
                                        ? "Xuất phát giao"
                                        : status === "RECEIVED"
                                          ? "Xác nhận đã nhận"
                                          : status === "COMPLETED"
                                            ? "Hoàn tất"
                                            : status
                                }
                                tone={status === "CANCELLED" ? "danger" : isApproving ? "primary" : "ghost"}
                                disabled={disabled}
                                onPress={() =>
                                  void job
                                    .run((token) => {
                                      if (row.status === "PENDING" && status === "PREPARING") {
                                        return backend.approveTransfer(token, row._id, "APPROVED");
                                      }
                                      if (row.status === "PENDING" && status === "CANCELLED") {
                                        return backend.approveTransfer(token, row._id, "REJECTED").catch(() =>
                                          backend.updateTransferStatus(token, row._id, { status: "CANCELLED" })
                                        );
                                      }
                                      return backend.updateTransferStatus(token, row._id, { status });
                                    })
                                    .then((ok) => {
                                      if (ok) {
                                        transfers.reload();
                                        if (picked === row._id && job.token) {
                                          backend.getTransfer(job.token, row._id).then((data) => setDetail(data as typeof detail));
                                        }
                                      }
                                    })
                                }
                              />
                            </View>
                          );
                        })}
                      </View>
                    ) : null}
                  </View>
                );
              })() : null}
            </View>
          );
        }}
      />
      {canWrite ? (
        <Fold title="Lập lệnh điều chuyển mới" open={formOpen} onToggle={setFormOpen}>
          <SelectField
            label="1. Chọn chiến dịch"
            placeholder="Bấm vào đây để chọn chiến dịch"
            icon="📋"
            selectedId={campaignId}
            rows={activeCampaigns}
            onSelect={setCampaignId}
            detail={(row) => donorLabel({ status: row.status || "" })}
          />

          {origins.length === 1 ? (
            <View style={{ gap: 4 }}>
              <Text style={{ fontFamily: fonts.bold, fontSize: 14, color: colors.ink }}>2. Trạm đi (kho xuất)</Text>
              <View style={{ backgroundColor: colors.surfaceContainer, padding: 12, borderRadius: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <View style={{ gap: 2, flex: 1 }}>
                  <Text style={{ fontFamily: fonts.bold, fontSize: 15, color: colors.ink }}>
                    {origins[0]?.name || "Trạm của bạn"}
                  </Text>
                  {origins[0]?.address ? (
                    <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.muted }}>
                      {origins[0].address}
                    </Text>
                  ) : null}
                </View>
                <Badge label="Trạm của bạn" tone="primary" />
              </View>
            </View>
          ) : (
            <SelectField
              label="2. Chọn trạm đi (kho xuất)"
              placeholder="Bấm vào đây để chọn trạm xuất hàng"
              icon="📦"
              selectedId={fromId}
              rows={origins as Row[]}
              onSelect={setFromId}
              detail={(row) => row.address || ""}
            />
          )}

          <SelectField
            label="3. Chọn trạm đến (trạm nhận)"
            placeholder="Bấm vào đây để chọn trạm nhận hàng"
            icon="📍"
            selectedId={toId}
            rows={arrival}
            onSelect={setToId}
            detail={(row) => row.address || ""}
          />

          <View style={{ gap: 8, marginTop: 4 }}>
            <Text style={{ fontFamily: fonts.bold, fontSize: 14, color: colors.ink }}>
              Thông tin vận chuyển & Người đi giao
            </Text>

            {loadingDeliverers ? (
              <Body muted>Đang tải danh sách nhân sự và tình nguyện viên của trạm...</Body>
            ) : null}

            <MultiSelectField
              label="Chọn người đi giao (Có thể chọn nhiều Nhân viên / TNV cùng đi)"
              placeholder="-- Bấm vào đây để chọn người hoặc nhiều người đi giao --"
              icon="👥"
              selectedIds={selectedCarrierIds}
              rows={delivererRows}
              onToggle={toggleCarrier}
              detail={(row) => row.address || ""}
            />

            {selectedDeliverers.length > 0 ? (
              <View
                style={{
                  backgroundColor: colors.surfaceContainer,
                  padding: 12,
                  borderRadius: 10,
                  gap: 8,
                  borderWidth: 1,
                  borderColor: colors.hairline,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <Text style={{ fontFamily: fonts.bold, fontSize: 14, color: colors.ink }}>
                    {`🚚 Đội giao hàng đã chọn (${selectedDeliverers.length} người):`}
                  </Text>
                  {selectedDeliverers.length > 1 ? (
                    <Tap
                      onPress={() => {
                        setSelectedCarrierIds([]);
                        setAssignSelf(false);
                      }}
                    >
                      <Badge label="Bỏ chọn tất cả ✕" tone="coral" />
                    </Tap>
                  ) : null}
                </View>
                {selectedDeliverers.map((person, idx) => (
                  <View
                    key={person._id}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      paddingVertical: 6,
                      borderTopWidth: idx > 0 ? 1 : 0,
                      borderTopColor: colors.hairline,
                      gap: 8,
                    }}
                  >
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={{ fontFamily: fonts.bold, fontSize: 13, color: colors.ink }}>
                        {`${idx + 1}. ${person.fullName || person.username || person.name}`}
                      </Text>
                      <Text style={{ fontFamily: fonts.medium, fontSize: 12, color: colors.primary }}>
                        {person.roleLabel}{person.phone ? ` • 📞 ${person.phone}` : ""}
                      </Text>
                    </View>
                    <Tap onPress={() => toggleCarrier(person._id)}>
                      <Badge label="Bỏ chọn ✕" tone="neutral" />
                    </Tap>
                  </View>
                ))}
              </View>
            ) : null}

            <Pill
              label={assignSelf ? "✓ Tôi là một trong những người trực tiếp đi giao" : "Tôi là người trực tiếp đi giao hàng"}
              active={assignSelf}
              onPress={() => {
                if (user?.id) {
                  toggleCarrier(user.id);
                }
              }}
            />

            <TextField
              label="Phương tiện vận chuyển (Xe máy, Xe tải, Ba gác...)"
              value={transportMethod}
              onChangeText={setTransportMethod}
            />
          </View>

          <View style={{ gap: 8, marginTop: 4 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <Text style={{ flex: 1, fontFamily: fonts.bold, fontSize: 14, color: colors.ink }}>
                4. Nhập số lượng gửi từ kho trạm đi
              </Text>
              {selectedItemsCount > 0 ? <Badge label={`Đã chọn ${selectedItemsCount} món`} tone="primary" /> : null}
            </View>
            <Body muted>Điền số lượng những món cần gửi. Có thể gửi nhiều món trong một lệnh.</Body>

            {!fromId ? (
              <Body muted>Vui lòng chọn trạm đi để xem số lượng tồn kho có thể gửi.</Body>
            ) : stock.length === 0 && !stockError ? (
              <Body muted>Kho trạm này hiện chưa có mặt hàng nào.</Body>
            ) : null}

            {stock.map((row) => {
              const id = refId(row.itemTypeId);
              const available = row.availableQuantity ?? row.quantity;
              const unitLabel = unitSpoken(row.unit);
              const currentVal = amounts[id] || "";
              const currentNum = Number(currentVal);
              const isOver = currentVal !== "" && currentNum > available;

              return (
                <Card key={row._id}>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <Text style={{ flex: 1, fontFamily: fonts.bold, fontSize: 16, color: colors.ink }}>
                      {refName(row.itemTypeId, "Vật phẩm")}
                    </Text>
                    <Badge
                      label={available > 0 ? `Đơn vị: ${unitLabel}` : `Hết hàng (${unitLabel})`}
                      tone={available > 0 ? "neutral" : "coral"}
                    />
                  </View>
                  <StatRow
                    items={[
                      { label: "Còn gửi được", value: available, unit: unitLabel, tone: "primary" },
                      { label: "Tổng tồn", value: row.quantity, unit: unitLabel, tone: "ink" },
                      { label: "Đang giữ", value: row.reservedQuantity || 0, unit: unitLabel, tone: "coral" },
                    ]}
                  />

                  {available <= 0 ? (
                    <View style={{ backgroundColor: colors.surfaceContainer, padding: 10, borderRadius: 8, marginTop: 4 }}>
                      <Text style={{ fontFamily: fonts.medium, fontSize: 13, color: colors.error }}>
                        ⚠️ Mặt hàng này hiện không còn trong kho trạm để điều chuyển.
                      </Text>
                    </View>
                  ) : (
                    <>
                      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
                        <Text style={{ fontFamily: fonts.medium, fontSize: 12, color: colors.muted }}>
                          {`Tối đa có thể gửi: ${available} ${unitLabel}`}
                        </Text>
                        <Tap onPress={() => setAmounts((cur) => ({ ...cur, [id]: String(available) }))}>
                          <Badge label={`⚡ Gửi tối đa (${available})`} tone="primary" />
                        </Tap>
                      </View>
                      <TextField
                        label={`Số lượng gửi (${unitLabel})`}
                        value={currentVal}
                        onChangeText={(value) => {
                          if (!value) {
                            setAmounts((cur) => ({ ...cur, [id]: "" }));
                            return;
                          }
                          const clean = value.replace(/[^0-9.]/g, "");
                          const num = Number(clean);
                          if (!isNaN(num) && num > available) {
                            // Tự động chặn và giữ ở mức tối đa còn gửi được
                            setAmounts((cur) => ({ ...cur, [id]: String(available) }));
                            return;
                          }
                          setAmounts((cur) => ({ ...cur, [id]: clean }));
                        }}
                        keyboardType="decimal-pad"
                      />
                      {isOver ? (
                        <View style={{ backgroundColor: "#FFEAEA", padding: 8, borderRadius: 6, marginTop: -4 }}>
                          <Text style={{ fontFamily: fonts.bold, fontSize: 12, color: colors.error }}>
                            {`⚠️ Vượt quá số lượng còn gửi được (Kho chỉ còn ${available} ${unitLabel})!`}
                          </Text>
                        </View>
                      ) : null}
                    </>
                  )}
                </Card>
              );
            })}
          </View>

          {/* Bảng tóm tắt hàng trạm nhận sẽ nhận */}
          {selectedItemsCount > 0 ? (
            <View style={{ backgroundColor: colors.surfaceContainer, padding: 12, borderRadius: 10, gap: 6, marginTop: 4 }}>
              <Text style={{ fontFamily: fonts.bold, fontSize: 14, color: colors.ink }}>
                📋 Tóm tắt hàng trạm nhận sẽ tiếp nhận:
              </Text>
              {stock
                .filter((r) => Number(amounts[refId(r.itemTypeId)]) > 0)
                .map((r) => {
                  const qty = amounts[refId(r.itemTypeId)];
                  return (
                    <View key={r._id} style={{ flexDirection: "row", justifyContent: "space-between" }}>
                      <Text style={{ fontFamily: fonts.medium, fontSize: 13, color: colors.ink }}>
                        {refName(r.itemTypeId, "Vật phẩm")}
                      </Text>
                      <Text style={{ fontFamily: fonts.bold, fontSize: 13, color: colors.primary }}>
                        {`${qty} ${unitSpoken(r.unit)}`}
                      </Text>
                    </View>
                  );
                })}
            </View>
          ) : null}

          {hasOverStock ? (
            <View style={{ backgroundColor: "#FFEAEA", padding: 10, borderRadius: 8, marginTop: 4 }}>
              <Text style={{ fontFamily: fonts.bold, fontSize: 13, color: colors.error, textAlign: "center" }}>
                ⚠️ Có mặt hàng vượt quá số lượng khả dụng trong kho. Vui lòng nhập tối đa bằng số lượng còn gửi được!
              </Text>
            </View>
          ) : null}

          <Button
            label={selectedItemsCount > 0 ? `Tạo lệnh chuyển (${selectedItemsCount} món)` : "Tạo lệnh chuyển"}
            disabled={selectedItemsCount === 0 || hasOverStock}
            onPress={() => {
              if (!campaignId || !fromId || !toId) {
                job.fail("Vui lòng chọn đầy đủ Chiến dịch, Trạm đi và Trạm đến.");
                return;
              }
              for (const row of stock) {
                const id = refId(row.itemTypeId);
                const qty = Number(amounts[id]);
                const available = row.availableQuantity ?? row.quantity;
                if (qty > available) {
                  const name = refName(row.itemTypeId, "Vật phẩm");
                  job.fail(`Món "${name}" chỉ còn gửi được tối đa ${available} ${unitSpoken(row.unit)}, không thể gửi ${qty}.`);
                  return;
                }
              }
              const items = stock.flatMap((row) => {
                const id = refId(row.itemTypeId);
                const quantity = Number(amounts[id]);
                if (!id || !(quantity > 0)) return [];
                return [{ itemTypeId: id, quantity, unit: row.unit }];
              });
              if (items.length === 0) {
                job.fail("Vui lòng nhập số lượng lớn hơn 0 cho ít nhất một món đồ cần gửi.");
                return;
              }
              const isStationManagerOrAdmin = role === "STATION_MANAGER" || role === "ADMIN";
              const firstStaff = selectedDeliverers.find((d) => d.roleType === "STAFF");

              let responsibleUserId: string | undefined = undefined;
              if (assignSelf && user?.id) {
                responsibleUserId = user.id;
              } else if (isStationManagerOrAdmin && firstStaff) {
                responsibleUserId = firstStaff._id;
              }

              let transportNoteCombined: string | undefined = undefined;
              if (selectedDeliverers.length > 0) {
                const membersStr = selectedDeliverers
                  .map((d, i) => `${i + 1}. ${d.fullName || d.name} (${d.roleLabel}${d.phone ? `, 📞 ${d.phone}` : ""})`)
                  .join(" | ");
                transportNoteCombined = `Đội giao hàng (${selectedDeliverers.length} người): ${membersStr}`;
              }

              void job.run((token) => backend.createTransfer(token, {
                campaignId,
                fromStationId: fromId,
                toStationId: toId,
                items,
                responsibleUserId,
                transportMethod: transportMethod.trim() || undefined,
                transportNote: transportNoteCombined,
              })).then((ok) => {
                if (!ok) return;
                setAmounts({});
                setCampaignId("");
                if (origins.length > 1) {
                  setFromId("");
                }
                setToId("");
                setTransportMethod("");
                setAssignSelf(false);
                setSelectedCarrierIds([]);
                setFormOpen(false);
                transfers.reload();
              });
            }}
          />
        </Fold>
      ) : (
        <Body muted>Vai trò này không lập lệnh chuyển.</Body>
      )}
    </OpsGate>
  );
}

function transactionTypeBadge(type: string): { label: string; tone: "primary" | "coral" | "neutral" } {
  switch (type) {
    case "DONATION_IN":
      return { label: "Nhận quyên góp", tone: "primary" };
    case "DONATION_REVERSAL":
      return { label: "Hủy tiếp nhận", tone: "coral" };
    case "TRANSFER_OUT":
      return { label: "Xuất điều chuyển", tone: "coral" };
    case "TRANSFER_IN":
      return { label: "Nhập điều chuyển", tone: "primary" };
    case "RELIEF_OUT":
      return { label: "Xuất cứu trợ", tone: "coral" };
    case "MANUAL_UPDATE":
      return { label: "Kiểm kê điều chỉnh", tone: "primary" };
    case "MANUAL_CREATE":
      return { label: "Tạo tồn kho mới", tone: "primary" };
    case "MANUAL_DELETE":
      return { label: "Xóa tồn kho", tone: "coral" };
    case "OPENING":
      return { label: "Số dư ban đầu", tone: "neutral" };
    default:
      return { label: type, tone: "neutral" };
  }
}

function formatTxDate(iso?: string) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    const time = d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", hour12: false });
    const date = d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
    return `${time} • ${date}`;
  } catch {
    return iso;
  }
}

export function StockWork() {
  const [tab, setTab] = useState<"balances" | "history">("balances");
  const stock = useRows((token) => backend.listInventory(token).then((data) => data.data as StockLine[]));
  const history = useRows((token) => backend.listInventoryHistory(token).then((data) => data.data as (Row & InventoryTransactionRow)[]));
  const stations = useRows((token) => backend.listStations(token).then((data) => data.data as Row[]));
  const items = useRows(async () => (await backend.listItemTypes()).itemTypes as Row[]);
  const rows = (stock.rows as StockLine[] | null) ?? null;
  const historyRows = (history.rows as (Row & InventoryTransactionRow)[] | null) ?? null;

  const job = useJob();
  const role = useRole();
  const { user } = useSession();
  const canWrite = can(role, ["ADMIN", "STATION_MANAGER", "STAFF"]);

  // Điều chỉnh tồn kho
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editQty, setEditQty] = useState("");
  const [editReason, setEditReason] = useState("");
  const [saving, setSaving] = useState(false);

  // Xóa dòng kho
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [deleting, setDeleting] = useState(false);

  // Thêm nhiều mặt hàng mới vào kho trạm
  const [newStationId, setNewStationId] = useState("");
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [itemSearch, setItemSearch] = useState("");
  const [newReason, setNewReason] = useState("");
  const [creating, setCreating] = useState(false);

  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");

  // Chỉ lấy trạm thuộc quyền của nhân sự / trưởng trạm
  const userStations = useMemo(() => {
    if (role === "ADMIN") {
      return (stations.rows ?? []) as Row[];
    }
    // Nhân viên / Trưởng trạm: ưu tiên trạm đã được phân công trong session
    if (user?.stations && user.stations.length > 0) {
      return user.stations as Row[];
    }
    // Fallback: lấy từ các dòng tồn kho thực tế của người dùng
    const map = new Map<string, Row>();
    rows?.forEach((r) => {
      if (r.stationId && typeof r.stationId === "object" && r.stationId._id) {
        map.set(r.stationId._id, {
          _id: r.stationId._id,
          name: r.stationId.name || "Trạm của bạn",
          address: r.stationId.address || "",
        });
      }
    });
    return Array.from(map.values());
  }, [role, user?.stations, rows, stations.rows]);

  const selectedStationId = newStationId || userStations[0]?._id || "";
  const currentStation = userStations.find((s) => s._id === selectedStationId) || userStations[0] || null;

  // Lọc các món chưa có trong kho trạm
  const availableUnaddedItems = useMemo(() => {
    return (items.rows ?? []).filter((it) => {
      if (it.isActive === false) return false;
      const inStock = rows?.some((line) => {
        const lineItemId = typeof line.itemTypeId === "object" ? line.itemTypeId?._id : line.itemTypeId;
        const lineStationId = typeof line.stationId === "object" ? line.stationId?._id : line.stationId;
        return lineItemId === it._id && (!selectedStationId || lineStationId === selectedStationId);
      });
      return !inStock;
    });
  }, [items.rows, rows, selectedStationId]);

  // Tìm kiếm danh mục vật phẩm
  const filteredItems = useMemo(() => {
    const list = items.rows?.filter((it) => it.isActive !== false) ?? [];
    if (!itemSearch.trim()) return list;
    const q = itemSearch.toLowerCase().trim();
    return list.filter((it) => (it.name || "").toLowerCase().includes(q));
  }, [items.rows, itemSearch]);

  const toggleSelectItem = (id: string) => {
    setSelectedItemIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id);
      } else {
        return [...prev, id];
      }
    });
    setQuantities((prev) => {
      if (prev[id] === undefined) {
        return { ...prev, [id]: "0" };
      }
      return prev;
    });
  };

  const selectAllUnadded = () => {
    const ids = availableUnaddedItems.map((it) => it._id);
    setSelectedItemIds(ids);
    setQuantities((prev) => {
      const next = { ...prev };
      for (const id of ids) {
        if (next[id] === undefined) next[id] = "0";
      }
      return next;
    });
  };

  const clearSelection = () => {
    setSelectedItemIds([]);
  };

  const handleStartEdit = (row: StockLine) => {
    setDeletingId(null);
    setEditingId(row._id);
    setEditQty(String(row.quantity));
    setEditReason("");
    setActionError("");
    setActionSuccess("");
  };

  const handleStartDelete = (row: StockLine) => {
    setEditingId(null);
    setDeletingId(row._id);
    setDeleteReason("");
    setActionError("");
    setActionSuccess("");
  };

  const handleSaveAdjustment = (row: StockLine) => {
    const parsed = Number(editQty);
    if (!Number.isFinite(parsed) || parsed < 0) {
      setActionError("Số lượng tồn mới phải là số không âm (≥ 0).");
      return;
    }
    const reason = editReason.trim();
    if (!reason) {
      setActionError("Vui lòng nhập lý do điều chỉnh số tồn (bắt buộc).");
      return;
    }

    setSaving(true);
    setActionError("");
    setActionSuccess("");

    void job.run(async (token) => {
      await backend.updateInventory(token, row._id, {
        quantity: parsed,
        description: reason,
      });
      return true;
    }).then((ok) => {
      setSaving(false);
      if (ok) {
        setEditingId(null);
        setEditQty("");
        setEditReason("");
        setActionSuccess(`Đã điều chỉnh tồn kho "${refName(row.itemTypeId, "Vật phẩm")}" thành ${parsed} ${unitSpoken(row.unit)} và lưu vào lịch sử.`);
        stock.reload();
        history.reload();
      }
    }).catch((err) => {
      setSaving(false);
      setActionError(err instanceof ApiError ? err.message : "Không thể điều chỉnh tồn kho.");
    });
  };

  const handleConfirmDelete = (row: StockLine) => {
    const reason = deleteReason.trim();
    if (!reason) {
      setActionError("Vui lòng nhập lý do xóa vật phẩm trong kho (bắt buộc).");
      return;
    }
    if ((row.reservedQuantity || 0) > 0) {
      setActionError(`Mặt hàng đang có ${row.reservedQuantity} ${unitSpoken(row.unit)} giữ lệnh điều chuyển, không thể xóa.`);
      return;
    }

    setDeleting(true);
    setActionError("");
    setActionSuccess("");

    void job.run(async (token) => {
      await backend.deleteInventory(token, row._id, {
        description: reason,
      });
      return true;
    }).then((ok) => {
      setDeleting(false);
      if (ok) {
        setDeletingId(null);
        setDeleteReason("");
        setActionSuccess(`Đã xóa vật phẩm "${refName(row.itemTypeId, "Vật phẩm")}" khỏi kho trạm và lưu lịch sử.`);
        stock.reload();
        history.reload();
      }
    }).catch((err) => {
      setDeleting(false);
      setActionError(err instanceof ApiError ? err.message : "Không thể xóa vật phẩm trong kho.");
    });
  };

  const handleBatchCreateStock = () => {
    const targetStationId = selectedStationId;
    if (!targetStationId) {
      setActionError("Không xác định được trạm thao tác.");
      return;
    }
    if (selectedItemIds.length === 0) {
      setActionError("Vui lòng chọn ít nhất một loại mặt hàng cần thêm vào kho.");
      return;
    }

    for (const id of selectedItemIds) {
      const it = items.rows?.find((row) => row._id === id);
      const q = Number(quantities[id] ?? "0");
      if (!Number.isFinite(q) || q < 0) {
        setActionError(`Số lượng của món "${it?.name || "vật phẩm"}" phải là số không âm (≥ 0).`);
        return;
      }
    }

    const reason = newReason.trim();
    if (!reason) {
      setActionError("Vui lòng nhập lý do nhập kho / tạo mới (bắt buộc cho tất cả các món).");
      return;
    }

    setCreating(true);
    setActionError("");
    setActionSuccess("");

    const payload = selectedItemIds.map((id) => {
      const it = items.rows?.find((row) => row._id === id);
      return {
        stationId: targetStationId,
        itemTypeId: id,
        unit: it?.unit || "KG",
        quantity: Number(quantities[id] || 0),
        description: reason,
      };
    });

    void job.run(async (token) => {
      await backend.createInventory(token, payload);
      return true;
    }).then((ok) => {
      setCreating(false);
      if (ok) {
        setSelectedItemIds([]);
        setQuantities({});
        setNewReason("");
        setActionSuccess(`Đã thêm thành công ${payload.length} mặt hàng vào kho trạm.`);
        stock.reload();
        history.reload();
      }
    }).catch((err) => {
      setCreating(false);
      setActionError(err instanceof ApiError ? err.message : "Không thể thêm mặt hàng vào kho.");
    });
  };

  return (
    <OpsGate>
      <Title>Kho trạm</Title>
      <RoleNote />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
        <Pill label={`Số dư tồn kho (${rows?.length ?? 0})`} active={tab === "balances"} onPress={() => setTab("balances")} />
        <Pill label={`Lịch sử giao dịch kho (${historyRows?.length ?? 0})`} active={tab === "history"} onPress={() => setTab("history")} />
      </ScrollView>

      {tab === "balances" ? (
        <>
          <Note text={actionError || stock.error} />
          {actionSuccess ? <Note text={actionSuccess} /> : null}

          {rows ? (
            <StatRow
              items={[
                { label: "Mặt hàng tồn", value: rows.length, unit: "mục", tone: "primary" },
                {
                  label: "Có hàng giữ lệnh",
                  value: rows.filter((row) => (row.reservedQuantity || 0) > 0).length,
                  unit: "mục",
                  tone: "coral",
                },
              ]}
            />
          ) : null}

          {canWrite ? (
            <Fold title="Thêm mặt hàng mới vào kho trạm">
              {userStations.length > 1 ? (
                <>
                  <Text style={{ fontFamily: fonts.bold, fontSize: 14, color: colors.ink }}>
                    1. Chọn trạm thao tác
                  </Text>
                  <PickList
                    rows={userStations}
                    selected={selectedStationId}
                    onPick={setNewStationId}
                    detail={(r) => r.address || ""}
                  />
                </>
              ) : currentStation ? (
                <View style={{ backgroundColor: colors.surfaceContainer, padding: 12, borderRadius: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <View style={{ gap: 2, flex: 1 }}>
                    <Text style={{ fontFamily: fonts.medium, fontSize: 12, color: colors.muted }}>Trạm áp dụng</Text>
                    <Text style={{ fontFamily: fonts.bold, fontSize: 16, color: colors.ink }}>
                      {currentStation.name || "Trạm của bạn"}
                    </Text>
                    {currentStation.address ? (
                      <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.muted }}>
                        {currentStation.address}
                      </Text>
                    ) : null}
                  </View>
                  <Badge label="Trạm của bạn" tone="primary" />
                </View>
              ) : null}

              <View style={{ gap: 8, marginTop: 4 }}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  <Text style={{ fontFamily: fonts.bold, fontSize: 14, color: colors.ink, flex: 1 }}>
                    {`2. Chọn mặt hàng (${selectedItemIds.length} món đã chọn)`}
                  </Text>
                  {availableUnaddedItems.length > 0 ? (
                    <Button
                      label={selectedItemIds.length === availableUnaddedItems.length ? "Bỏ chọn tất cả" : `Chọn tất cả (${availableUnaddedItems.length})`}
                      tone="ghost"
                      onPress={selectedItemIds.length === availableUnaddedItems.length ? clearSelection : selectAllUnadded}
                    />
                  ) : null}
                </View>

                <TextField
                  label="Tìm kiếm theo tên mặt hàng..."
                  value={itemSearch}
                  onChangeText={setItemSearch}
                />

                <View style={{ gap: 6 }}>
                  {filteredItems.map((it) => {
                    const inStock = rows?.some((line) => {
                      const lineItemId = typeof line.itemTypeId === "object" ? line.itemTypeId?._id : line.itemTypeId;
                      const lineStationId = typeof line.stationId === "object" ? line.stationId?._id : line.stationId;
                      return lineItemId === it._id && (!selectedStationId || lineStationId === selectedStationId);
                    });
                    const isSelected = selectedItemIds.includes(it._id);
                    const unitText = unitSpoken(it.unit || "");

                    if (inStock) {
                      return (
                        <View
                          key={it._id}
                          style={{
                            padding: 10,
                            borderRadius: 10,
                            borderWidth: 1,
                            borderColor: colors.hairline,
                            backgroundColor: colors.surfaceLow,
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 8,
                            opacity: 0.65,
                          }}
                        >
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontFamily: fonts.medium, fontSize: 14, color: colors.ink }}>
                              {it.name}
                            </Text>
                            <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.muted }}>
                              {`Đơn vị: ${unitText}`}
                            </Text>
                          </View>
                          <Badge label="Đã có trong kho" tone="neutral" />
                        </View>
                      );
                    }

                    return (
                      <Tap
                        key={it._id}
                        onPress={() => toggleSelectItem(it._id)}
                        style={{
                          padding: 10,
                          borderRadius: 10,
                          borderWidth: isSelected ? 2 : 1,
                          borderColor: isSelected ? colors.primary : colors.hairline,
                          backgroundColor: isSelected ? colors.primarySoft : colors.card,
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 8,
                        }}
                      >
                        <View style={{ flex: 1 }}>
                          <Text
                            style={{
                              fontFamily: fonts.bold,
                              fontSize: 14,
                              color: isSelected ? colors.primary : colors.ink,
                            }}
                          >
                            {it.name}
                          </Text>
                          <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.muted }}>
                            {`Đơn vị tính: ${unitText}`}
                          </Text>
                        </View>
                        <Badge
                          label={isSelected ? "✓ Đã chọn" : "+ Chọn"}
                          tone={isSelected ? "primary" : "neutral"}
                        />
                      </Tap>
                    );
                  })}
                </View>
              </View>

              {selectedItemIds.length > 0 ? (
                <View style={{ gap: 10, marginTop: 10, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.hairline }}>
                  <Text style={{ fontFamily: fonts.bold, fontSize: 15, color: colors.ink }}>
                    {`3. Nhập số lượng ban đầu (${selectedItemIds.length} món đã chọn)`}
                  </Text>

                  {selectedItemIds.map((id) => {
                    const it = items.rows?.find((row) => row._id === id);
                    if (!it) return null;
                    const unitText = unitSpoken(it.unit || "");
                    return (
                      <View
                        key={id}
                        style={{
                          backgroundColor: colors.surface,
                          borderWidth: 1,
                          borderColor: colors.hairline,
                          borderRadius: 10,
                          padding: 10,
                          gap: 6,
                        }}
                      >
                        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                          <Text style={{ flex: 1, fontFamily: fonts.bold, fontSize: 14, color: colors.ink }}>
                            {it.name}
                          </Text>
                          <Button
                            label="Bỏ chọn"
                            tone="ghost"
                            onPress={() => toggleSelectItem(id)}
                          />
                        </View>

                        <TextField
                          label={`Số lượng tồn ban đầu (${unitText})`}
                          value={quantities[id] || "0"}
                          onChangeText={(val) => setQuantities((prev) => ({ ...prev, [id]: val }))}
                          keyboardType="decimal-pad"
                        />
                      </View>
                    );
                  })}

                  <TextField
                    label="Lý do nhập kho / tạo mới (áp dụng cho tất cả món trên)"
                    value={newReason}
                    onChangeText={setNewReason}
                  />

                  <Button
                    label={creating ? "Đang thêm..." : `Xác nhận thêm ${selectedItemIds.length} mặt hàng vào kho trạm`}
                    disabled={creating}
                    onPress={handleBatchCreateStock}
                  />
                </View>
              ) : (
                <Body muted>Chạm vào một hoặc nhiều mặt hàng ở trên để chọn thêm vào kho trạm.</Body>
              )}
            </Fold>
          ) : null}

          {rows && rows.length === 0 && !stock.error ? (
            <Body muted>Chưa có hàng trong kho trạm.</Body>
          ) : null}

          {rows?.map((row) => {
            const station = refName(row.stationId, "Trạm");
            const available = row.availableQuantity ?? row.quantity;
            const unitLabel = unitSpoken(row.unit);
            const isEditing = editingId === row._id;
            const isDeleting = deletingId === row._id;

            return (
              <Card key={row._id}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                  <Text style={{ flex: 1, fontFamily: fonts.bold, fontSize: 18, color: colors.ink }}>
                    {refName(row.itemTypeId, "Vật phẩm")}
                  </Text>
                  <Badge label={station} tone="primary" />
                </View>

                <StatRow
                  items={[
                    { label: "Còn gửi được", value: available, unit: unitLabel, tone: "primary" },
                    { label: "Tổng tồn", value: row.quantity, unit: unitLabel, tone: "ink" },
                    { label: "Đang giữ", value: row.reservedQuantity || 0, unit: unitLabel, tone: "coral" },
                  ]}
                />

                {canWrite ? (
                  isEditing ? (
                    <View style={{ gap: 10, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.hairline }}>
                      <Text style={{ fontFamily: fonts.bold, fontSize: 15, color: colors.ink }}>
                        Điều chỉnh số tồn kho (Kiểm kê)
                      </Text>
                      <Body muted>{`Số tồn hiện tại: ${row.quantity} ${unitLabel}. Nhập số tồn thực tế sau khi kiểm đếm.`}</Body>
                      <TextField
                        label={`Số lượng tồn mới (${unitLabel})`}
                        value={editQty}
                        onChangeText={setEditQty}
                        keyboardType="decimal-pad"
                      />
                      <TextField
                        label="Lý do điều chỉnh (Kiểm kê, hao hụt...)"
                        value={editReason}
                        onChangeText={setEditReason}
                      />
                      {(() => {
                        const delta = Number(editQty) - row.quantity;
                        if (!Number.isFinite(delta) || editQty.trim() === "") return null;
                        const deltaStr = delta > 0 ? `+${delta}` : String(delta);
                        return (
                          <Body muted>{`Biến động: ${deltaStr} ${unitLabel} (sẽ được tự động ghi vào sổ cái lịch sử giao dịch kho).`}</Body>
                        );
                      })()}
                      <View style={{ flexDirection: "row", gap: 8 }}>
                        <View style={{ flex: 1 }}>
                          <Button
                            label={saving ? "Đang lưu..." : "Xác nhận điều chỉnh"}
                            disabled={saving}
                            onPress={() => handleSaveAdjustment(row)}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Button
                            label="Hủy"
                            tone="ghost"
                            disabled={saving}
                            onPress={() => {
                              setEditingId(null);
                              setEditQty("");
                              setEditReason("");
                              setActionError("");
                            }}
                          />
                        </View>
                      </View>
                    </View>
                  ) : isDeleting ? (
                    <View style={{ gap: 10, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.hairline }}>
                      <Text style={{ fontFamily: fonts.bold, fontSize: 15, color: colors.error }}>
                        Xác nhận xóa vật phẩm trong kho
                      </Text>
                      <Body muted>{`Thao tác này sẽ đặt số tồn (${row.quantity} ${unitLabel}) về 0 và xóa vật phẩm "${refName(row.itemTypeId, "Vật phẩm")}" khỏi kho trạm. Lịch sử xóa sẽ được lưu vào sổ cái.`}</Body>
                      <TextField
                        label="Lý do xóa vật phẩm trong kho (bắt buộc)"
                        value={deleteReason}
                        onChangeText={setDeleteReason}
                      />
                      <View style={{ flexDirection: "row", gap: 8 }}>
                        <View style={{ flex: 1 }}>
                          <Button
                            label={deleting ? "Đang xóa..." : "Xác nhận xóa"}
                            tone="danger"
                            disabled={deleting}
                            onPress={() => handleConfirmDelete(row)}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Button
                            label="Hủy"
                            tone="ghost"
                            disabled={deleting}
                            onPress={() => {
                              setDeletingId(null);
                              setDeleteReason("");
                              setActionError("");
                            }}
                          />
                        </View>
                      </View>
                    </View>
                  ) : (
                    <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
                      <View style={{ flex: 1 }}>
                        <Button
                          label="Điều chỉnh số tồn"
                          tone="ghost"
                          onPress={() => handleStartEdit(row)}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Button
                          label="Xóa vật phẩm trong kho"
                          tone="danger"
                          onPress={() => handleStartDelete(row)}
                        />
                      </View>
                    </View>
                  )
                ) : null}
              </Card>
            );
          })}
        </>
      ) : (
        <>
          <Note text={history.error} />
          <Button label="Làm mới lịch sử" tone="ghost" onPress={() => history.reload()} />

          {historyRows && historyRows.length === 0 && !history.error ? (
            <Body muted>Chưa có giao dịch kho nào được ghi nhận cho trạm của bạn.</Body>
          ) : null}

          {historyRows?.map((tx) => {
            const badge = transactionTypeBadge(tx.type);
            const performer = tx.performedBy && typeof tx.performedBy === "object"
              ? tx.performedBy.fullName || tx.performedBy.username || "Nhân viên"
              : "Nhân viên";
            const unitLabel = unitSpoken(tx.unit);
            const deltaStr = tx.quantityDelta > 0
              ? `+${tx.quantityDelta} ${unitLabel}`
              : `${tx.quantityDelta} ${unitLabel}`;
            const station = refName(tx.stationId, "Trạm");
            const counterStation = refName(tx.counterpartyStationId || undefined, "");
            const campaign = tx.campaignId && typeof tx.campaignId === "object" ? tx.campaignId.title : "";

            return (
              <Card key={tx._id}>
                {/* Dòng ngày giờ nổi bật ở đầu thẻ */}
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    backgroundColor: colors.primarySoft,
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: 8,
                    marginBottom: 4,
                    gap: 8,
                  }}
                >
                  <Text style={{ fontFamily: fonts.bold, fontSize: 13, color: colors.primary }}>
                    {`🕒 ${formatTxDate(tx.createdAt)}`}
                  </Text>
                  <Text style={{ fontFamily: fonts.semibold, fontSize: 12, color: colors.primary }}>
                    {station}
                  </Text>
                </View>

                {/* Tên món & loại giao dịch */}
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                  <Text style={{ flex: 1, fontFamily: fonts.bold, fontSize: 18, color: colors.ink }}>
                    {refName(tx.itemTypeId, "Vật phẩm")}
                  </Text>
                  <Badge label={badge.label} tone={badge.tone} />
                </View>

                {/* Thống kê biến động */}
                <StatRow
                  items={[
                    { label: "Biến động", value: deltaStr, tone: tx.quantityDelta >= 0 ? "primary" : "coral" },
                    { label: "Trước", value: tx.balanceBefore, unit: unitLabel, tone: "ink" },
                    { label: "Sau", value: tx.balanceAfter, unit: unitLabel, tone: "primary" },
                  ]}
                />

                {/* Thông tin lý do & người thực hiện */}
                <View style={{ gap: 4, marginTop: 4, paddingTop: 6, borderTopWidth: 1, borderTopColor: colors.hairline }}>
                  <Body muted>{`Lý do: ${tx.description || "Không có ghi chú"}`}</Body>
                  <Body muted>{`Người thực hiện: ${performer}`}</Body>
                  {counterStation ? <Body muted>{`Trạm đối tác: ${counterStation}`}</Body> : null}
                  {campaign ? <Body muted>{`Chiến dịch: ${campaign}`}</Body> : null}
                </View>
              </Card>
            );
          })}
        </>
      )}
    </OpsGate>
  );
}

export function ReliefWork() {
  const lots = useRows((token) => backend.listRelief(token).then((data) => data.data as Row[]));
  const campaigns = useRows(async () => (await backend.listCampaigns()).campaigns as Row[]);
  const stations = useRows((token) => backend.listStations(token).then((data) => data.data as Row[]));
  const items = useRows(async () => (await backend.listItemTypes()).itemTypes as Row[]);
  const job = useJob();
  const role = useRole();
  const canWrite = can(role, ["ADMIN", "STATION_MANAGER", "STAFF"]);
  const [picked, setPicked] = useState("");
  const [campaignId, setCampaignId] = useState("");
  const [stationId, setStationId] = useState("");
  const [itemId, setItemId] = useState("");
  const [recipient, setRecipient] = useState("");
  const [quantity, setQuantity] = useState("1");

  return (
    <OpsGate>
      <Title>Giao hàng</Title>
      <RoleNote />
      <Note text={lots.error || job.note} />
      <PickList
        rows={lots.rows}
        selected={picked}
        onPick={setPicked}
        detail={(row) => `${row.code || ""} · ${reliefLabel(row.status || "")} · ${row.recipientName || ""}`}
        panel={(row) => canWrite ? (
          <>
            {(reliefNext[row.status || ""] || []).map((status) => (
              <Button key={status} label={reliefLabel(status)} tone={status === "CANCELLED" ? "danger" : "ghost"} onPress={() => void job.run((token) => backend.updateReliefStatus(token, row._id, { status, closeCampaign: false })).then((ok) => ok && lots.reload())} />
            ))}
            {["PLANNED", "IN_PROGRESS"].includes(row.status || "") ? <Button label="Hoàn tất và đóng chiến dịch" tone="danger" onPress={() => void job.run((token) => backend.updateReliefStatus(token, row._id, { status: "COMPLETED", closeCampaign: true })).then((ok) => ok && lots.reload())} /> : null}
          </>
        ) : null}
      />
      {canWrite ? (
        <Fold title="Đợt mới">
          <PickList rows={campaigns.rows} selected={campaignId} onPick={setCampaignId} detail={(row) => donorLabel({ status: row.status || "" })} />
          <PickList rows={stations.rows} selected={stationId} onPick={setStationId} detail={(row) => row.address || ""} />
          <TextField label="Tên người nhận" value={recipient} onChangeText={setRecipient} />
          <PickList rows={items.rows} selected={itemId} onPick={setItemId} detail={(row) => unitSpoken(row.unit || "")} />
          <TextField label="Số lượng" value={quantity} onChangeText={setQuantity} />
          <Button
            label="Ghi đợt giao"
            onPress={() => void job.run((token) => backend.createRelief(token, {
              campaignId,
              stationId,
              recipientName: recipient.trim(),
              closeCampaign: false,
              items: line(itemId, quantity, items.rows?.find((row) => row._id === itemId)?.unit || ""),
            })).then((ok) => ok && lots.reload())}
          />
        </Fold>
      ) : <Body muted>Vai trò này chỉ xem đợt giao.</Body>}
    </OpsGate>
  );
}

function appStatusLabel(status?: string) {
  if (status === "APPROVED") return "Đã duyệt & giao việc";
  if (status === "REJECTED") return "Đã từ chối";
  if (status === "CANCELLED") return "Đã hủy";
  return "Chờ duyệt";
}

function stationTitleOf(value: Row["stationId"]) {
  if (!value || typeof value === "string") return "";
  return value.name || "";
}

function stationIdOf(value: Row["stationId"]) {
  if (!value) return "";
  return typeof value === "string" ? value : value._id || "";
}

type ScheduleField = "startDate" | "startTime" | "endDate" | "endTime" | "deadlineDate" | "deadlineTime";
type ScheduleMode = "date" | "time";

function dateValue(value: Date, mode: ScheduleMode) {
  const pad = (part: number) => String(part).padStart(2, "0");
  return mode === "date"
    ? `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`
    : `${pad(value.getHours())}:${pad(value.getMinutes())}`;
}

function startOfDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function taskDateTime(date: Date | null, time: Date | null) {
  return date && time ? `${dateValue(date, "date")}T${dateValue(time, "time")}+07:00` : undefined;
}

export function CrewWork() {
  const tasks = useRows((token) => backend.listTasks(token).then((data) => data.data as Row[]));
  const campaigns = useRows(async () => (await backend.listCampaigns()).campaigns as Row[]);
  const stations = useRows((token) => backend.listStations(token).then((data) => data.data as Row[]));
  const job = useJob();
  const createTaskJob = useJob();
  const role = useRole();
  const { user } = useSession();
  const canTask = can(role, ["ADMIN", "STATION_MANAGER", "STAFF"]);
  const canCreateTask = can(role, ["ADMIN", "STATION_MANAGER", "STAFF"]);
  const canApproveJoin = can(role, ["ADMIN", "STATION_MANAGER"]);
  const [taskId, setTaskId] = useState("");
  const [filterStationId, setFilterStationId] = useState("");
  const [onlyPending, setOnlyPending] = useState(false);
  const [campaignId, setCampaignId] = useState("");
  const [stationId, setStationId] = useState("");
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [endTime, setEndTime] = useState<Date | null>(null);
  const [needed, setNeeded] = useState("1");
  const [deadlineDate, setDeadlineDate] = useState<Date | null>(null);
  const [deadlineTime, setDeadlineTime] = useState<Date | null>(null);
  const [points, setPoints] = useState("25");
  const [taskImage, setTaskImage] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDetail, setEditDetail] = useState("");
  const [editPoints, setEditPoints] = useState("");
  const [editImage, setEditImage] = useState<string | null>(null);
  const [activePicker, setActivePicker] = useState<{ field: ScheduleField; mode: ScheduleMode } | null>(null);
  const [people, setPeople] = useState<Row[] | null>(null);
  const [peopleError, setPeopleError] = useState("");
  const [registrationId, setRegistrationId] = useState("");
  const [applicants, setApplicants] = useState<Row[] | null>(null);
  const [applicantsError, setApplicantsError] = useState("");
  const [joinStamp, setJoinStamp] = useState(0);
  const [applyStamp, setApplyStamp] = useState(0);
  const profileStationId = user?.stations?.[0]?._id ?? "";

  useEffect(() => {
    if (!stationId && profileStationId) setStationId(profileStationId);
  }, [profileStationId, stationId]);

  const scheduleValues: Record<ScheduleField, Date | null> = {
    startDate,
    startTime,
    endDate,
    endTime,
    deadlineDate,
    deadlineTime,
  };
  const scheduleSetters: Record<ScheduleField, (value: Date | null) => void> = {
    startDate: setStartDate,
    startTime: setStartTime,
    endDate: setEndDate,
    endTime: setEndTime,
    deadlineDate: setDeadlineDate,
    deadlineTime: setDeadlineTime,
  };
  const today = startOfDay(new Date());
  const earliestEndDate = startDate ? startOfDay(startDate) : null;
  const startAt = startDate && startTime ? new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), startTime.getHours(), startTime.getMinutes()) : null;
  const endAt = endDate && endTime ? new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), endTime.getHours(), endTime.getMinutes()) : null;
  const startDateError = startDate && startOfDay(startDate) < today
    ? "Ngày bắt đầu không thể trước hôm nay."
    : startAt && startAt.getTime() <= Date.now()
      ? "Giờ bắt đầu phải ở tương lai."
      : "";
  const endDateError = startAt && endAt && endAt.getTime() <= startAt.getTime()
    ? "Giờ kết thúc phải sau giờ bắt đầu."
    : "";
  const neededError = !Number.isInteger(Number(needed)) || Number(needed) < 1
    ? "Số người cần phải lớn hơn hoặc bằng 1."
    : "";
  const formWarning = [startDateError, endDateError, neededError].filter(Boolean).join(" ");
  const updateScheduleValue = (field: ScheduleField, mode: ScheduleMode, rawValue: string) => {
    if (!rawValue) {
      scheduleSetters[field](null);
      return;
    }
    const currentValue = scheduleValues[field];
    const value = currentValue ? new Date(currentValue) : new Date();
    if (mode === "date") {
      const [year, month, day] = rawValue.split("-").map(Number);
      value.setFullYear(year, month - 1, day);
    } else {
      const [hours, minutes] = rawValue.split(":").map(Number);
      value.setHours(hours, minutes, 0, 0);
    }
    scheduleSetters[field](value);
  };
  const renderScheduleField = (label: string, field: ScheduleField, mode: ScheduleMode) => {
    const value = scheduleValues[field];
    const minimumDate = field === "startDate"
      ? today
      : field === "endDate"
        ? earliestEndDate
        : null;
    const fieldError = field === "startDate" ? startDateError : field === "endDate" ? endDateError : "";
    if (Platform.OS === "web") {
      return (
        <View key={field} style={{ gap: 6 }}>
          <Text style={{ fontFamily: fonts.medium, fontSize: 13, color: colors.muted }}>{label}</Text>
          {createElement("input", {
            type: mode,
            value: value ? dateValue(value, mode) : "",
            ...(minimumDate ? { min: dateValue(minimumDate, "date") } : {}),
            onChange: (event: ChangeEvent<HTMLInputElement>) => updateScheduleValue(field, mode, event.currentTarget.value),
            "aria-label": label,
            style: {
              boxSizing: "border-box",
              width: "100%",
              minHeight: 48,
              borderRadius: 12,
              border: `1px solid ${colors.hairline}`,
              backgroundColor: colors.surface,
              padding: "0 12px",
              fontFamily: fonts.regular,
              fontSize: 16,
              color: colors.ink,
            },
          })}
          {fieldError ? <Text style={{ color: colors.error, fontFamily: fonts.medium, fontSize: 13 }}>{fieldError}</Text> : null}
        </View>
      );
    }
    return (
      <View key={field} style={{ gap: 6 }}>
        <Text style={{ fontFamily: fonts.medium, fontSize: 13, color: colors.muted }}>{label}</Text>
        <Button
          label={value ? dateValue(value, mode) : mode === "date" ? "Chọn ngày" : "Chọn giờ"}
          tone="ghost"
          onPress={() => setActivePicker({ field, mode })}
        />
        {fieldError ? <Text style={{ color: colors.error, fontFamily: fonts.medium, fontSize: 13 }}>{fieldError}</Text> : null}
      </View>
    );
  };

  function onSchedulePickerChange(event: DateTimePickerEvent, value?: Date) {
    if (event.type === "dismissed") {
      setActivePicker(null);
      return;
    }
    if (activePicker && value) {
      if (activePicker.field === "startDate" && startOfDay(value) < today) return;
      if (activePicker.field === "endDate" && earliestEndDate && startOfDay(value) < earliestEndDate) return;
      scheduleSetters[activePicker.field](value);
    }
    if (Platform.OS === "android") setActivePicker(null);
  }

  useEffect(() => {
    if (!job.token || !campaignId) {
      setPeople(null);
      return;
    }
    let cancelled = false;
    setPeopleError("");
    backend.campaignVolunteers(job.token, campaignId)
      .then((data) => {
        const payload = data as { data?: Array<Row & { userId?: { _id?: string; fullName?: string; username?: string; phone?: string; email?: string } | string }> };
        if (!cancelled) setPeople((payload.data || []).map(asPerson));
      })
      .catch((caught) => {
        if (!cancelled) {
          setPeople(null);
          setPeopleError(caught instanceof ApiError ? caught.message : "Không tải được đơn tham gia.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [job.token, campaignId, joinStamp]);

  useEffect(() => {
    if (!job.token || !taskId) {
      setApplicants(null);
      setApplicantsError("");
      return;
    }
    let cancelled = false;
    setApplicants(null);
    setApplicantsError("");
    backend.taskApplications(job.token, taskId)
      .then((data) => {
        const payload = data as { data?: Array<Row & { userId?: { _id?: string; fullName?: string; username?: string; phone?: string; email?: string } | string }> };
        if (!cancelled) setApplicants((payload.data || []).map(asPerson));
      })
      .catch((caught) => {
        if (!cancelled) {
          setApplicants([]);
          setApplicantsError(caught instanceof ApiError ? caught.message : "Không tải được danh sách ứng tuyển.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [job.token, taskId, applyStamp]);

  const allTasks = tasks.rows ?? [];
  useEffect(() => {
    const row = allTasks.find((item) => item._id === taskId);
    setEditTitle(row?.title || "");
    setEditDetail(row?.description || "");
    setEditPoints(String(row?.rewardPoints ?? 0));
    setEditImage(row?.imageUrl || null);
  }, [taskId, tasks.rows]);
  const pendingTotal = allTasks.reduce((sum, row) => sum + (row.slots?.pending ?? 0), 0);
  const tasksWithPending = allTasks.filter((row) => (row.slots?.pending ?? 0) > 0).length;
  const visibleTasks = tasks.rows
    ? allTasks.filter((row) => {
        if (onlyPending && (row.slots?.pending ?? 0) === 0) return false;
        if (filterStationId && stationIdOf(row.stationId) !== filterStationId) return false;
        return true;
      })
    : null;

  return (
    <OpsGate>
      <Title>Nhân sự & Tình nguyện viên</Title>
      <RoleNote />
      <Note text={tasks.error || peopleError || applicantsError || job.note} />
      {tasks.rows ? (
        <StatRow
          items={[
            { label: "Tổng việc", value: allTasks.length, unit: "việc", tone: "ink" },
            { label: "Đang mở tuyển", value: allTasks.filter((row) => row.recruitmentStatus === "OPEN").length, unit: "việc", tone: "primary" },
            { label: "Đơn chờ duyệt", value: pendingTotal, unit: "đơn", tone: "coral" },
          ]}
        />
      ) : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        <Pill label={`Tất cả việc (${allTasks.length})`} active={!onlyPending} onPress={() => setOnlyPending(false)} />
        <Pill label={`Có đơn chờ duyệt (${tasksWithPending})`} active={onlyPending} onPress={() => setOnlyPending(true)} />
      </ScrollView>
      {stations.rows && stations.rows.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          <Pill label="Tất cả trạm" active={filterStationId === ""} onPress={() => setFilterStationId("")} />
          {stations.rows.map((st) => (
            <Pill key={st._id} label={st.name || "Trạm"} active={filterStationId === st._id} onPress={() => setFilterStationId(st._id)} />
          ))}
        </ScrollView>
      ) : null}
      <PickList
        rows={visibleTasks}
        selected={taskId}
        onPick={setTaskId}
        detail={(row) => {
          const stName = stationTitleOf(row.stationId);
          const pending = row.slots?.pending ?? 0;
          const approved = row.slots?.approved ?? 0;
          const total = row.slots?.total ?? 0;
          return [
            stName || "Chưa rõ trạm",
            pending > 0 ? `Chờ duyệt: ${pending} đơn` : null,
            `Chỗ: ${approved}/${total}`,
            `${row.status || ""} · ${row.recruitmentStatus || ""}`,
          ].filter(Boolean).join(" · ");
        }}
        panel={(row) => canTask ? (
          <View style={{ gap: 10 }}>
            {editImage ? <Photo uri={editImage} height={160} radius={12} /> : <Body muted>Tin này chưa có ảnh.</Body>}
            <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
              <Button
                label="Chọn ảnh tin"
                tone="ghost"
                onPress={() => void job.run(async (token) => {
                  const file = await pickImage();
                  if (!file) return { message: "Chưa chọn ảnh." };
                  const uploaded = await backend.uploadTaskImage(token, file);
                  setEditImage(uploaded.imageUrl);
                  return { message: "Đã tải ảnh. Bấm lưu để gắn vào tin." };
                })}
              />
              {editImage ? <Button label="Gỡ ảnh" tone="danger" onPress={() => setEditImage(null)} /> : null}
            </View>
            <TextField label="Tên việc" value={editTitle} onChangeText={setEditTitle} />
            <TextField label="Mô tả" value={editDetail} onChangeText={setEditDetail} />
            <TextField label="Điểm thưởng" value={editPoints} onChangeText={(value) => setEditPoints(value.replace(/\D/g, ""))} keyboardType="number-pad" />
            <Button
              label="Lưu tin"
              onPress={() => {
                if (!editTitle.trim()) {
                  job.fail("Vui lòng nhập tên công việc.");
                  return;
                }
                void job.run((token) => backend.updateTask(token, row._id, {
                  title: editTitle.trim(),
                  description: editDetail.trim(),
                  rewardPoints: Number(editPoints) || 0,
                  imageUrl: editImage,
                })).then((ok) => ok && tasks.reload());
              }}
            />
            {stationTitleOf(row.stationId) ? <Body muted>{`Trạm: ${stationTitleOf(row.stationId)}`}</Body> : null}
            <Text style={{ fontFamily: fonts.bold, fontSize: 15, color: colors.ink }}>
              {`Tình nguyện viên ứng tuyển (${applicants ? applicants.length : "…"})`}
            </Text>
            {applicants === null ? <Body muted>Đang tải danh sách ứng tuyển...</Body> : null}
            {applicants && applicants.length === 0 ? <Body muted>Chưa có tình nguyện viên nào ứng tuyển việc này.</Body> : null}
            {applicants?.map((app) => (
              <Card key={app._id} style={{ backgroundColor: colors.surfaceLow, padding: 12, gap: 8 }}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                  <Text style={{ fontFamily: fonts.bold, fontSize: 15, color: colors.ink }}>
                    {app.fullName || app.username || "Tình nguyện viên"}
                  </Text>
                  <Badge
                    label={appStatusLabel(app.status)}
                    tone={app.status === "APPROVED" ? "primary" : app.status === "REJECTED" ? "danger" : "coral"}
                  />
                </View>
                {[app.phone, app.email, app.username ? `@${app.username}` : ""].filter(Boolean).length > 0 ? (
                  <Body muted>{[app.phone, app.email, app.username ? `@${app.username}` : ""].filter(Boolean).join(" · ")}</Body>
                ) : null}
                {app.status === "PENDING" ? (
                  <View style={{ gap: 8 }}>
                    <Button
                      label={job.busy ? "Đang xử lý..." : "Duyệt tình nguyện viên"}
                      onPress={() => void job.run((token) => backend.reviewTaskApplication(token, app._id, { status: "APPROVED" })).then((ok) => {
                        if (!ok) return;
                        setApplyStamp((value) => value + 1);
                        tasks.reload();
                      })}
                    />
                    <Button
                      label="Từ chối đơn"
                      tone="danger"
                      onPress={() => void job.run((token) => backend.reviewTaskApplication(token, app._id, { status: "REJECTED" })).then((ok) => {
                        if (!ok) return;
                        setApplyStamp((value) => value + 1);
                        tasks.reload();
                      })}
                    />
                  </View>
                ) : null}
              </Card>
            ))}
            <View style={{ gap: 8, paddingTop: 6, borderTopWidth: 1, borderTopColor: colors.hairline }}>
              {row.recruitmentStatus === "OPEN" ? (
                <Button label="Đóng tuyển" tone="ghost" onPress={() => void job.run((token) => backend.updateTask(token, row._id, { recruitmentStatus: "CLOSED" })).then((ok) => ok && tasks.reload())} />
              ) : row.status !== "CANCELLED" ? (
                <Button label="Mở tuyển lại" tone="ghost" onPress={() => void job.run((token) => backend.updateTask(token, row._id, { recruitmentStatus: "OPEN" })).then((ok) => ok && tasks.reload())} />
              ) : null}
              {row.status !== "CANCELLED" ? (
                <Button label="Hủy việc này" tone="danger" onPress={() => void job.run((token) => backend.updateTask(token, row._id, { status: "CANCELLED", recruitmentStatus: "CLOSED" })).then((ok) => ok && tasks.reload())} />
              ) : null}
            </View>
          </View>
        ) : null}
      />
      {canCreateTask ? (
        <Fold title="Đăng tin tuyển">
          <PickList rows={stations.rows} selected={stationId} onPick={setStationId} detail={(row) => row.address || ""} />
          <TextField label="Tên việc" value={title} onChangeText={setTitle} />
          <TextField label="Mô tả ngắn" value={detail} onChangeText={setDetail} />
          {renderScheduleField("Ngày bắt đầu", "startDate", "date")}
          {renderScheduleField("Giờ bắt đầu", "startTime", "time")}
          {renderScheduleField("Ngày kết thúc", "endDate", "date")}
          {renderScheduleField("Giờ kết thúc", "endTime", "time")}
          <TextField label="Số người cần" value={needed} onChangeText={(value) => setNeeded(value.replace(/\D/g, ""))} keyboardType="number-pad" />
          {neededError ? <Text style={{ color: colors.error, fontFamily: fonts.medium, fontSize: 13 }}>{neededError}</Text> : null}
          {renderScheduleField("Ngày hạn đăng ký (không bắt buộc)", "deadlineDate", "date")}
          {renderScheduleField("Giờ hạn đăng ký (không bắt buộc)", "deadlineTime", "time")}
          <TextField label="Điểm thưởng" value={points} onChangeText={(value) => setPoints(value.replace(/\D/g, ""))} keyboardType="number-pad" />
          {taskImage ? <Photo uri={taskImage} height={160} radius={12} /> : <Body muted>Chưa chọn ảnh cho tin.</Body>}
          <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
            <Button
              label="Chọn ảnh tin"
              tone="ghost"
              onPress={() => void createTaskJob.run(async (token) => {
                const file = await pickImage();
                if (!file) return { message: "Chưa chọn ảnh." };
                const uploaded = await backend.uploadTaskImage(token, file);
                setTaskImage(uploaded.imageUrl);
                return { message: "Đã tải ảnh. Ảnh sẽ gắn khi đăng tin." };
              })}
            />
            {taskImage ? <Button label="Gỡ ảnh" tone="danger" onPress={() => setTaskImage(null)} /> : null}
          </View>
          {activePicker && Platform.OS !== "web" ? (
            <View style={{ gap: 8 }}>
              <DateTimePicker
                value={scheduleValues[activePicker.field] || new Date()}
                mode={activePicker.mode}
                display={Platform.OS === "ios" ? "spinner" : "default"}
                minimumDate={activePicker.mode === "date"
                  ? activePicker.field === "startDate" ? today : activePicker.field === "endDate" ? earliestEndDate ?? undefined : undefined
                  : undefined}
                onChange={onSchedulePickerChange}
              />
              {Platform.OS === "ios" ? <Button label="Xong" onPress={() => setActivePicker(null)} /> : null}
            </View>
          ) : null}
          <Button
            label={createTaskJob.busy ? "Đang đăng tin..." : "Đăng tin"}
            disabled={Boolean(startDateError || endDateError || neededError || createTaskJob.busy)}
            onPress={() => {
              if (startDateError || endDateError || neededError) return;
              if (!stationId) {
                createTaskJob.fail("Vui lòng chọn trạm cho công việc tình nguyện.");
                return;
              }
              if (!title.trim()) {
                createTaskJob.fail("Vui lòng nhập tên công việc.");
                return;
              }
              if (!startDate || !startTime || !endDate || !endTime) {
                createTaskJob.fail("Vui lòng chọn đầy đủ cả Ngày và Giờ bắt đầu, Ngày và Giờ kết thúc.");
                return;
              }
              const payload = {
                ...(campaignId ? { campaignId } : {}),
                stationId,
                title: title.trim(),
                description: detail.trim(),
                startTime: taskDateTime(startDate, startTime),
                endTime: taskDateTime(endDate, endTime),
                requiredVolunteers: Number(needed),
                ...(taskDateTime(deadlineDate, deadlineTime) ? { volunteerDeadline: taskDateTime(deadlineDate, deadlineTime) } : {}),
                recruitmentStatus: "OPEN",
                rewardPoints: Number(points) || 0,
                ...(taskImage ? { imageUrl: taskImage } : {}),
              };
              console.info("[Đăng tin tuyển] Submitting task", payload);
              void createTaskJob.run((token) => backend.createTask(token, payload)).then((ok) => {
                if (ok) {
                  console.info("[Đăng tin tuyển] Task created successfully", { stationId, title: payload.title, requiredVolunteers: payload.requiredVolunteers });
                  tasks.reload();
                  return;
                }
                console.error("[Đăng tin tuyển] Task creation failed", { stationId, title: payload.title, requiredVolunteers: payload.requiredVolunteers });
              });
            }}
          />
          <Note text={createTaskJob.note} error={createTaskJob.isError} />
        </Fold>
      ) : null}
      <Title>Đơn tham gia chiến dịch</Title>
      <Body muted>Chọn chiến dịch bên dưới để xem tình nguyện viên đăng ký theo chiến dịch.</Body>
      {campaigns.rows && campaigns.rows.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {campaigns.rows.map((camp) => (
            <Pill
              key={camp._id}
              label={camp.title || "Chiến dịch"}
              active={campaignId === camp._id}
              onPress={() => {
                setCampaignId(camp._id);
                setRegistrationId("");
              }}
            />
          ))}
        </ScrollView>
      ) : null}
      {can(role, ["ADMIN", "STATION_MANAGER", "STAFF"]) && campaignId ? (
        <PickList
          rows={people}
          selected={registrationId}
          onPick={setRegistrationId}
          detail={(row) => [row.phone, row.status || ""].filter(Boolean).join(" · ")}
          panel={(row) => canApproveJoin ? (
            <View style={{ gap: 8 }}>
              {row.status !== "APPROVED" ? (
                <Button label="Duyệt đơn tham gia" onPress={() => void job.run((token) => backend.updateVolunteerStatus(token, row._id, { status: "APPROVED" })).then((ok) => ok && setJoinStamp((value) => value + 1))} />
              ) : null}
              {row.status !== "REJECTED" ? (
                <Button label="Từ chối đơn tham gia" tone="danger" onPress={() => void job.run((token) => backend.updateVolunteerStatus(token, row._id, { status: "REJECTED" })).then((ok) => ok && setJoinStamp((value) => value + 1))} />
              ) : null}
              {row.status !== "CANCELLED" ? (
                <Button label="Hủy đơn tham gia" tone="ghost" onPress={() => void job.run((token) => backend.updateVolunteerStatus(token, row._id, { status: "CANCELLED" })).then((ok) => ok && setJoinStamp((value) => value + 1))} />
              ) : null}
            </View>
          ) : (
            <Body muted>Nhân viên xem được đơn tham gia chiến dịch. Chỉ Admin và Quản lý trạm duyệt đơn đó.</Body>
          )}
        />
      ) : (
        <Body muted>Bấm chọn một chiến dịch ở trên để xem danh sách đăng ký.</Body>
      )}
    </OpsGate>
  );
}

export function RewardWork() {
  const achievements = useRows(async () => (await backend.listAchievements()).achievements as Row[]);
  const campaigns = useRows(async () => (await backend.listCampaigns()).campaigns as Row[]);
  const job = useJob();
  const role = useRole();
  const canAward = can(role, ["ADMIN", "ORG_MANAGER", "STATION_MANAGER", "STAFF"]);
  const canIssue = can(role, ["ADMIN", "ORG_MANAGER", "STATION_MANAGER"]);
  const [query, setQuery] = useState("");
  const [people, setPeople] = useState<Row[] | null>(null);
  const [personId, setPersonId] = useState("");
  const [campaignId, setCampaignId] = useState("");
  const [points, setPoints] = useState("20");
  const [kind, setKind] = useState("BONUS");
  const [milestone, setMilestone] = useState("");
  const [paper, setPaper] = useState("");

  return (
    <OpsGate>
      <Title>Điểm và chứng nhận</Title>
      <RoleNote />
      <Note text={job.note} />
      <TextField label="Tìm người nhận" value={query} onChangeText={setQuery} />
      <Button
        label="Tìm"
        tone="ghost"
        onPress={() => void job.run(async (token) => {
          const data = await backend.lookupDonor(token, query.trim());
          setPeople((data.data || []) as Row[]);
          return { message: data.data?.length ? `Có ${data.data.length} người.` : "Không thấy người này." };
        })}
      />
      <PickList rows={people} selected={personId} onPick={setPersonId} detail={(row) => row.phone || row.username || ""} />
      <TextField label="Số điểm" value={points} onChangeText={setPoints} />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {[
          { code: "DONATION", label: "Quyên góp (DONATION)" },
          { code: "VOLUNTEER_TASK", label: "Tình nguyện (VOLUNTEER_TASK)" },
          { code: "BONUS", label: "Thưởng thêm (BONUS)" },
          { code: "SYSTEM", label: "Hệ thống (SYSTEM)" },
        ].map((type) => (
          <Pill key={type.code} label={type.label} active={kind === type.code} onPress={() => setKind(type.code)} />
        ))}
      </View>
      {canAward ? <Button label="Cộng điểm" onPress={() => void job.run((token) => backend.awardPoints(token, { userId: personId, points: Number(points), type: kind }))} /> : <Body muted>Vai trò này không cộng điểm.</Body>}
      <Fold title="Mốc thành tích">
        <PickList rows={achievements.rows} selected="" onPick={() => undefined} detail={() => "Đang bật"} />
        <TextField label="Tên mốc mới" value={milestone} onChangeText={setMilestone} />
        {canIssue ? <Button label="Tạo mốc theo tổng điểm" tone="ghost" onPress={() => void job.run((token) => backend.createAchievement(token, { title: milestone.trim(), criteriaType: "POINTS_ACCUMULATED", criteriaValue: Number(points) || 1 })).then((ok) => ok && achievements.reload())} /> : null}
      </Fold>
      <Fold title="Chứng nhận">
        <PickList
          rows={campaigns.rows}
          selected={campaignId}
          onPick={setCampaignId}
          detail={(row) => donorLabel({ status: row.status || "" })}
          panel={() => canIssue ? (
            <>
              <TextField label="Tiêu đề giấy" value={paper} onChangeText={setPaper} />
              <Button label="Cấp giấy người quyên góp" onPress={() => void job.run((token) => backend.issueCertificate(token, { userId: personId, campaignId, certificateType: "DONOR", title: paper.trim() }))} />
              <Button label="Cấp giấy tình nguyện" tone="ghost" onPress={() => void job.run((token) => backend.issueCertificate(token, { userId: personId, campaignId, certificateType: "VOLUNTEER", title: paper.trim() }))} />
            </>
          ) : <Body muted>Vai trò này không cấp giấy.</Body>}
        />
      </Fold>
    </OpsGate>
  );
}
