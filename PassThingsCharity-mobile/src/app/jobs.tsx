import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { backend } from "@/api/backend";
import { ApiError } from "@/api/client";
import { useSession } from "@/api/session";
import { Screen } from "@/components/chrome";
import { StationProofScan } from "@/components/station-proof";
import { Badge, Body, Button, Card, Photo, Pill, StatRow, Title } from "@/components/ui";
import { colors, fonts } from "@/theme";

type Post = {
  _id: string;
  title?: string;
  description?: string;
  imageUrl?: string | null;
  rewardPoints?: number;
  startTime?: string;
  endTime?: string;
  slots?: { remaining?: number; total?: number };
  stationId?: { name?: string; address?: string; imageUrl?: string | null } | string;
};

type MyAssignedItem = {
  _id: string;
  status: string;
  hoursSpent?: number;
  taskId?: Post | null;
};

type MyApplicationItem = {
  _id: string;
  status: string;
  appliedAt?: string;
  note?: string;
  taskId?: Post | null;
};

function stationName(value?: Post["stationId"]) {
  if (!value || typeof value === "string") return "Trạm";
  return value.name || "Trạm";
}

function stationImage(value?: Post["stationId"]) {
  if (!value || typeof value === "string") return "";
  return value.imageUrl || "";
}

function postImage(post?: { imageUrl?: string | null; stationId?: Post["stationId"] } | null) {
  if (post?.imageUrl) return post.imageUrl;
  return stationImage(post?.stationId);
}

function stationAddress(value?: Post["stationId"]) {
  if (!value || typeof value === "string") return "";
  return value.address || "";
}

function when(value?: string) {
  if (!value) return "Chưa chốt giờ";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" });
}

function assignmentStatusLabel(status: string) {
  if (status === "ASSIGNED") return "Đã duyệt · Chờ vào ca";
  if (status === "IN_PROGRESS") return "Đang trong ca";
  if (status === "COMPLETED") return "Đã hoàn thành";
  if (status === "ABSENT") return "Vắng mặt";
  return status;
}

function applicationStatusLabel(status: string) {
  if (status === "APPROVED") return "Đã được duyệt";
  if (status === "REJECTED") return "Bị từ chối";
  if (status === "CANCELLED") return "Đã hủy";
  return "Đang chờ Admin duyệt";
}

export default function JobsPage() {
  const { token } = useSession();
  const [tab, setTab] = useState<"open" | "mine">("open");
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [assigned, setAssigned] = useState<MyAssignedItem[]>([]);
  const [applications, setApplications] = useState<MyApplicationItem[]>([]);
  const [busyId, setBusyId] = useState("");
  const [stamp, setStamp] = useState(0);
  const [note, setNote] = useState("");
  const [proofFor, setProofFor] = useState<{ id: string; kind: "in" | "out" } | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    Promise.all([
      backend.listOpenTasks(token),
      backend.myAssignments(token) as Promise<{ data?: MyAssignedItem[] }>,
      backend.myTaskApplications(token) as Promise<{ data?: MyApplicationItem[] }>,
    ])
      .then(([openData, assignedData, appData]) => {
        if (cancelled) return;
        setPosts(openData.data ?? []);
        setAssigned(assignedData.data ?? []);
        setApplications(appData.data ?? []);
      })
      .catch((caught) => {
        if (!cancelled) {
          setPosts([]);
          setNote(caught instanceof ApiError ? caught.message : "Không tải được danh sách việc.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [token, stamp]);

  if (!token) {
    return (
      <Screen tab="profile">
        <Title>Việc tại trạm</Title>
        <Body>Đăng nhập để xem tin tuyển và bấm ứng tuyển.</Body>
        <Button label="Đăng nhập" onPress={() => router.push("/login")} />
      </Screen>
    );
  }

  const totalOpenSlots = (posts ?? []).reduce((sum, post) => sum + (post.slots?.remaining ?? 0), 0);
  const appliedByTaskId = new Map<string, string>();
  for (const app of applications) {
    if (app.taskId?._id) appliedByTaskId.set(app.taskId._id, app.status);
  }
  const pendingOrRejectedApps = applications.filter((app) => app.status !== "APPROVED");

  async function runAction(id: string, action: () => Promise<{ message: string; gamification?: { pointsAwarded?: number } }>) {
    setBusyId(id);
    setNote("");
    try {
      const data = await action();
      const bonus = data.gamification?.pointsAwarded;
      setNote(typeof bonus === "number" && bonus > 0 ? `${data.message} (+${bonus} điểm)` : data.message);
      setStamp((value) => value + 1);
    } catch (caught) {
      setNote(caught instanceof ApiError ? caught.message : "Không thực hiện được thao tác.");
    } finally {
      setBusyId("");
    }
  }

  return (
    <Screen tab="profile">
      <Title>Việc tại trạm</Title>
      <Body muted>Ứng tuyển công việc tình nguyện tại trạm, xem đơn đã được duyệt và điểm danh nhận điểm thưởng.</Body>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        <Pill label={`Tin đang tuyển (${posts?.length ?? 0})`} active={tab === "open"} onPress={() => setTab("open")} />
        <Pill label={`Việc đã duyệt & đơn của tôi (${assigned.length + pendingOrRejectedApps.length})`} active={tab === "mine"} onPress={() => setTab("mine")} />
      </ScrollView>
      {note ? <Body>{note}</Body> : null}
      {proofFor ? (
        <StationProofScan
          title={proofFor.kind === "in" ? "Điểm danh bắt đầu việc" : "Điểm danh hoàn thành việc"}
          onCancel={() => setProofFor(null)}
          onDone={(proof) => {
            const next = proofFor;
            setProofFor(null);
            void runAction(next.id, () => (
              next.kind === "in"
                ? backend.checkInTask(token, next.id, proof)
                : backend.checkOutTask(token, next.id, proof)
            ));
          }}
        />
      ) : null}

      {tab === "open" ? (
        <>
          {posts ? (
            <StatRow
              items={[
                { label: "Tin đang mở", value: posts.length, unit: "việc", tone: "primary" },
                { label: "Tổng chỗ trống", value: totalOpenSlots, unit: "chỗ", tone: "coral" },
                { label: "Việc đã nhận", value: assigned.length, unit: "việc", tone: "ink" },
              ]}
            />
          ) : null}
          {posts && posts.length === 0 ? <Body muted>Hiện chưa có tin nào đang mở.</Body> : null}
          {posts?.map((post) => {
            const remaining = post.slots?.remaining;
            const total = post.slots?.total;
            const myStatus = appliedByTaskId.get(post._id);
            return (
              <Card key={post._id}>
                {postImage(post) ? <Photo uri={postImage(post)} height={148} radius={12} /> : null}
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                  <Badge label={stationName(post.stationId)} tone="primary" />
                  <Badge label={`+${post.rewardPoints || 0} điểm`} tone="coral" />
                </View>
                <Title>{post.title || "Việc chưa đặt tên"}</Title>
                {post.description ? <Body muted>{post.description}</Body> : null}
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                  <Text style={{ fontFamily: fonts.medium, fontSize: 13, color: colors.muted, fontVariant: ["tabular-nums"] }}>
                    {`${when(post.startTime)} – ${when(post.endTime)}`}
                  </Text>
                  <Badge
                    label={remaining === undefined ? "Chưa rõ số chỗ" : `Còn ${remaining}${total ? `/${total}` : ""} chỗ`}
                    tone={remaining === 0 ? "danger" : "neutral"}
                  />
                </View>
                {myStatus ? (
                  <Button
                    label={myStatus === "APPROVED" ? "Đã được duyệt — Xem việc của tôi" : `Đã nộp đơn (${applicationStatusLabel(myStatus)})`}
                    tone="ghost"
                    onPress={() => setTab("mine")}
                  />
                ) : (
                  <Button
                    label={busyId === post._id ? "Đang gửi..." : "Ứng tuyển"}
                    disabled={busyId !== "" || remaining === 0}
                    onPress={() => void runAction(post._id, () => backend.applyTask(token, post._id))}
                  />
                )}
              </Card>
            );
          })}
        </>
      ) : (
        <>
          <StatRow
            items={[
              { label: "Đã duyệt & giao", value: assigned.length, unit: "việc", tone: "primary" },
              { label: "Đang chờ duyệt", value: applications.filter((a) => a.status === "PENDING").length, unit: "đơn", tone: "coral" },
              { label: "Hoàn thành", value: assigned.filter((a) => a.status === "COMPLETED").length, unit: "việc", tone: "ink" },
            ]}
          />
          <Title>Việc đã được duyệt cho bạn</Title>
          {assigned.length === 0 ? (
            <Card>
              <Body muted>Chưa có việc nào được duyệt giao cho bạn. Khi Admin duyệt đơn, công việc sẽ hiện ngay tại đây.</Body>
            </Card>
          ) : null}
          {assigned.map((item) => {
            const task = item.taskId;
            return (
              <Card key={item._id}>
                {postImage(task) ? <Photo uri={postImage(task)} height={148} radius={12} /> : null}
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                  <Badge label={stationName(task?.stationId)} tone="primary" />
                  <Badge
                    label={assignmentStatusLabel(item.status)}
                    tone={item.status === "COMPLETED" ? "primary" : item.status === "IN_PROGRESS" ? "coral" : "warning"}
                  />
                </View>
                <Title>{task?.title || "Công việc tình nguyện"}</Title>
                {stationAddress(task?.stationId) ? <Body muted>{`Địa chỉ: ${stationAddress(task?.stationId)}`}</Body> : null}
                {task?.description ? <Body>{task.description}</Body> : null}
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                  <Text style={{ fontFamily: fonts.medium, fontSize: 13, color: colors.muted, fontVariant: ["tabular-nums"] }}>
                    {`${when(task?.startTime)} – ${when(task?.endTime)}`}
                  </Text>
                  <Badge label={`+${task?.rewardPoints || 0} điểm`} tone="coral" />
                </View>
                {item.status === "ASSIGNED" ? (
                  <Button
                    label={busyId === item._id ? "Đang xử lý..." : "Bắt đầu làm (Check-in)"}
                    disabled={busyId !== ""}
                    onPress={() => setProofFor({ id: item._id, kind: "in" })}
                  />
                ) : null}
                {item.status === "IN_PROGRESS" ? (
                  <Button
                    label={busyId === item._id ? "Đang xử lý..." : "Hoàn thành công việc (Check-out nhận điểm)"}
                    tone="coral"
                    disabled={busyId !== ""}
                    onPress={() => setProofFor({ id: item._id, kind: "out" })}
                  />
                ) : null}
              </Card>
            );
          })}

          {pendingOrRejectedApps.length > 0 ? (
            <>
              <Title>Đơn đang chờ / đã từ chối</Title>
              {pendingOrRejectedApps.map((app) => (
                <Card key={app._id}>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                    <Badge label={stationName(app.taskId?.stationId)} tone="neutral" />
                    <Badge
                      label={applicationStatusLabel(app.status)}
                      tone={app.status === "REJECTED" ? "danger" : "warning"}
                    />
                  </View>
                  <Title>{app.taskId?.title || "Công việc đã ứng tuyển"}</Title>
                  <Text style={{ fontFamily: fonts.medium, fontSize: 13, color: colors.muted, fontVariant: ["tabular-nums"] }}>
                    {`${when(app.taskId?.startTime)} – ${when(app.taskId?.endTime)}`}
                  </Text>
                </Card>
              ))}
            </>
          ) : null}
        </>
      )}
    </Screen>
  );
}
