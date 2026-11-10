import { router } from "expo-router";
import { Text, View } from "react-native";
import { Screen } from "@/components/chrome";
import { ServerTasks } from "@/components/server-flow";
import { Body, Button, Card, Eyebrow, Title } from "@/components/ui";
import { colors, fonts } from "@/theme";

export function VolunteerScreen({
  state,
}: {
  state:
    | "tasks"
    | "pending"
    | "active"
    | "form"
    | "approved"
    | "revision"
    | "rejected"
    | "cancelled"
    | "empty"
    | "done"
    | "assigned"
    | "loading"
    | "error"
    | "form-error";
}) {
  if (state === "loading") {
    return (
      <Screen tab="profile">
        <Title>Đang tải bảng ca</Title>
        <Body>Chưa kết luận hôm nay không có ca khi danh sách chưa về.</Body>
        <Button label="Xem ca đã tải" onPress={() => router.replace("/volunteer/tasks")} />
      </Screen>
    );
  }
  if (state === "error") {
    return (
      <Screen tab="profile">
        <Title>Không tải được bảng ca</Title>
        <Body>Đừng tới trạm theo giờ nhớ. Ca có thể đã đổi người.</Body>
        <Button label="Thử lại" onPress={() => router.replace("/volunteer/tasks")} />
      </Screen>
    );
  }
  if (state === "form-error") {
    return (
      <Screen tab="profile">
        <Title>Đơn chưa gửi được</Title>
        <Body>Trạm chưa nhận hồ sơ. Bạn chưa ở trạng thái chờ duyệt và chưa có ca.</Body>
        <Button label="Gửi lại" onPress={() => router.push("/volunteer/form")} />
      </Screen>
    );
  }
  if (state === "rejected") {
    return (
      <Screen tab="profile">
        <Eyebrow>Đơn bị từ chối</Eyebrow>
        <Title>Trạm không duyệt hồ sơ này</Title>
        <Body>Thiếu giấy Đoàn sau hai lần bổ sung. Chưa có ca, chưa có giờ, chưa có điểm.</Body>
        <Button label="Gửi đơn mới" onPress={() => router.push("/volunteer/form")} />
      </Screen>
    );
  }
  if (state === "cancelled") {
    return (
      <Screen tab="profile">
        <Eyebrow>Đã rút đơn</Eyebrow>
        <Title>Trần Minh Đức rút trước khi được duyệt</Title>
        <Body>Không còn ca nào gắn với đơn này. Các giờ đã chốt ở chiến dịch trước vẫn giữ.</Body>
        <Button label="Đăng ký lại" onPress={() => router.push("/volunteer/form")} />
      </Screen>
    );
  }
  if (state === "empty") {
    return (
      <Screen tab="profile">
        <Title>Hôm nay chưa có ca</Title>
        <Body>Đơn đã duyệt nhưng quản lý chưa phân công. Bạn chưa check-in và chưa có điểm mới.</Body>
        <Button label="Xem đơn đã duyệt" onPress={() => router.push("/volunteer/approved")} />
      </Screen>
    );
  }
  if (state === "assigned") {
    return (
      <Screen tab="profile">
        <Eyebrow>Đã giao việc · chưa vào ca</Eyebrow>
        <Title>Đóng thùng lúc 18:00</Title>
        <Body>Trạm Đa Kao. Điểm cộng khi bấm check-out trên việc đã được giao, không cộng lúc nhận việc.</Body>
        <Button label="Xem mã check-in" onPress={() => router.push("/qr/scan")} />
      </Screen>
    );
  }
  if (state === "done") {
    return (
      <Screen tab="profile">
        <Eyebrow>Ca đã chốt</Eyebrow>
        <Title>Điểm tình nguyện là bản vẽ</Title>
        <Body>Máy chủ cộng điểm lúc check-out. Nếu việc có rewardPoints thì cộng đúng số đó. Không thì tối thiểu 25 điểm.</Body>
        <Button label="Về bảng ca" onPress={() => router.push("/volunteer/tasks")} />
      </Screen>
    );
  }
  if (state === "pending") {
    return (
      <Screen tab="profile">
        <Eyebrow>Chờ duyệt</Eyebrow>
        <Title>Đơn của Trần Minh Đức đang chờ</Title>
        <Body>Chưa có ca, chưa có giờ, chưa có điểm. Quản lý trạm duyệt rồi mới phân công.</Body>
        <Button label="Xem đơn đã duyệt" onPress={() => router.push("/volunteer/approved")} />
      </Screen>
    );
  }
  if (state === "revision") {
    return (
      <Screen tab="profile">
        <Eyebrow>Cần bổ sung</Eyebrow>
        <Title>Thiếu ảnh thẻ sinh viên</Title>
        <Body>Trạm Đa Kao yêu cầu ảnh thẻ hoặc giấy Đoàn trước khi duyệt ca.</Body>
        <Button label="Gửi lại hồ sơ" onPress={() => router.push("/volunteer/form")} />
      </Screen>
    );
  }
  if (state === "approved") {
    return (
      <Screen tab="profile">
        <Eyebrow>Đã duyệt · #V-2025-HG09</Eyebrow>
        <Title>Trần Minh Đức</Title>
        <Body>Sinh viên ĐHQG · Đoàn viên. Duyệt bởi Hoàng Nam, Trạm Đa Kao.</Body>
        <Card>
          <Body>Ca đã đăng ký: chiều thứ Ba, chiều thứ Năm, cả ngày thứ Bảy. Cam kết 12 giờ trong chiến dịch.</Body>
        </Card>
        <Button label="Vào bảng ca" onPress={() => router.push("/volunteer/tasks")} />
      </Screen>
    );
  }
  if (state === "active") {
    return (
      <Screen tab="profile">
        <Eyebrow>Đang trong ca · Trạm Đa Kao</Eyebrow>
        <Title>Phân loại áo ấm</Title>
        <Body>Check-in trên máy chủ không cần mã QR. Điểm cộng lúc check-out.</Body>
        <Button label="Check-in QR" onPress={() => router.push("/qr/scan")} />
        <Button label="Xin hủy ca" tone="ghost" onPress={() => router.push("/shift/confirm")} />
      </Screen>
    );
  }
  return (
    <Screen tab="profile">
      <Title>Việc tình nguyện</Title>
      <Body muted>Đăng ký chiến dịch đang mở, xin việc đang tuyển, rồi bắt đầu khi được giao.</Body>
      <ServerTasks />
    </Screen>
  );
}

export function ShiftScreen({
  state,
}: {
  state: "detail" | "confirm" | "reason" | "cancelled" | "success" | "missing";
}) {
  if (state === "missing") {
    return (
      <Screen tab="profile">
        <Title>Ca này không còn</Title>
        <Body>Quản lý đã gỡ ca hoặc ca không thuộc bạn. Giờ chưa được tính.</Body>
        <Button label="Về bảng ca" onPress={() => router.push("/volunteer/tasks")} />
      </Screen>
    );
  }
  if (state === "confirm") {
    return (
      <Screen tab="profile">
        <Title>Hủy ca chiều nay?</Title>
        <Body>Máy chủ không có route hủy ca. Bấm xác nhận ở đây không trừ điểm và không gỡ phân công.</Body>
        <Button label="Giữ ca" onPress={() => router.back()} />
        <Button label="Chọn lý do hủy" tone="ghost" onPress={() => router.push("/shift/reason")} />
      </Screen>
    );
  }
  if (state === "reason") {
    return (
      <Screen tab="profile">
        <Title>Lý do hủy ca</Title>
        {["Bận việc đột xuất", "Ốm", "Trùng lịch", "Khác"].map((reason) => (
          <Card key={reason}>
            <Text style={{ fontFamily: fonts.semibold, fontSize: 15 }}>{reason}</Text>
          </Card>
        ))}
        <Button label="Xác nhận hủy" tone="danger" onPress={() => router.push("/shift/success")} />
      </Screen>
    );
  }
  if (state === "cancelled" || state === "success") {
    return (
      <Screen tab="profile">
        <Title>Đã hủy ca</Title>
        <Body>Trưởng ca đã nhận tin. Gợi ý ca đóng thùng 18:00 tại Đa Kao nếu bạn sắp xếp lại được.</Body>
        <Button label="Nhận ca 18:00" onPress={() => router.push("/volunteer/tasks")} />
      </Screen>
    );
  }
  return (
    <Screen tab="profile">
      <Eyebrow>Chi tiết ca</Eyebrow>
      <Title>Phân loại áo ấm</Title>
      <Body>13:30–17:00 · Trạm Đa Kao · 45 Mạc Đĩnh Chi.</Body>
      <Card>
        <Body muted>Hủy trước giờ trực không xóa các giờ đã được chốt ở ca trước.</Body>
      </Card>
      <Button label="Check-in" onPress={() => router.push("/qr/scan")} />
      <Button label="Hủy ca này" tone="ghost" onPress={() => router.push("/shift/confirm")} />
      <Button label="Ca không còn" tone="ghost" onPress={() => router.push("/shift/missing")} />
    </Screen>
  );
}
