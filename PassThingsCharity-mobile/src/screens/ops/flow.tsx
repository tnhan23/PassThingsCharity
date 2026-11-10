import { router } from "expo-router";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { createElement, useEffect, useState, type ChangeEvent } from "react";
import { Platform, ScrollView, Text, View } from "react-native";
import { backend } from "@/api/backend";
import { ApiError } from "@/api/client";
import { pickImage } from "@/api/images";
import { donorLabel, unitSpoken } from "@/api/labels";
import { useSession } from "@/api/session";
import type { ContributionDetail, StationRow } from "@/api/types";
import { Badge, Body, Button, Card, Photo, Pill, StatRow, Title } from "@/components/ui";
import { can, Fold, Note, OpsGate, PickList, RoleNote, TextField, useJob, useRole, useRows, type Row } from "@/screens/ops/kit";
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
  stationId?: { _id?: string; name?: string } | string;
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
  const origins = (role === "ADMIN" ? (stations.rows ?? []) : (user?.stations ?? [])) as Array<StationRow | Row>;
  const arrival = (destinations.rows ?? stations.rows ?? []).filter((row) => row._id !== fromId);

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

  const selectedItemsCount = stock.filter((row) => Number(amounts[refId(row.itemTypeId)]) > 0).length;
  const transferStatuses = ["PENDING", "PREPARING", "IN_TRANSIT", "RECEIVED", "COMPLETED", "CANCELLED"];
  const filteredTransfers = transfers.rows?.filter((row) => transferFilter === "ALL" || row.status === transferFilter) ?? null;

  return (
    <OpsGate>
      <Title>Điều chuyển</Title>
      <RoleNote />
      <Note text={transfers.error || stockError || job.note} />
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
        panel={(row) => canWrite ? (
          <>
            {( {
              PENDING: ["PREPARING", "CANCELLED"],
              PREPARING: ["IN_TRANSIT", "CANCELLED"],
              IN_TRANSIT: ["RECEIVED"],
              RECEIVED: ["COMPLETED"],
              COMPLETED: [],
              CANCELLED: [],
            } as Record<string, string[]>)[row.status || ""]?.map((status) => (
              <Button key={status} label={status === "CANCELLED" ? "Hủy lệnh" : status} tone={status === "CANCELLED" ? "danger" : "ghost"} onPress={() => void job.run((token) => backend.updateTransferStatus(token, row._id, { status })).then((ok) => ok && transfers.reload())} />
            ))}
          </>
        ) : null}
      />
      {canWrite ? <Title>Lập lệnh điều chuyển mới</Title> : <Body muted>Vai trò này không lập lệnh chuyển.</Body>}
      <Text style={{ fontFamily: fonts.bold, fontSize: 15, color: colors.ink }}>1. Chọn chiến dịch</Text>
      <PickList rows={campaigns.rows} selected={campaignId} onPick={setCampaignId} detail={(row) => donorLabel({ status: row.status || "" })} />
      <Text style={{ fontFamily: fonts.bold, fontSize: 15, color: colors.ink }}>2. Chọn trạm đi (kho xuất)</Text>
      {origins.length === 0 ? <Body muted>Tài khoản này chưa được gán làm trưởng trạm hoặc nhân viên của trạm nào, nên không xem được kho.</Body> : null}
      <PickList rows={origins as Row[]} selected={fromId} onPick={setFromId} detail={(row) => row.address || ""} />
      <Text style={{ fontFamily: fonts.bold, fontSize: 15, color: colors.ink }}>3. Chọn trạm đến (trạm nhận)</Text>
      {arrival.length === 0 ? <Body muted>Chưa thấy trạm khác để nhận hàng.</Body> : null}
      <PickList rows={arrival} selected={toId} onPick={setToId} detail={(row) => row.address || ""} />
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <Text style={{ flex: 1, fontFamily: fonts.bold, fontSize: 15, color: colors.ink }}>
          4. Nhập số lượng gửi từ kho trạm đi
        </Text>
        {selectedItemsCount > 0 ? <Badge label={`Đã chọn ${selectedItemsCount} món`} tone="primary" /> : null}
      </View>
      <Body muted>Điền số lượng những món cần gửi. Có thể gửi nhiều món trong một lệnh.</Body>
      {fromId && stock.length === 0 && !stockError ? <Body muted>Kho trạm này chưa có hàng.</Body> : null}
      {stock.map((row) => {
        const id = refId(row.itemTypeId);
        const available = row.availableQuantity ?? row.quantity;
        const unitLabel = unitSpoken(row.unit);
        return (
          <Card key={row._id}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <Text style={{ flex: 1, fontFamily: fonts.bold, fontSize: 17, color: colors.ink }}>
                {refName(row.itemTypeId, "Vật phẩm")}
              </Text>
              <Badge label={`Đơn vị: ${unitLabel}`} tone="neutral" />
            </View>
            <StatRow
              items={[
                { label: "Còn gửi được", value: available, unit: unitLabel, tone: "primary" },
                { label: "Tổng tồn", value: row.quantity, unit: unitLabel, tone: "ink" },
                { label: "Đang giữ", value: row.reservedQuantity || 0, unit: unitLabel, tone: "coral" },
              ]}
            />
            <TextField label="Số lượng gửi" value={amounts[id] || ""} onChangeText={(value) => setAmounts((current) => ({ ...current, [id]: value }))} />
          </Card>
        );
      })}
      {canWrite ? (
        <Button
          label={selectedItemsCount > 0 ? `Tạo lệnh (${selectedItemsCount} món)` : "Tạo lệnh"}
          onPress={() => {
            if (!campaignId || !fromId || !toId) {
              job.fail("Vui lòng chọn đầy đủ chiến dịch, trạm đi và trạm đến.");
              return;
            }
            const items = stock.flatMap((row) => {
              const id = refId(row.itemTypeId);
              const quantity = Number(amounts[id]);
              if (!id || !(quantity > 0)) return [];
              return [{ itemTypeId: id, quantity, unit: row.unit }];
            });
            if (items.length === 0) {
              job.fail("Vui lòng nhập số lượng lớn hơn 0 cho ít nhất một món cần gửi.");
              return;
            }
            void job.run((token) => backend.createTransfer(token, {
              campaignId,
              fromStationId: fromId,
              toStationId: toId,
              items,
            })).then((ok) => {
              if (!ok) return;
              setAmounts({});
              transfers.reload();
            });
          }}
        />
      ) : null}
    </OpsGate>
  );
}

export function StockWork() {
  const stock = useRows((token) => backend.listInventory(token).then((data) => data.data as StockLine[]));
  const rows = (stock.rows as StockLine[] | null) ?? null;
  return (
    <OpsGate>
      <Title>Kho trạm</Title>
      <RoleNote />
      <Note text={stock.error} />
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
      {rows && rows.length === 0 ? <Body muted>Chưa có hàng trong kho các trạm bạn được xem.</Body> : null}
      {rows?.map((row) => {
        const station = refName(row.stationId, "Trạm");
        const available = row.availableQuantity ?? row.quantity;
        const unitLabel = unitSpoken(row.unit);
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
          </Card>
        );
      })}
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
                createTaskJob.fail("Vui lòng chọn trạm cho công việc.");
                return;
              }
              if (!title.trim()) {
                createTaskJob.fail("Vui lòng nhập tên công việc.");
                return;
              }
              if (!startDate || !startTime || !endDate || !endTime) {
                createTaskJob.fail("Vui lòng chọn đủ ngày và giờ bắt đầu, ngày và giờ kết thúc.");
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
          <Note text={createTaskJob.note} />
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
