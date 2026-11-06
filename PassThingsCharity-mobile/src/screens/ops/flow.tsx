import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { backend } from "@/api/backend";
import { ApiError } from "@/api/client";
import { donorLabel, unitSpoken } from "@/api/labels";
import { useSession } from "@/api/session";
import type { ContributionDetail, StationRow } from "@/api/types";
import { Badge, Body, Button, Card, Photo, Pill, StatRow, Title } from "@/components/ui";
import { can, Fold, Note, OpsGate, PickList, RoleNote, TextField, useJob, useRole, useRows, type Row } from "@/screens/ops/kit";
import { colors, fonts } from "@/theme";

function line(itemId: string, quantity: string, unit: string) {
  return [{ itemTypeId: itemId, quantity: Number(quantity), unit }];
}

function asPerson(row: Row & { userId?: { _id?: string; fullName?: string; username?: string } | string }): Row {
  const person = row.userId && typeof row.userId === "object" ? row.userId : undefined;
  return {
    ...row,
    fullName: row.fullName || person?.fullName || person?.username || "Người dùng",
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
  const canWrite = can(role, ["STATION_MANAGER", "STAFF"]);
  const canJudge = role === "STATION_MANAGER";
  const [picked, setPicked] = useState("");
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
      <PickList
        rows={receipts.rows ? visible : null}
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
      <PickList
        rows={transfers.rows}
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
          onPress={() => void job.run((token) => {
            const items = stock.flatMap((row) => {
              const id = refId(row.itemTypeId);
              const quantity = Number(amounts[id]);
              if (!id || !(quantity > 0)) return [];
              return [{ itemTypeId: id, quantity, unit: row.unit }];
            });
            return backend.createTransfer(token, {
              campaignId,
              fromStationId: fromId,
              toStationId: toId,
              items,
            });
          }).then((ok) => {
            if (!ok) return;
            setAmounts({});
            transfers.reload();
          })}
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

export function CrewWork() {
  const tasks = useRows((token) => backend.listTasks(token).then((data) => data.data as Row[]));
  const campaigns = useRows(async () => (await backend.listCampaigns()).campaigns as Row[]);
  const stations = useRows((token) => backend.listStations(token).then((data) => data.data as Row[]));
  const job = useJob();
  const role = useRole();
  const canTask = can(role, ["ADMIN", "STATION_MANAGER", "STAFF"]);
  const canCreateTask = can(role, ["ADMIN", "STATION_MANAGER", "STAFF"]);
  const canApproveJoin = can(role, ["ADMIN", "STATION_MANAGER"]);
  const [taskId, setTaskId] = useState("");
  const [campaignId, setCampaignId] = useState("");
  const [stationId, setStationId] = useState("");
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [needed, setNeeded] = useState("1");
  const [deadline, setDeadline] = useState("");
  const [points, setPoints] = useState("25");
  const [people, setPeople] = useState<Row[] | null>(null);
  const [peopleError, setPeopleError] = useState("");
  const [registrationId, setRegistrationId] = useState("");
  const [applicants, setApplicants] = useState<Row[] | null>(null);
  const [applicationId, setApplicationId] = useState("");
  const [joinStamp, setJoinStamp] = useState(0);
  const [applyStamp, setApplyStamp] = useState(0);

  useEffect(() => {
    if (!job.token || !campaignId) return;
    let cancelled = false;
    backend.campaignVolunteers(job.token, campaignId)
      .then((data) => {
        const payload = data as { data?: Array<Row & { userId?: { _id?: string; fullName?: string; username?: string } | string }> };
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
    if (!job.token || !taskId) return;
    let cancelled = false;
    backend.taskApplications(job.token, taskId)
      .then((data) => {
        const payload = data as { data?: Array<Row & { userId?: { _id?: string; fullName?: string; username?: string } | string }> };
        if (!cancelled) setApplicants((payload.data || []).map(asPerson));
      })
      .catch(() => {
        if (!cancelled) setApplicants([]);
      });
    return () => {
      cancelled = true;
    };
  }, [job.token, taskId, applyStamp]);

  return (
    <OpsGate>
      <Title>Nhân sự</Title>
      <RoleNote />
      <Note text={tasks.error || peopleError || job.note} />
      <PickList
        rows={tasks.rows}
        selected={taskId}
        onPick={setTaskId}
        detail={(row) => `${row.status || ""} tuyển ${row.recruitmentStatus || ""}`}
        panel={(row) => canTask ? (
          <>
            <Button label="Mở tuyển" tone="ghost" onPress={() => void job.run((token) => backend.updateTask(token, row._id, { recruitmentStatus: "OPEN" })).then((ok) => ok && tasks.reload())} />
            <Button label="Hủy việc" tone="danger" onPress={() => void job.run((token) => backend.updateTask(token, row._id, { status: "CANCELLED" })).then((ok) => ok && tasks.reload())} />
          </>
        ) : null}
      />
      {canCreateTask ? (
        <Fold title="Đăng tin tuyển">
          <PickList rows={stations.rows} selected={stationId} onPick={setStationId} detail={(row) => row.address || ""} />
          <TextField label="Tên việc" value={title} onChangeText={setTitle} />
          <TextField label="Mô tả ngắn" value={detail} onChangeText={setDetail} />
          <TextField label="Bắt đầu, ví dụ 2026-11-07T08:00" value={startTime} onChangeText={setStartTime} />
          <TextField label="Kết thúc, ví dụ 2026-11-07T12:00" value={endTime} onChangeText={setEndTime} />
          <TextField label="Số người cần" value={needed} onChangeText={setNeeded} />
          <TextField label="Hạn đăng ký, có thể để trống" value={deadline} onChangeText={setDeadline} />
          <TextField label="Điểm thưởng" value={points} onChangeText={setPoints} />
          <Button
            label="Đăng tin"
            onPress={() => void job.run((token) => backend.createTask(token, {
              ...(campaignId ? { campaignId } : {}),
              stationId,
              title: title.trim(),
              description: detail.trim(),
              startTime: startTime.trim() ? `${startTime.trim()}+07:00` : undefined,
              endTime: endTime.trim() ? `${endTime.trim()}+07:00` : undefined,
              requiredVolunteers: Number(needed),
              ...(deadline.trim() ? { volunteerDeadline: `${deadline.trim()}+07:00` } : {}),
              recruitmentStatus: "OPEN",
              rewardPoints: Number(points) || 0,
            })).then((ok) => ok && tasks.reload())}
          />
        </Fold>
      ) : null}
      <Title>Đơn tham gia chiến dịch</Title>
      <Body muted>Danh sách này tách với đơn xin việc bên dưới.</Body>
      {can(role, ["ADMIN", "STATION_MANAGER", "STAFF"]) && campaignId ? <PickList rows={people} selected={registrationId} onPick={setRegistrationId} detail={(row) => row.status || ""} /> : <Body muted>Chọn chiến dịch ở trên để xem đơn tham gia.</Body>}
      {role === "STAFF" ? <Body muted>Nhân viên xem được đơn tham gia chiến dịch. Chỉ admin và quản lý trạm duyệt đơn đó.</Body> : null}
      {canApproveJoin && registrationId ? (
        <View style={{ gap: 8 }}>
          <Button label="Duyệt đơn tham gia" onPress={() => void job.run((token) => backend.updateVolunteerStatus(token, registrationId, { status: "APPROVED" })).then((ok) => ok && setJoinStamp((value) => value + 1))} />
          <Button label="Từ chối đơn tham gia" tone="danger" onPress={() => void job.run((token) => backend.updateVolunteerStatus(token, registrationId, { status: "REJECTED" })).then((ok) => ok && setJoinStamp((value) => value + 1))} />
          <Button label="Hủy đơn tham gia" tone="ghost" onPress={() => void job.run((token) => backend.updateVolunteerStatus(token, registrationId, { status: "CANCELLED" })).then((ok) => ok && setJoinStamp((value) => value + 1))} />
        </View>
      ) : null}
      <Title>Đơn xin việc</Title>
      {canTask && taskId ? <PickList rows={applicants} selected={applicationId} onPick={setApplicationId} detail={(row) => row.status || ""} /> : <Body muted>Chọn một việc. Đơn xin việc không dùng id của đơn tham gia chiến dịch.</Body>}
      {canTask && applicationId && taskId ? (
        <View style={{ gap: 8 }}>
          <Button label="Duyệt đơn xin việc" onPress={() => void job.run((token) => backend.reviewTaskApplication(token, applicationId, { status: "APPROVED" })).then((ok) => { if (!ok) return; setApplyStamp((value) => value + 1); tasks.reload(); })} />
          <Button label="Từ chối đơn xin việc" tone="danger" onPress={() => void job.run((token) => backend.reviewTaskApplication(token, applicationId, { status: "REJECTED" })).then((ok) => { if (!ok) return; setApplyStamp((value) => value + 1); tasks.reload(); })} />
          <Button label="Hủy đơn xin việc" tone="ghost" onPress={() => void job.run((token) => backend.reviewTaskApplication(token, applicationId, { status: "CANCELLED" })).then((ok) => { if (!ok) return; setApplyStamp((value) => value + 1); tasks.reload(); })} />
          <Button label="Giao việc này cho người đang chọn" tone="ghost" onPress={() => void job.run((token) => backend.assignTask(token, { taskId, assigneeId: applicants?.find((row) => row._id === applicationId)?.ownerId || "", assigneeType: "VOLUNTEER" })).then((ok) => { if (!ok) return; setApplyStamp((value) => value + 1); tasks.reload(); })} />
        </View>
      ) : null}
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
