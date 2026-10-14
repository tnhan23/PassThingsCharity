import { router } from "expo-router";
import { Text, TextInput, View } from "react-native";
import { Screen } from "@/components/chrome";
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
        <Body>Trạm Đa Kao. Điểm chỉ cộng sau khi quản lý chốt ca.</Body>
        <Button label="Xem mã check-in" onPress={() => router.push("/qr/scan")} />
      </Screen>
    );
  }
  if (state === "done") {
    return (
      <Screen tab="profile">
        <Eyebrow>Ca đã chốt</Eyebrow>
        <Title>+40 điểm tình nguyện</Title>
        <Body>4 giờ phân loại áo ấm tại Đa Kao. Giờ được cộng lúc chốt, không phải lúc nhận ca.</Body>
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
        <Body>Check-in lúc 13:28. Ca 13:30–17:00. Điểm cộng khi quản lý chốt ca, không cộng lúc nhận ca.</Body>
        <Button label="Check-in QR" onPress={() => router.push("/qr/scan")} />
        <Button label="Xin hủy ca" tone="ghost" onPress={() => router.push("/shift/confirm")} />
      </Screen>
    );
  }
  if (state === "form") {
    return (
      <Screen tab="profile">
        <Eyebrow>Đăng ký tình nguyện · Hà Giang 2025</Eyebrow>
        <Title>Đơn tham gia</Title>
        <Field label="Họ tên" placeholder="Trần Minh Đức" />
        <Field label="Điện thoại" placeholder="0987 000 321" />
        <Field label="Trường hoặc đơn vị" placeholder="ĐHQG TP.HCM" />
        <Card>
          <Body muted>Kỹ năng: phân loại, cân ký, đóng thùng. Trạm chính: Đa Kao.</Body>
        </Card>
        <Button label="Gửi đơn" onPress={() => router.push("/volunteer/pending")} />
        <Button label="Gửi đơn thất bại" tone="ghost" onPress={() => router.push("/volunteer/form-error")} />
        <Button label="Hồ sơ bị trả" tone="ghost" onPress={() => router.push("/volunteer/revision")} />
      </Screen>
    );
  }
  return (
    <Screen tab="profile">
      <Eyebrow>Trần Minh Đức · TNV</Eyebrow>
      <Title>Ca hôm nay</Title>
      <Card>
        <Text style={{ fontFamily: fonts.semibold, fontSize: 16 }}>Phân loại và cân áo ấm</Text>
        <Body muted>13:30–17:00 · Trạm Đa Kao · 2/4 người đã có mặt</Body>
        <Button label="Bắt đầu ca" onPress={() => router.push("/volunteer/active")} />
      </Card>
      <Card>
        <Eyebrow>Cần người</Eyebrow>
        <Body>Đóng thùng 18:00–21:00 tại Đa Kao. Bốc xếp 07:30 sáng mai tại Phú Mỹ Hưng.</Body>
      </Card>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Stat n="24" label="Giờ đã chốt" />
        <Stat n="05" label="Nhiệm vụ" />
        <Stat n="180" label="Điểm TNV" />
      </View>
      <Button label="Đơn chờ duyệt" tone="ghost" onPress={() => router.push("/volunteer/pending")} />
      <Button label="Đơn bị từ chối" tone="ghost" onPress={() => router.push("/volunteer/rejected")} />
      <Button label="Ca đã chốt điểm" tone="ghost" onPress={() => router.push("/volunteer/done")} />
      <Button label="Bảng ca đang tải" tone="ghost" onPress={() => router.push("/volunteer/loading")} />
      <Button label="Không tải được bảng ca" tone="ghost" onPress={() => router.push("/volunteer/error")} />
    </Screen>
  );
}

function Field({ label, placeholder }: { label: string; placeholder: string }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontFamily: fonts.medium, fontSize: 13, color: colors.muted }}>{label}</Text>
      <TextInput
        placeholder={placeholder}
        placeholderTextColor={colors.outline}
        style={{
          backgroundColor: colors.card,
          borderWidth: 1,
          borderColor: colors.hairline,
          borderRadius: 12,
          paddingHorizontal: 12,
          minHeight: 46,
          fontFamily: fonts.regular,
          fontSize: 15,
          color: colors.ink,
        }}
      />
    </View>
  );
}

function Stat({ n, label }: { n: string; label: string }) {
  return (
    <Card style={{ flex: 1, padding: 12 }}>
      <Text style={{ fontFamily: fonts.bold, fontSize: 18, color: colors.primary }}>{n}</Text>
      <Eyebrow>{label}</Eyebrow>
    </Card>
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
        <Body>Ca phân loại 13:30 tại Đa Kao. Hủy sát giờ làm trạm thiếu người. Điểm giờ của ca này sẽ không được cộng.</Body>
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
