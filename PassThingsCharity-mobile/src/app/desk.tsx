import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Text } from "react-native";
import { backend, resultText } from "@/api/backend";
import { ApiError } from "@/api/client";
import { useSession } from "@/api/session";
import { Screen } from "@/components/chrome";
import { Action } from "@/components/form";
import { Body, Button, Card, Eyebrow, Title } from "@/components/ui";
import { colors, fonts } from "@/theme";

function kept(values: Record<string, string>, keys: string[]) {
  const body: Record<string, string> = {};
  for (const key of keys) {
    const value = values[key]?.trim();
    if (value) body[key] = value;
  }
  return body;
}

function Snapshot({
  title,
  load,
}: {
  title: string;
  load: (token: string) => Promise<string>;
}) {
  const { token } = useSession();
  const [text, setText] = useState("Chưa tải.");

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    load(token)
      .then((next) => {
        if (!cancelled) setText(next);
      })
      .catch((caught) => {
        if (!cancelled) setText(caught instanceof ApiError ? caught.message : "Không tải được.");
      });
    return () => {
      cancelled = true;
    };
  }, [load, token]);

  return (
    <Card>
      <Title>{title}</Title>
      <Text selectable style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.ink }}>{text}</Text>
    </Card>
  );
}

export default function DeskPage() {
  const { token } = useSession();

  if (!token) {
    return (
      <Screen tab="profile">
        <Title>Vận hành</Title>
        <Body>Đăng nhập để gọi các API còn lại. Tài khoản admin_system gọi được nhóm quản trị.</Body>
        <Button label="Đăng nhập" onPress={() => router.push("/login")} />
      </Screen>
    );
  }

  return (
    <Screen tab="profile">
      <Title>Vận hành</Title>
      <Body muted>Mỗi thẻ gọi một route của server. Id hiện trong các danh sách, chọn và dán vào ô bên dưới.</Body>

      <Eyebrow>Đọc danh sách</Eyebrow>
      <Snapshot title="GET /users" load={async (current) => {
        const data = await backend.listUsers(current);
        return data.data.map((user) => `${user.username} ${user._id}`).join("\n") || "Không có user.";
      }} />
      <Snapshot title="GET /organizations" load={async (current) => {
        const data = await backend.listOrganizations(current);
        return data.data.map((org) => `${org.name} ${org._id}`).join("\n") || "Không có tổ chức.";
      }} />
      <Snapshot title="GET /stations" load={async (current) => {
        const data = await backend.listStations(current);
        return data.data.map((station) => `${station.name} ${station._id}`).join("\n") || "Không có trạm.";
      }} />
      <Snapshot title="GET /catalog/categories" load={async () => {
        const data = await backend.listCategories();
        return data.categories.map((item) => `${item.name} ${item._id}`).join("\n") || "Không có danh mục.";
      }} />
      <Snapshot title="GET /catalog/items" load={async () => {
        const data = await backend.listItemTypes();
        return data.itemTypes.map((item) => `${item.name} ${item.unit ?? ""} ${item._id}`).join("\n") || "Không có loại đồ.";
      }} />
      <Snapshot title="GET /campaigns" load={async () => {
        const data = await backend.listCampaigns();
        return data.campaigns.map((item) => `${item.title} ${item._id}`).join("\n") || "Không có chiến dịch công khai.";
      }} />
      <Snapshot title="GET /gamification/achievements" load={async () => {
        const data = await backend.listAchievements();
        return data.achievements.map((item) => `${item.title} ${item._id}`).join("\n") || "Không có thành tích.";
      }} />

      <Eyebrow>Tài khoản và quyền</Eyebrow>
      <Action title="Đặt lại mật khẩu" note="PATCH /auth/reset-password/:id. Chỉ ADMIN. Mật khẩu mới từ 8 ký tự." fields={[{ name: "userId", label: "User id" }, { name: "newPassword", label: "Mật khẩu mới", secure: true }]} label="Đặt lại" run={(values, current) => backend.adminResetPassword(current, values.userId.trim(), values.newPassword)} />
      <Action title="Lọc user theo role" note="GET /users?role=. ADMIN, STATION_MANAGER, STAFF, VOLUNTEER, USER." fields={[{ name: "role", label: "Role" }]} label="Lọc" run={async (values, current) => {
        const data = await backend.listUsers(current, values.role.trim());
        return { message: data.data.map((user) => `${user.username} ${user._id}`).join(", ") || "Không có user." };
      }} />
      <Action title="Đổi trạng thái user" note="PATCH /users/:id/status. active, inactive, hoặc banned." fields={[{ name: "userId", label: "User id" }, { name: "status", label: "Trạng thái" }]} label="Cập nhật" run={(values, current) => backend.setUserStatus(current, values.userId.trim(), values.status.trim())} />
      <Action title="Tạo user" note="POST /users. Server hiện đọc biến stationId chưa khai báo, nên lời gọi có thể trả lỗi 500." fields={[{ name: "email", label: "Email" }, { name: "username", label: "Username" }, { name: "password", label: "Mật khẩu", secure: true }, { name: "fullName", label: "Họ tên" }, { name: "phone", label: "Số điện thoại" }]} label="Tạo" run={(values, current) => backend.createUser(current, kept(values, ["email", "username", "password", "fullName", "phone"]))} />
      <Action title="Cấp quản lý trạm" note="PATCH /users/:id/station-manager. Chỉ nâng tài khoản đang là USER." fields={[{ name: "userId", label: "User id" }]} label="Cấp quyền" run={(values, current) => backend.assignStationManager(current, values.userId.trim())} />

      <Eyebrow>Tổ chức và trạm</Eyebrow>
      <Action title="Xem tổ chức" note="GET /organizations/:id" fields={[{ name: "id", label: "Organization id" }]} label="Xem" run={async (values, current) => resultText(await backend.getOrganization(current, values.id.trim()))} />
      <Action title="Tạo tổ chức" note="POST /organizations. name, code, address là bắt buộc." fields={[{ name: "name", label: "Tên" }, { name: "code", label: "Mã" }, { name: "address", label: "Địa chỉ" }, { name: "phone", label: "Điện thoại" }, { name: "email", label: "Email" }]} label="Tạo" run={(values, current) => backend.createOrganization(current, kept(values, ["name", "code", "address", "phone", "email"]))} />
      <Action title="Sửa tổ chức" note="PATCH /organizations/:id" fields={[{ name: "id", label: "Organization id" }, { name: "name", label: "Tên mới" }, { name: "address", label: "Địa chỉ mới" }]} label="Sửa" run={(values, current) => backend.updateOrganization(current, values.id.trim(), kept(values, ["name", "address"]))} />
      <Action title="Xóa tổ chức" note="DELETE /organizations/:id" fields={[{ name: "id", label: "Organization id" }]} label="Xóa" run={(values, current) => backend.deleteOrganization(current, values.id.trim())} />
      <Action title="Duyệt tổ chức" note="PATCH /admin/organizations/:id/approve" fields={[{ name: "id", label: "Organization id" }]} label="Duyệt" run={(values, current) => backend.approveOrganization(current, values.id.trim())} />
      <Action title="Tạo trạm cho tổ chức" note="POST /organizations/:organizationId/stations" fields={[{ name: "organizationId", label: "Organization id" }, { name: "name", label: "Tên trạm" }, { name: "address", label: "Địa chỉ" }]} label="Tạo trạm" run={(values, current) => backend.createStationForOrganization(current, values.organizationId.trim(), kept(values, ["name", "address"]))} />
      <Action title="Tạo trạm tại /stations" note="POST /stations. Handler đang lấy organizationId từ param của route tổ chức, nên route này thường trả lỗi." fields={[{ name: "name", label: "Tên trạm" }, { name: "address", label: "Địa chỉ" }]} label="Gọi /stations" run={(values, current) => backend.createStation(current, kept(values, ["name", "address"]))} />
      <Action title="Xem trạm" note="GET /stations/:id" fields={[{ name: "id", label: "Station id" }]} label="Xem" run={async (values, current) => resultText(await backend.getStation(current, values.id.trim()))} />
      <Action title="Sửa trạm" note="PATCH /stations/:id" fields={[{ name: "id", label: "Station id" }, { name: "name", label: "Tên mới" }, { name: "address", label: "Địa chỉ mới" }]} label="Sửa" run={(values, current) => backend.updateStation(current, values.id.trim(), kept(values, ["name", "address"]))} />
      <Action title="Xóa trạm" note="DELETE /stations/:id" fields={[{ name: "id", label: "Station id" }]} label="Xóa" run={(values, current) => backend.deleteStation(current, values.id.trim())} />
      <Action title="Duyệt trạm" note="PATCH /admin/stations/:id/approve. Tổ chức phải được duyệt trước." fields={[{ name: "id", label: "Station id" }]} label="Duyệt" run={(values, current) => backend.approveStation(current, values.id.trim())} />
      <Action title="Gán staff có sẵn" note="POST /stations/:id/staff/:userId. User phải đang có role STAFF." fields={[{ name: "stationId", label: "Station id" }, { name: "userId", label: "User id" }]} label="Gán" run={(values, current) => backend.assignStaff(current, values.stationId.trim(), values.userId.trim())} />
      <Action title="Gỡ gán staff" note="DELETE /stations/:id/staff/:userId" fields={[{ name: "stationId", label: "Station id" }, { name: "userId", label: "User id" }]} label="Gỡ" run={(values, current) => backend.removeStaffAssignment(current, values.stationId.trim(), values.userId.trim())} />
      <Action title="Tạo staff cho trạm" note="POST /stationmanager/:stationId/staff. Chỉ STATION_MANAGER của trạm đó." fields={[{ name: "stationId", label: "Station id" }, { name: "email", label: "Email" }, { name: "username", label: "Username" }, { name: "password", label: "Mật khẩu", secure: true }, { name: "fullName", label: "Họ tên" }, { name: "phone", label: "Số điện thoại" }]} label="Tạo staff" run={(values, current) => backend.createStaff(current, values.stationId.trim(), kept(values, ["email", "username", "password", "fullName", "phone"]))} />
      <Action title="Danh sách staff" note="GET /stationmanager/:stationId/staff" fields={[{ name: "stationId", label: "Station id" }]} label="Xem staff" run={async (values, current) => {
        const data = await backend.listStaff(current, values.stationId.trim());
        return { message: data.data.map((staff) => `${staff.username ?? "staff"} ${staff._id ?? ""}`).join(", ") || "Không có staff." };
      }} />
      <Action title="Gỡ staff khỏi trạm" note="DELETE /stationmanager/:stationId/staff/:staffId" fields={[{ name: "stationId", label: "Station id" }, { name: "staffId", label: "Staff id" }]} label="Gỡ staff" run={(values, current) => backend.removeStaff(current, values.stationId.trim(), values.staffId.trim())} />

      <Eyebrow>Danh mục và chiến dịch</Eyebrow>
      <Action title="Tạo danh mục" note="POST /catalog/categories" fields={[{ name: "name", label: "Tên" }, { name: "description", label: "Mô tả" }]} label="Tạo" run={(values, current) => backend.createCategory(current, kept(values, ["name", "description"]))} />
      <Action title="Sửa danh mục" note="PATCH /catalog/categories/:id" fields={[{ name: "id", label: "Category id" }, { name: "name", label: "Tên mới" }]} label="Sửa" run={(values, current) => backend.updateCategory(current, values.id.trim(), kept(values, ["name"]))} />
      <Action title="Xóa danh mục" note="DELETE /catalog/categories/:id" fields={[{ name: "id", label: "Category id" }]} label="Xóa" run={(values, current) => backend.deleteCategory(current, values.id.trim())} />
      <Action title="Tạo loại đồ" note="POST /catalog/items. Đơn vị KG, PAIR, BOX, hoặc PACK." fields={[{ name: "categoryId", label: "Category id" }, { name: "name", label: "Tên" }, { name: "unit", label: "Đơn vị" }]} label="Tạo" run={(values, current) => backend.createItemType(current, kept(values, ["categoryId", "name", "unit"]))} />
      <Action title="Sửa loại đồ" note="PATCH /catalog/items/:id" fields={[{ name: "id", label: "Item type id" }, { name: "name", label: "Tên mới" }]} label="Sửa" run={(values, current) => backend.updateItemType(current, values.id.trim(), kept(values, ["name"]))} />
      <Action title="Xóa loại đồ" note="DELETE /catalog/items/:id" fields={[{ name: "id", label: "Item type id" }]} label="Xóa" run={(values, current) => backend.deleteItemType(current, values.id.trim())} />
      <Action title="Tạo chiến dịch" note="POST /campaigns. Khoảng cách startDate và endDate phải từ 5 đến 7 ngày. Ví dụ 2026-10-20 và 2026-10-26." fields={[{ name: "title", label: "Tên" }, { name: "description", label: "Mô tả" }, { name: "startDate", label: "Ngày bắt đầu" }, { name: "endDate", label: "Ngày kết thúc" }, { name: "organizationId", label: "Organization id" }]} label="Tạo" run={(values, current) => backend.createCampaign(current, kept(values, ["title", "description", "startDate", "endDate", "organizationId"]))} />
      <Action title="Sửa chiến dịch" note="PATCH /campaigns/:id" fields={[{ name: "id", label: "Campaign id" }, { name: "title", label: "Tên mới" }, { name: "description", label: "Mô tả" }]} label="Sửa" run={(values, current) => backend.updateCampaign(current, values.id.trim(), kept(values, ["title", "description"]))} />
      <Action title="Đổi trạng thái chiến dịch" note="PATCH /campaigns/:id/status. DRAFT sang PUBLISHED, PUBLISHED sang ACTIVE, ACTIVE sang COMPLETED. CANCELLED được phép trước khi kết thúc." fields={[{ name: "id", label: "Campaign id" }, { name: "status", label: "Trạng thái" }]} label="Đổi" run={(values, current) => backend.updateCampaignStatus(current, values.id.trim(), values.status.trim())} />
      <Action title="Thêm nhu cầu đồ" note="POST /campaigns/:id/items. priority là LOW, MEDIUM, hoặc HIGH." fields={[{ name: "campaignId", label: "Campaign id" }, { name: "itemTypeId", label: "Item type id" }, { name: "targetQuantity", label: "Số mục tiêu" }, { name: "priority", label: "Mức ưu tiên" }]} label="Thêm" run={(values, current) => backend.addCampaignItem(current, values.campaignId.trim(), { itemTypeId: values.itemTypeId.trim(), targetQuantity: Number(values.targetQuantity), priority: values.priority.trim() || "MEDIUM" })} />
      <Action title="Xóa nhu cầu đồ" note="DELETE /campaigns/:id/items/:itemId" fields={[{ name: "campaignId", label: "Campaign id" }, { name: "itemId", label: "Campaign item id" }]} label="Xóa" run={(values, current) => backend.removeCampaignItem(current, values.campaignId.trim(), values.itemId.trim())} />
      <Action title="Gán trạm vào chiến dịch" note="POST /campaigns/:id/stations" fields={[{ name: "campaignId", label: "Campaign id" }, { name: "stationId", label: "Station id" }]} label="Gán" run={(values, current) => backend.assignCampaignStation(current, values.campaignId.trim(), values.stationId.trim())} />
      <Action title="Gỡ trạm khỏi chiến dịch" note="DELETE /campaigns/:id/stations/:stationId" fields={[{ name: "campaignId", label: "Campaign id" }, { name: "stationId", label: "Station id" }]} label="Gỡ" run={(values, current) => backend.removeCampaignStation(current, values.campaignId.trim(), values.stationId.trim())} />
      <Action title="Trạm đang nhận của chiến dịch" note="GET /campaigns/:id/stations" fields={[{ name: "campaignId", label: "Campaign id" }]} label="Xem trạm" run={async (values) => {
        const data = await backend.campaignStations(values.campaignId.trim());
        return { message: data.stations.map((station) => station.name ?? "Trạm").join(", ") || "Chưa có trạm đang mở." };
      }} />

      <Eyebrow>Điểm, thành tích, chứng nhận</Eyebrow>
      <Action title="Điểm của một user" note="GET /gamification/points/user/:userId" fields={[{ name: "userId", label: "User id" }]} label="Xem điểm" run={async (values, current) => {
        const data = await backend.userPoints(current, values.userId.trim());
        return { message: `${data.totalPoints} điểm, ${data.transactions.length} dòng.` };
      }} />
      <Action title="Cộng điểm" note="POST /gamification/points/award. type là DONATION, VOLUNTEER_TASK, BONUS, hoặc SYSTEM." fields={[{ name: "userId", label: "User id" }, { name: "points", label: "Số điểm" }, { name: "type", label: "Loại điểm" }, { name: "description", label: "Mô tả" }]} label="Cộng" run={(values, current) => backend.awardPoints(current, { userId: values.userId.trim(), points: Number(values.points), type: values.type.trim(), description: values.description.trim() })} />
      <Action title="Tạo thành tích" note="POST /gamification/achievements. criteriaType là DONATION_COUNT hoặc POINTS_ACCUMULATED." fields={[{ name: "title", label: "Tên" }, { name: "criteriaType", label: "Loại mốc" }, { name: "criteriaValue", label: "Ngưỡng" }, { name: "pointsReward", label: "Điểm thưởng" }]} label="Tạo" run={(values, current) => backend.createAchievement(current, { title: values.title.trim(), criteriaType: values.criteriaType.trim(), criteriaValue: Number(values.criteriaValue), pointsReward: values.pointsReward.trim() ? Number(values.pointsReward) : 0 })} />
      <Action title="Thành tích của user" note="GET /gamification/achievements/user/:userId" fields={[{ name: "userId", label: "User id" }]} label="Xem" run={async (values, current) => resultText(await backend.userAchievements(current, values.userId.trim()))} />
      <Action title="Chứng nhận của user" note="GET /gamification/certificates/user/:userId" fields={[{ name: "userId", label: "User id" }]} label="Xem" run={async (values, current) => resultText(await backend.userCertificates(current, values.userId.trim()))} />
      <Action title="Cấp chứng nhận" note="POST /gamification/certificates. certificateType là VOLUNTEER hoặc DONOR." fields={[{ name: "userId", label: "User id" }, { name: "campaignId", label: "Campaign id" }, { name: "certificateType", label: "Loại" }, { name: "title", label: "Tiêu đề" }]} label="Cấp" run={(values, current) => backend.issueCertificate(current, kept(values, ["userId", "campaignId", "certificateType", "title"]))} />
    </Screen>
  );
}
