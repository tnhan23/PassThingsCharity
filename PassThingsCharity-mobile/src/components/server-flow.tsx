import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { backend } from "@/api/backend";
import { ApiError } from "@/api/client";
import { useSession } from "@/api/session";
import type { NamedRef, ReliefSummaryItem } from "@/api/types";
import { Body, Button, Card, Title } from "@/components/ui";
import { colors } from "@/theme";

function refTitle(value: NamedRef | undefined) {
  if (!value || typeof value === "string") return "";
  return value.title || value.name || "";
}

function loadReceipts(token: string) {
  return backend.listContributions(token).then((data) => data.data ?? []);
}

function loadTransfers(token: string) {
  return backend.listTransfers(token).then((data) => data.data ?? []);
}

function loadRelief(token: string) {
  return backend.listRelief(token).then((data) => data.data ?? []);
}

function loadTasks(token: string) {
  return backend.listTasks(token).then((data) => data.data ?? []);
}

function loadMine(token: string) {
  return backend.myAssignments(token).then((data) => data.data ?? []);
}

function loadJoins(token: string) {
  return backend.myVolunteerRegistrations(token).then((data) => ((data as { data?: { _id: string; status?: string; campaignId?: NamedRef }[] }).data ?? []));
}

function loadApplications(token: string) {
  return backend.myTaskApplications(token).then((data) => ((data as { data?: { _id: string; status?: string; taskId?: NamedRef }[] }).data ?? []));
}

function useRows<T>(load: (token: string) => Promise<T[]>) {
  const { token } = useSession();
  const [rows, setRows] = useState<T[] | null>(null);
  const [problem, setProblem] = useState("");
  const [stamp, setStamp] = useState(0);

  useEffect(() => {
    if (!token) {
      setRows(null);
      setProblem("");
      return;
    }
    let cancelled = false;
    load(token)
      .then((next) => {
        if (!cancelled) setRows(next);
      })
      .catch((caught) => {
        if (!cancelled) setProblem(caught instanceof ApiError ? caught.message : "Máy chủ không trả danh sách.");
      });
    return () => {
      cancelled = true;
    };
  }, [token, load, stamp]);

  return { token, rows, problem, reload: () => setStamp((value) => value + 1) };
}

function Gate({ title, problem, rows }: { title: string; problem: string; rows: unknown[] | null }) {
  const { token } = useSession();
  if (!token) {
    return (
      <Card>
        <Title>{title}</Title>
        <Body>Đăng nhập để đọc số liệu máy chủ. Phần bên dưới là bản vẽ, không phải số đang lưu.</Body>
        <Button label="Đăng nhập" onPress={() => router.push("/login")} />
      </Card>
    );
  }
  if (!rows && !problem) {
    return (
      <Card>
        <ActivityIndicator color={colors.primary} />
        <Title>Đang đọc máy chủ</Title>
      </Card>
    );
  }
  if (problem) {
    return (
      <Card>
        <Title>Không đọc được máy chủ</Title>
        <Body>{problem}</Body>
      </Card>
    );
  }
  return null;
}

export function ServerReceipts() {
  const { rows, problem } = useRows(loadReceipts);
  const gate = <Gate title="Phiếu tiếp nhận trên máy chủ" problem={problem} rows={rows} />;
  if (!rows) return gate;
  return (
    <Card>
      <Title>Phiếu tiếp nhận trên máy chủ</Title>
      <Body muted>Phiếu mới được ghi nhận ngay. Điểm là 20 cho cả phiếu, mỗi dòng thêm tối đa 50. Từ chối trừ số lượng, không trừ điểm.</Body>
      {rows.length === 0 ? <Body>Chưa có phiếu.</Body> : null}
      {rows.slice(0, 5).map((row) => (
        <Body key={row._id}>{`${row.code} · ${row.status} · ${refTitle(row.campaignId) || "Chưa gắn chiến dịch"}`}</Body>
      ))}
    </Card>
  );
}

export function ServerTransfers() {
  const { rows, problem } = useRows(loadTransfers);
  if (!rows) return <Gate title="Lệnh chuyển trên máy chủ" problem={problem} rows={rows} />;
  return (
    <Card>
      <Title>Lệnh chuyển trên máy chủ</Title>
      <Body muted>Đổi trạng thái lệnh không đổi số đã ghi nhận của chiến dịch và không chuyển kho giữa hai trạm.</Body>
      {rows.length === 0 ? <Body>Chưa có lệnh.</Body> : null}
      {rows.slice(0, 5).map((row) => (
        <Body key={row._id}>{`${row.code} · ${row.status} · ${refTitle(row.fromStationId) || "?"} sang ${refTitle(row.toStationId) || "?"}`}</Body>
      ))}
    </Card>
  );
}

export function ServerRelief() {
  const { rows, problem } = useRows(loadRelief);
  if (!rows) return <Gate title="Đợt giao trên máy chủ" problem={problem} rows={rows} />;
  return (
    <Card>
      <Title>Đợt giao trên máy chủ</Title>
      <Body muted>Một đợt không tự đóng chiến dịch. Chỉ đóng khi phiếu gửi closeCampaign. Máy chủ không có chữ ký.</Body>
      {rows.length === 0 ? <Body>Chưa có đợt giao.</Body> : null}
      {rows.slice(0, 5).map((row) => (
        <Body key={row._id}>{`${row.code} · ${row.status} · ${row.recipientName || "Chưa ghi người nhận"}`}</Body>
      ))}
    </Card>
  );
}

export function ReliefNumbers({ campaignId }: { campaignId: string }) {
  const { token } = useSession();
  const [items, setItems] = useState<ReliefSummaryItem[] | null>(null);
  const [batches, setBatches] = useState(0);
  const [problem, setProblem] = useState("");

  useEffect(() => {
    if (!token || !campaignId) return;
    let cancelled = false;
    backend.reliefSummary(token, campaignId)
      .then((data) => {
        if (cancelled) return;
        setItems(data.itemsSummary ?? []);
        setBatches(data.totalDistributionBatches ?? 0);
      })
      .catch((caught) => {
        if (!cancelled) setProblem(caught instanceof ApiError ? caught.message : "Không đọc được phép tính giao hàng.");
      });
    return () => {
      cancelled = true;
    };
  }, [token, campaignId]);

  if (!token) return null;
  if (problem) {
    return (
      <Card>
        <Body>{problem}</Body>
      </Card>
    );
  }
  if (!items) {
    return (
      <Card>
        <ActivityIndicator color={colors.primary} />
        <Body muted>Đang tính phần đã ghi trong các đợt giao.</Body>
      </Card>
    );
  }
  return (
    <Card>
      <Title>Phép tính giao hàng</Title>
      <Body muted>{`${batches} đợt, gồm cả đợt đang lên kế hoạch và đợt đã hủy. Số còn lại không được ghi thành cột kho.`}</Body>
      {items.length === 0 ? <Body>Chiến dịch chưa có mục tiêu hàng.</Body> : null}
      {items.map((item) => (
        <Body key={`${item.itemName}-${item.collectedQuantity}`}>
          {`${item.itemName || "Hàng"}: ghi nhận ${item.collectedQuantity}, trong các đợt giao ${item.distributedQuantity}, còn lại theo phép tính ${item.remainingInStock}.`}
        </Body>
      ))}
    </Card>
  );
}

export function ServerTasks() {
  const { token } = useSession();
  const [note, setNote] = useState("");
  const tasks = useRows(loadTasks);
  const mine = useRows(loadMine);
  const joins = useRows(loadJoins);
  const applications = useRows(loadApplications);

  async function run(action: () => Promise<{ message: string; gamification?: { pointsAwarded?: number } }>) {
    setNote("");
    try {
      const result = await action();
      const points = result.gamification?.pointsAwarded;
      setNote(typeof points === "number" ? `${result.message} Điểm vừa cộng: ${points}.` : result.message);
      tasks.reload();
      mine.reload();
      joins.reload();
      applications.reload();
    } catch (caught) {
      setNote(caught instanceof ApiError ? caught.message : "Máy chủ từ chối thao tác.");
    }
  }

  if (!tasks.rows || !mine.rows || !joins.rows || !applications.rows) {
    return <Gate title="Việc trên máy chủ" problem={tasks.problem || mine.problem || joins.problem || applications.problem} rows={tasks.rows && mine.rows && joins.rows && applications.rows ? [] : null} />;
  }

  return (
    <Card>
      <Title>Việc trên máy chủ</Title>
      <Body muted>Điểm chỉ cộng lúc check-out. Hủy ca không có route và không trừ điểm. Quét QR là bản vẽ.</Body>
      {note ? <Body>{note}</Body> : null}
      {tasks.rows.length === 0 ? <Body>Chưa có việc.</Body> : null}
      {tasks.rows.slice(0, 5).map((task) => {
        const campaignId = task.campaignId && typeof task.campaignId === "object" ? task.campaignId._id : "";
        const place = refTitle(task.stationId);
        return (
          <View key={task._id} style={{ gap: 8 }}>
            <Body>{`${task.title} · ${task.status} · tuyển ${task.recruitmentStatus || "NOT_OPEN"}${place ? ` · ${place}` : ""}`}</Body>
            {token && campaignId ? (
              <Button label="Đăng ký chiến dịch" tone="ghost" onPress={() => void run(() => backend.registerVolunteer(token, campaignId))} />
            ) : null}
            {token && task.recruitmentStatus === "OPEN" ? (
              <Button label="Xin việc này" tone="ghost" onPress={() => void run(() => backend.applyTask(token, task._id))} />
            ) : null}
          </View>
        );
      })}
      <Body muted>Đơn tham gia chiến dịch của bạn</Body>
      {joins.rows.length === 0 ? <Body>Chưa đăng ký chiến dịch nào.</Body> : null}
      {joins.rows.slice(0, 5).map((row) => (
        <Body key={row._id}>{`${refTitle(row.campaignId) || "Chiến dịch"} · ${row.status || ""}`}</Body>
      ))}
      <Body muted>Đơn xin việc của bạn</Body>
      {applications.rows.length === 0 ? <Body>Chưa xin việc nào.</Body> : null}
      {applications.rows.slice(0, 5).map((row) => (
        <Body key={row._id}>{`${refTitle(row.taskId) || "Việc"} · ${row.status || ""}`}</Body>
      ))}
      {mine.rows.slice(0, 5).map((row) => {
        const title = row.taskId && typeof row.taskId === "object" ? row.taskId.title : "Việc được giao";
        return (
          <View key={row._id} style={{ gap: 8 }}>
            <Body>{`${title || "Việc được giao"} · ${row.status}`}</Body>
            {token ? <Button label="Check-in" onPress={() => void run(() => backend.checkInTask(token, row._id))} /> : null}
            {token ? <Button label="Check-out và cộng điểm" tone="ghost" onPress={() => void run(() => backend.checkOutTask(token, row._id))} /> : null}
          </View>
        );
      })}
    </Card>
  );
}
