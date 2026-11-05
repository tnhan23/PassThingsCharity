import { router } from "expo-router";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { backend } from "@/api/backend";
import { ApiError } from "@/api/client";
import { unitSpoken } from "@/api/labels";
import type { ContributionDetail } from "@/api/types";
import { Body, Button, Card, Photo, Title } from "@/components/ui";
import { can, Note, OpsGate, PickList, RoleNote, TextField, Units, useJob, useRole, useRows, type Row } from "@/screens/ops/kit";

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
      <Title>Tiếp nhận</Title>
      <RoleNote />
      <Note text={receipts.error || job.note} />
      <PickList
        rows={receipts.rows ? visible : null}
        selected={picked}
        onPick={setPicked}
        detail={(row) => `${receiptStatus(row.status || "")} · ${typeof row.campaignId === "object" ? row.campaignId?.title || "" : ""}`}
      />
      {picked && detail ? (
        <Card>
          <Title>{detail.contribution.code}</Title>
          <Body>{receiptStatus(detail.contribution.status)}</Body>
          <Body muted>{personName((detail.contribution as { userId?: unknown }).userId) || "Chưa rõ người tặng"}</Body>
          <Body muted>{typeof detail.contribution.stationId === "object" ? detail.contribution.stationId?.name || "Trạm" : "Trạm"}</Body>
          <Body muted>{typeof detail.contribution.campaignId === "object" ? detail.contribution.campaignId?.title || "Chiến dịch" : "Chiến dịch"}</Body>
          {detail.contribution.notes ? <Body>{detail.contribution.notes}</Body> : null}
          {detail.items.length === 0 ? <Body>Phiếu chưa có món đồ.</Body> : null}
          {detail.items.map((item, index) => {
            const name = item.itemTypeId && typeof item.itemTypeId === "object" ? item.itemTypeId.name || "Vật phẩm" : "Vật phẩm";
            return <Body key={`${name}-${index}`}>{`${name}: ${item.quantity} ${unitSpoken(item.unit)}${item.note ? `. ${item.note}` : ""}`}</Body>;
          })}
          {detail.images.filter((image) => image.imageUrl).map((image) => (
            <Photo key={image.imageUrl} uri={image.imageUrl || ""} height={160} radius={16} />
          ))}
          {detail.images.length === 0 ? <Body muted>Phiếu này chưa có ảnh.</Body> : null}
        </Card>
      ) : null}
      {picked && canJudge ? (
        <View style={{ gap: 8 }}>
          <Button label="Chuyển sang đã tiếp nhận" onPress={() => void job.run((token) => backend.updateContributionStatus(token, picked, { status: "ACCEPTED" })).then((ok) => { if (!ok) return false; receipts.reload(); setStamp((value) => value + 1); return true; })} />
          <Button label="Chuyển sang chờ xử lý" tone="ghost" onPress={() => void job.run((token) => backend.updateContributionStatus(token, picked, { status: "PENDING" })).then((ok) => { if (!ok) return false; receipts.reload(); setStamp((value) => value + 1); return true; })} />
          <Button label="Từ chối phiếu" tone="danger" onPress={() => void job.run((token) => backend.updateContributionStatus(token, picked, { status: "REJECTED" })).then((ok) => { if (!ok) return false; receipts.reload(); setStamp((value) => value + 1); return true; })} />
        </View>
      ) : null}
      {picked && !canJudge ? <Body muted>Tài khoản nhân viên xem được phiếu nhưng không đổi trạng thái. Chỉ quản lý trạm hoặc admin chuyển sang chờ xử lý hay từ chối.</Body> : null}
      {canWrite ? <Button label="Lập phiếu mới" onPress={() => router.push("/receive/new")} /> : null}
    </OpsGate>
  );
}

export function TransferWork() {
  const transfers = useRows((token) => backend.listTransfers(token).then((data) => data.data as Row[]));
  const campaigns = useRows(async () => (await backend.listCampaigns()).campaigns as Row[]);
  const stations = useRows((token) => backend.listStations(token).then((data) => data.data as Row[]));
  const items = useRows(async () => (await backend.listItemTypes()).itemTypes as Row[]);
  const job = useJob();
  const role = useRole();
  const canWrite = can(role, ["ADMIN", "STATION_MANAGER", "STAFF"]);
  const [picked, setPicked] = useState("");
  const [campaignId, setCampaignId] = useState("");
  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");
  const [itemId, setItemId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unit, setUnit] = useState("BOX");

  return (
    <OpsGate>
      <Title>Điều chuyển</Title>
      <RoleNote />
      <Note text={transfers.error || job.note} />
      <PickList
        rows={transfers.rows}
        selected={picked}
        onPick={setPicked}
        detail={(row) => {
          const from = typeof row.fromStationId === "object" ? row.fromStationId?.name || "" : "";
          const to = typeof row.toStationId === "object" ? row.toStationId?.name || "" : "";
          return `${row.code || ""} · ${row.status || ""} · ${from} sang ${to}`;
        }}
      />
      {picked && canWrite ? (
        <View style={{ gap: 8 }}>
          {( {
            PENDING: ["PREPARING", "CANCELLED"],
            PREPARING: ["IN_TRANSIT", "CANCELLED"],
            IN_TRANSIT: ["RECEIVED"],
            RECEIVED: ["COMPLETED"],
            COMPLETED: [],
            CANCELLED: [],
          } as Record<string, string[]>)[transfers.rows?.find((row) => row._id === picked)?.status || ""]?.map((status) => (
            <Button key={status} label={status} tone={status === "CANCELLED" ? "danger" : "ghost"} onPress={() => void job.run((token) => backend.updateTransferStatus(token, picked, { status })).then((ok) => ok && transfers.reload())} />
          ))}
        </View>
      ) : null}
      {canWrite ? <Title>Lệnh mới</Title> : <Body muted>Vai trò này không lập lệnh chuyển.</Body>}
      <PickList rows={campaigns.rows} selected={campaignId} onPick={setCampaignId} detail={(row) => row.status || ""} />
      <Body muted>Trạm đi</Body>
      <PickList rows={stations.rows} selected={fromId} onPick={setFromId} detail={(row) => row.address || ""} />
      <Body muted>Trạm đến</Body>
      <PickList rows={stations.rows} selected={toId} onPick={setToId} detail={(row) => row.address || ""} />
      <PickList rows={items.rows} selected={itemId} onPick={setItemId} detail={(row) => row.unit || ""} />
      <TextField label="Số lượng" value={quantity} onChangeText={setQuantity} />
      <Units value={unit} onChange={setUnit} />
      {canWrite ? (
        <Button
          label="Tạo lệnh"
          onPress={() => void job.run((token) => backend.createTransfer(token, {
            campaignId,
            fromStationId: fromId,
            toStationId: toId,
            items: line(itemId, quantity, unit),
          })).then((ok) => ok && transfers.reload())}
        />
      ) : null}
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
  const [unit, setUnit] = useState("BOX");

  return (
    <OpsGate>
      <Title>Giao hàng</Title>
      <RoleNote />
      <Note text={lots.error || job.note} />
      <PickList rows={lots.rows} selected={picked} onPick={setPicked} detail={(row) => `${row.code || ""} · ${row.status || ""} · ${row.recipientName || ""}`} />
      {picked && canWrite ? (
        <View style={{ gap: 8 }}>
          {( {
            PLANNED: ["IN_PROGRESS", "COMPLETED", "CANCELLED"],
            IN_PROGRESS: ["COMPLETED", "CANCELLED"],
            COMPLETED: [],
            CANCELLED: [],
          } as Record<string, string[]>)[lots.rows?.find((row) => row._id === picked)?.status || ""]?.map((status) => (
            <Button key={status} label={status} tone={status === "CANCELLED" ? "danger" : "ghost"} onPress={() => void job.run((token) => backend.updateReliefStatus(token, picked, { status, closeCampaign: false })).then((ok) => ok && lots.reload())} />
          ))}
          {["PLANNED", "IN_PROGRESS"].includes(lots.rows?.find((row) => row._id === picked)?.status || "") ? <Button label="Hoàn tất đợt và đóng chiến dịch" tone="danger" onPress={() => void job.run((token) => backend.updateReliefStatus(token, picked, { status: "COMPLETED", closeCampaign: true })).then((ok) => ok && lots.reload())} /> : null}
        </View>
      ) : null}
      {canWrite ? <Title>Đợt mới</Title> : <Body muted>Vai trò này chỉ xem đợt giao.</Body>}
      <PickList rows={campaigns.rows} selected={campaignId} onPick={setCampaignId} detail={(row) => row.status || ""} />
      <PickList rows={stations.rows} selected={stationId} onPick={setStationId} detail={(row) => row.address || ""} />
      <TextField label="Tên người nhận" value={recipient} onChangeText={setRecipient} />
      <PickList rows={items.rows} selected={itemId} onPick={setItemId} detail={(row) => row.unit || ""} />
      <TextField label="Số lượng" value={quantity} onChangeText={setQuantity} />
      <Units value={unit} onChange={setUnit} />
      {canWrite ? (
        <Button
          label="Ghi đợt giao"
          onPress={() => void job.run((token) => backend.createRelief(token, {
            campaignId,
            stationId,
            recipientName: recipient.trim(),
            closeCampaign: false,
            items: line(itemId, quantity, unit),
          })).then((ok) => ok && lots.reload())}
        />
      ) : null}
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
  const canApproveJoin = can(role, ["ADMIN", "STATION_MANAGER"]);
  const [taskId, setTaskId] = useState("");
  const [campaignId, setCampaignId] = useState("");
  const [stationId, setStationId] = useState("");
  const [title, setTitle] = useState("");
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
      <PickList rows={tasks.rows} selected={taskId} onPick={setTaskId} detail={(row) => `${row.status || ""} · tuyển ${row.recruitmentStatus || ""}`} />
      {taskId && canTask ? (
        <View style={{ gap: 8 }}>
          <Button label="Mở tuyển" tone="ghost" onPress={() => void job.run((token) => backend.updateTask(token, taskId, { recruitmentStatus: "OPEN" })).then((ok) => ok && tasks.reload())} />
          <Button label="Hủy việc" tone="danger" onPress={() => void job.run((token) => backend.updateTask(token, taskId, { status: "CANCELLED" })).then((ok) => ok && tasks.reload())} />
        </View>
      ) : null}
      {canTask ? <Title>Việc mới</Title> : <Body muted>Vai trò này không tạo việc.</Body>}
      <PickList rows={campaigns.rows} selected={campaignId} onPick={setCampaignId} detail={(row) => row.status || ""} />
      <PickList rows={stations.rows} selected={stationId} onPick={setStationId} detail={(row) => row.address || ""} />
      <TextField label="Tên việc" value={title} onChangeText={setTitle} />
      <TextField label="Điểm thưởng" value={points} onChangeText={setPoints} />
      {canTask ? (
        <Button
          label="Tạo việc và mở tuyển"
          onPress={() => void job.run((token) => backend.createTask(token, {
            campaignId,
            stationId,
            title: title.trim(),
            recruitmentStatus: "OPEN",
            rewardPoints: Number(points) || 0,
          })).then((ok) => ok && tasks.reload())}
        />
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
        {["DONATION", "VOLUNTEER_TASK", "BONUS", "SYSTEM"].map((type) => (
          <Button key={type} label={type} tone={kind === type ? "primary" : "ghost"} onPress={() => setKind(type)} />
        ))}
      </View>
      {canAward ? <Button label="Cộng điểm" onPress={() => void job.run((token) => backend.awardPoints(token, { userId: personId, points: Number(points), type: kind }))} /> : <Body muted>Vai trò này không cộng điểm.</Body>}
      <Title>Mốc thành tích</Title>
      <PickList rows={achievements.rows} selected="" onPick={() => undefined} detail={() => "Mốc đang bật"} />
      <TextField label="Tên mốc mới" value={milestone} onChangeText={setMilestone} />
      {canIssue ? <Button label="Tạo mốc theo tổng điểm" tone="ghost" onPress={() => void job.run((token) => backend.createAchievement(token, { title: milestone.trim(), criteriaType: "POINTS_ACCUMULATED", criteriaValue: Number(points) || 1 })).then((ok) => ok && achievements.reload())} /> : null}
      <Title>Chứng nhận</Title>
      <PickList rows={campaigns.rows} selected={campaignId} onPick={setCampaignId} detail={(row) => row.status || ""} />
      <TextField label="Tiêu đề giấy" value={paper} onChangeText={setPaper} />
      {canIssue ? <Button label="Cấp giấy người quyên góp" onPress={() => void job.run((token) => backend.issueCertificate(token, { userId: personId, campaignId, certificateType: "DONOR", title: paper.trim() }))} /> : <Body muted>Vai trò này không cấp giấy.</Body>}
      {canIssue ? <Button label="Cấp giấy tình nguyện" tone="ghost" onPress={() => void job.run((token) => backend.issueCertificate(token, { userId: personId, campaignId, certificateType: "VOLUNTEER", title: paper.trim() }))} /> : null}
    </OpsGate>
  );
}
