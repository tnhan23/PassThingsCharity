
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { backend } from "@/api/backend";
import { ApiError } from "@/api/client";
import { useSession } from "@/api/session";
import type { TaskRow } from "@/api/types";
import { Body, Button, Card, Tap, Title } from "@/components/ui";
import { OpsGate, useJob, useRole } from "@/screens/ops/kit";
import { colors, fonts } from "@/theme";

export default function WorkforceRoute() {
  const { token } = useSession();
  const role = useRole();
  const job = useJob();
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [taskId, setTaskId] = useState("");
  const [title, setTitle] = useState("");
  const [rewardPoints, setRewardPoints] = useState("25");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const canManage = role === "ADMIN" || role === "STATION_MANAGER" || role === "STAFF";
  const selectedTask = tasks.find((task) => task._id === taskId);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    backend.listTasks(token)
      .then((data) => {
        if (cancelled) return;
        setTasks(data.data);
        setError("");
      })
      .catch((caught) => {
        if (!cancelled) setError(caught instanceof ApiError ? caught.message : "Không tải được dữ liệu nhân sự.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token, refresh]);

  async function updateTask(body: { title?: string; rewardPoints?: number; recruitmentStatus?: string; status?: string }) {
    if (!taskId) return;
    const ok = await job.run((accessToken) => backend.updateTask(accessToken, taskId, body));
    if (ok) setRefresh((value) => value + 1);
  }

  return (
    <OpsGate allowNonOperator>
      <Title>Nhân sự</Title>
      <Body muted>Quản lý các việc tình nguyện tại chiến dịch và trạm.</Body>
      {loading ? <ActivityIndicator color={colors.primary} /> : null}
      {error ? <Body>{error}</Body> : null}
      {job.note ? <Body>{job.note}</Body> : null}

      <Title>Danh sách việc</Title>
      {!loading && !error && tasks.length === 0 ? <Body muted>Chưa có việc nào.</Body> : null}
      {tasks.map((task) => (
        <Tap
          key={task._id}
          onPress={() => {
            setTaskId(task._id);
            setTitle(task.title);
            setRewardPoints(String(task.rewardPoints ?? 0));
          }}
        >
          <Card style={taskId === task._id ? { borderWidth: 1.5, borderColor: colors.primary } : undefined}>
            <Text style={{ fontFamily: fonts.semibold, fontSize: 16, color: colors.ink }}>{task.title}</Text>
            <Body muted>{`${task.status} · ${task.recruitmentStatus || "Chưa mở tuyển"} · ${task.rewardPoints ?? 0} điểm`}</Body>
          </Card>
        </Tap>
      ))}

      {selectedTask && canManage ? (
        <View style={{ gap: 8 }}>
          <Button
            label="Lưu tên và điểm thưởng"
            tone="ghost"
            disabled={job.busy || !title.trim()}
            onPress={() => void updateTask({ title: title.trim(), rewardPoints: Number(rewardPoints) || 0 })}
          />
          <Button
            label="Mở tuyển"
            tone="ghost"
            disabled={job.busy}
            onPress={() => void updateTask({ recruitmentStatus: "OPEN" })}
          />
          <Button
            label="Hủy việc"
            tone="danger"
            disabled={job.busy}
            onPress={() => void updateTask({ status: "CANCELLED" })}
          />
        </View>
      ) : null}

      <Title>Tạo việc mới</Title>
      <Button label="Mở biểu mẫu tạo nhiệm vụ" onPress={() => router.push("/routes/create-task")} />
      {canManage ? <Body muted>Việc có thể được cập nhật hoặc hủy. Máy chủ hiện không cung cấp thao tác xóa.</Body> : null}
    </OpsGate>
  );
}
