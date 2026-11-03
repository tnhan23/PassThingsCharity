import { useEffect, useState } from "react";
import { View } from "react-native";
import { backend } from "@/api/backend";
import { ApiError } from "@/api/client";
import { pickImages } from "@/api/images";
import { Body, Button, Photo, Title } from "@/components/ui";
import { can, Note, OpsGate, PickList, RoleNote, TextField, Units, useJob, useRole, useRows, type Row } from "@/screens/ops/kit";

function asPerson(row: Row & { userId?: { _id?: string; fullName?: string; username?: string } | string }): Row {
  const person = row.userId && typeof row.userId === "object" ? row.userId : undefined;
  return {
    ...row,
    fullName: row.fullName || person?.fullName || person?.username || "Người dùng",
    ownerId: person?._id || (typeof row.userId === "string" ? row.userId : ""),
  };
}

function line(itemId: string, quantity: string, unit: string) {
  return [{ itemTypeId: itemId, quantity: Number(quantity), unit }];
}

export function IntakeWork() {
  const receipts = useRows((token) => backend.listContributions(token).then((data) => data.data as Row[]));
  const campaigns = useRows(async () => (await backend.listCampaigns()).campaigns as Row[]);
  const stations = useRows((token) => backend.listStations(token).then((data) => data.data as Row[]));
  const items = useRows(async () => (await backend.listItemTypes()).itemTypes as Row[]);
  const job = useJob();
  const role = useRole();
  const canWrite = can(role, ["ADMIN", "STATION_MANAGER", "STAFF"]);
  const canJudge = can(role, ["ADMIN", "STATION_MANAGER"]);
  const [picked, setPicked] = useState("");
  const [query, setQuery] = useState("");
  const [donors, setDonors] = useState<Row[] | null>(null);
  const [donorId, setDonorId] = useState("");
  const [campaignId, setCampaignId] = useState("");
  const [stationId, setStationId] = useState("");
  const [itemId, setItemId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unit, setUnit] = useState("KG");
  const [imageUrl, setImageUrl] = useState("");
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);

  useEffect(() => {
    if (!job.token || !picked) {
      setImageUrl("");
      return;
    }
    let cancelled = false;
    backend.getContribution(job.token, picked)
      .then((data) => {
        const images = (data as { images?: { imageUrl?: string }[] }).images ?? [];
        if (!cancelled) setImageUrl(images[0]?.imageUrl ?? "");
      })
      .catch(() => {
        if (!cancelled) setImageUrl("");
      });
    return () => {
      cancelled = true;
    };
  }, [job.token, picked]);

  return (
    <OpsGate>
      <Title>Tiếp nhận</Title>
      <RoleNote />
      <Body>Phiếu mới được ghi nhận ngay. Từ chối thì trừ số lượng đã cộng, không trừ điểm. Nhân viên tạo được phiếu nhưng không đổi trạng thái.</Body>
      <Note text={receipts.error || job.note} />
      <PickList
        rows={receipts.rows}
        selected={picked}
        onPick={setPicked}
        detail={(row) => `${row.code || ""} · ${row.status || ""} · ${typeof row.campaignId === "object" ? row.campaignId?.title || "" : ""}`}
      />
      {picked && imageUrl ? <Photo uri={imageUrl} height={160} radius={16} /> : null}
      {picked && !imageUrl ? <Body muted>Phiếu này chưa có ảnh.</Body> : null}
      {picked && canJudge ? (
        <View style={{ gap: 8 }}>
          {["ACCEPTED", "REJECTED", "COMPLETED"].map((status) => (
            <Button key={status} label={status === "REJECTED" ? "Từ chối phiếu" : status} tone={status === "REJECTED" ? "danger" : "ghost"} onPress={() => void job.run((token) => backend.updateContributionStatus(token, picked, { status })).then((ok) => ok && receipts.reload())} />
          ))}
        </View>
      ) : null}
      {canWrite ? <Title>Phiếu mới</Title> : <Body muted>Vai trò này chỉ xem phiếu, không ghi phiếu mới.</Body>}
      {canWrite ? <TextField label="Tìm người trao" value={query} onChangeText={setQuery} /> : null}
      {canWrite ? (
        <Button
          label="Tìm"
          tone="ghost"
          onPress={() => void job.run(async (token) => {
            const data = await backend.lookupDonor(token, query.trim());
            setDonors((data.data || []) as Row[]);
            return { message: data.data?.length ? `Có ${data.data.length} người.` : "Không thấy người trao." };
          })}
        />
      ) : null}
      {donors ? <PickList rows={donors} selected={donorId} onPick={setDonorId} detail={(row) => row.phone || row.username || ""} /> : null}
      <Body muted>Chiến dịch</Body>
      <PickList rows={campaigns.rows} selected={campaignId} onPick={setCampaignId} detail={(row) => row.status || ""} />
      <Body muted>Trạm</Body>
      <PickList rows={stations.rows} selected={stationId} onPick={setStationId} detail={(row) => row.address || ""} />
      <Body muted>Loại đồ</Body>
      <PickList rows={items.rows} selected={itemId} onPick={setItemId} detail={(row) => row.unit || ""} />
      <TextField label="Số lượng" value={quantity} onChangeText={setQuantity} />
      <Units value={unit} onChange={setUnit} />
      {photoUrls.length ? <Body muted>{`Đã tải ${photoUrls.length} ảnh. Phiếu mới sẽ gắn các ảnh này.`}</Body> : <Body muted>Chưa chọn ảnh cho phiếu mới.</Body>}
      {canWrite ? (
        <Button
          label={job.busy ? "Đang gửi" : "Tải ảnh lên"}
          tone="ghost"
          onPress={() => void job.run(async (token) => {
            const files = await pickImages();
            if (!files.length) return { message: "Chưa chọn ảnh." };
            const uploaded = await backend.uploadContributionImages(token, files);
            const urls = uploaded.imageUrls ?? [];
            setPhotoUrls(urls);
            if (picked && urls.length) {
              await backend.addContributionImages(token, picked, urls);
              setImageUrl(urls[0] || "");
            }
            return { message: urls.length ? `Đã tải ${urls.length} ảnh.` : "Cloudinary không trả đường dẫn." };
          })}
        />
      ) : null}
      {canWrite ? (
        <Button
          label={job.busy ? "Đang gửi" : "Ghi phiếu"}
          onPress={() => void job.run((token) => backend.createContribution(token, {
            userId: donorId,
            stationId,
            campaignId,
            items: line(itemId, quantity, unit),
            imageUrls: photoUrls,
          })).then((ok) => ok && receipts.reload())}
        />
      ) : null}
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
      <Body>Đổi trạng thái lệnh không đổi số đã ghi nhận của chiến dịch. Quản lý tổ chức, tình nguyện và người dùng không xem danh sách lệnh.</Body>
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
          {["PREPARING", "IN_TRANSIT", "RECEIVED", "COMPLETED", "CANCELLED"].map((status) => (
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
      <Body>Ghi một đợt không tự đóng chiến dịch. Nút đóng chiến dịch gửi closeCampaign cùng trạng thái COMPLETED.</Body>
      <Note text={lots.error || job.note} />
      <PickList rows={lots.rows} selected={picked} onPick={setPicked} detail={(row) => `${row.code || ""} · ${row.status || ""} · ${row.recipientName || ""}`} />
      {picked && canWrite ? (
        <View style={{ gap: 8 }}>
          {["PLANNED", "IN_PROGRESS", "COMPLETED", "CANCELLED"].map((status) => (
            <Button key={status} label={status} tone="ghost" onPress={() => void job.run((token) => backend.updateReliefStatus(token, picked, { status, closeCampaign: false })).then((ok) => ok && lots.reload())} />
          ))}
          <Button label="Hoàn tất đợt và đóng chiến dịch" tone="danger" onPress={() => void job.run((token) => backend.updateReliefStatus(token, picked, { status: "COMPLETED", closeCampaign: true })).then((ok) => ok && lots.reload())} />
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
  const canRun = can(role, ["ADMIN", "STATION_MANAGER", "STAFF"]);
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
      <Body>Hủy việc không trừ điểm. Check-in và check-out nằm trên bảng việc của người được giao.</Body>
      <Note text={tasks.error || peopleError || job.note} />
      <PickList rows={tasks.rows} selected={taskId} onPick={setTaskId} detail={(row) => `${row.status || ""} · tuyển ${row.recruitmentStatus || ""}`} />
      {taskId && canRun ? (
        <View style={{ gap: 8 }}>
          <Button label="Mở tuyển" tone="ghost" onPress={() => void job.run((token) => backend.updateTask(token, taskId, { recruitmentStatus: "OPEN" })).then((ok) => ok && tasks.reload())} />
          <Button label="Hủy việc" tone="danger" onPress={() => void job.run((token) => backend.updateTask(token, taskId, { status: "CANCELLED" })).then((ok) => ok && tasks.reload())} />
        </View>
      ) : null}
      {canRun ? <Title>Việc mới</Title> : <Body muted>Vai trò này không tạo việc.</Body>}
      <PickList rows={campaigns.rows} selected={campaignId} onPick={setCampaignId} detail={(row) => row.status || ""} />
      <PickList rows={stations.rows} selected={stationId} onPick={setStationId} detail={(row) => row.address || ""} />
      <TextField label="Tên việc" value={title} onChangeText={setTitle} />
      <TextField label="Điểm thưởng" value={points} onChangeText={setPoints} />
      {canRun ? (
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
      {can(role, ["ADMIN", "STATION_MANAGER", "STAFF"]) && campaignId ? <PickList rows={people} selected={registrationId} onPick={setRegistrationId} detail={(row) => row.status || ""} /> : <Body muted>Chọn chiến dịch ở trên. Chỉ admin, quản lý trạm và nhân viên xem được đơn.</Body>}
      {canApproveJoin && registrationId ? (
        <View style={{ gap: 8 }}>
          <Button label="Duyệt đơn tham gia" onPress={() => void job.run((token) => backend.updateVolunteerStatus(token, registrationId, { status: "APPROVED" })).then((ok) => ok && setJoinStamp((value) => value + 1))} />
          <Button label="Từ chối đơn tham gia" tone="danger" onPress={() => void job.run((token) => backend.updateVolunteerStatus(token, registrationId, { status: "REJECTED" })).then((ok) => ok && setJoinStamp((value) => value + 1))} />
          <Button label="Hủy đơn tham gia" tone="ghost" onPress={() => void job.run((token) => backend.updateVolunteerStatus(token, registrationId, { status: "CANCELLED" })).then((ok) => ok && setJoinStamp((value) => value + 1))} />
        </View>
      ) : null}
      <Title>Đơn xin việc</Title>
      {canRun && taskId ? <PickList rows={applicants} selected={applicationId} onPick={setApplicationId} detail={(row) => row.status || ""} /> : <Body muted>Chọn một việc. Đơn xin việc không dùng id của đơn tham gia chiến dịch.</Body>}
      {canRun && applicationId && taskId ? (
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
      <Body>Điểm từ phiếu và từ check-out do server tự cộng. Màn này dùng khi cần cộng thêm hoặc cấp giấy.</Body>
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
