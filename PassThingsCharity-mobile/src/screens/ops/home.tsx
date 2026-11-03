import { router } from "expo-router";
import { Body, Button, Card, Title } from "@/components/ui";
import { OpsGate, RoleNote } from "@/screens/ops/kit";

const sections = [
  { href: "/desk/orgs", title: "Tổ chức", body: "Xem tổ chức bạn được thấy, tạo mới, duyệt hoặc từ chối." },
  { href: "/desk/stations", title: "Trạm", body: "Tạo trạm, kích hoạt, và giao trưởng trạm." },
  { href: "/desk/catalog", title: "Danh mục đồ", body: "Thêm nhóm và loại đồ. Đơn vị nằm trên loại đồ." },
  { href: "/desk/campaigns", title: "Chiến dịch", body: "Tạo chiến dịch, phát hành, gắn đồ và gắn trạm." },
  { href: "/desk/intake", title: "Tiếp nhận", body: "Tìm người trao, ghi phiếu, và đổi trạng thái phiếu." },
  { href: "/desk/transfers", title: "Điều chuyển", body: "Lập lệnh chuyển giữa hai trạm và đổi trạng thái lệnh." },
  { href: "/desk/relief", title: "Giao hàng", body: "Ghi đợt giao. Đóng cả chiến dịch là một nút riêng." },
  { href: "/desk/crew", title: "Nhân sự", body: "Duyệt tình nguyện, tạo việc, và phân công." },
  { href: "/desk/rewards", title: "Điểm và chứng nhận", body: "Cộng điểm, tạo mốc, và cấp chứng nhận." },
] as const;

export function OpsHome() {
  return (
    <OpsGate>
      <Title>Vận hành</Title>
      <RoleNote />
      <Body>Chọn một việc. Danh sách lấy từ server. Bấm một dòng rồi làm việc trên dòng đó.</Body>
      {sections.map((section) => (
        <Card key={section.href}>
          <Title>{section.title}</Title>
          <Body muted>{section.body}</Body>
          <Button label="Mở" onPress={() => router.push(section.href)} />
        </Card>
      ))}
    </OpsGate>
  );
}
