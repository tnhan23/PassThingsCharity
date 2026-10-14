import { router } from "expo-router";
import { ActivityIndicator, Text, View } from "react-native";
import { Screen, type TabKey } from "@/components/chrome";
import { Body, Button, Card, Eyebrow, Title } from "@/components/ui";
import { colors, fonts } from "@/theme";

function Qty({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <Text style={{ fontFamily: fonts.regular, fontSize: 11, color: colors.muted }}>{label}</Text>
      <Text style={{ fontFamily: fonts.bold, fontSize: 18, color: colors.ink, fontVariant: ["tabular-nums"] }}>{value}</Text>
      <Text style={{ fontFamily: fonts.medium, fontSize: 11, color: colors.primary }}>{unit}</Text>
    </View>
  );
}

function Wait({ title, detail }: { title: string; detail: string }) {
  return (
    <Card>
      <ActivityIndicator color={colors.primary} />
      <Title>{title}</Title>
      <Body muted>{detail}</Body>
    </Card>
  );
}

export function LedgerScreen({ mode }: { mode: "content" | "loading" | "error" | "empty" }) {
  if (mode === "loading") {
    return (
      <Screen tab="give">
        <Wait title="Đang đọc sổ chiến dịch" detail="Chưa hiện 0 khi số lượng chưa về. Đã nhận, đang giữ và đã giao tải cùng lúc." />
        <Button label="Xem sổ đã tải" onPress={() => router.replace("/ledger/content")} />
      </Screen>
    );
  }
  if (mode === "error") {
    return (
      <Screen tab="give">
        <Title>Không đọc được sổ</Title>
        <Body>Số trên màn hình cũ có thể sai. Không dùng bản này để ký nhận hay điều phối.</Body>
        <Button label="Thử lại" onPress={() => router.replace("/ledger/content")} />
      </Screen>
    );
  }
  if (mode === "empty") {
    return (
      <Screen tab="give">
        <Eyebrow>Áo ấm Hà Giang · đã phát hành</Eyebrow>
        <Title>Chưa có dòng nào được nhận</Title>
        <Body>Ba cột đang là 0 vì chưa có kiện nào nhân viên ký. 0 này là số thật, không phải màn đang tải.</Body>
        <Button label="Về quầy tiếp nhận" onPress={() => router.push("/intake/review")} />
      </Screen>
    );
  }
  return (
    <Screen tab="give">
      <Eyebrow>Hội Chữ thập đỏ TP.HCM</Eyebrow>
      <Title>Sổ Áo ấm Hà Giang</Title>
      <Body>Chiến dịch thuộc tổ chức. Ba trạm cùng tham gia. Điều phối chỉ đổi cột đang giữ.</Body>
      <Card>
        <Eyebrow>Áo ấm · đơn vị khóa: kg</Eyebrow>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Qty label="Đã nhận" value="340" unit="kg" />
          <Qty label="Đang giữ" value="180" unit="kg" />
          <Qty label="Đã giao" value="160" unit="kg" />
        </View>
        <Body muted>Đa Kao 120 kg, Phú Mỹ Hưng 40 kg, Bình Thạnh 20 kg. Cộng đang giữ và đã giao bằng đã nhận.</Body>
      </Card>
      <Card>
        <Eyebrow>Mì gói · đơn vị khóa: thùng</Eyebrow>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Qty label="Đã nhận" value="90" unit="thùng" />
          <Qty label="Đang giữ" value="45" unit="thùng" />
          <Qty label="Đã giao" value="45" unit="thùng" />
        </View>
      </Card>
      <Card>
        <Eyebrow>Giày · đơn vị khóa: đôi</Eyebrow>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Qty label="Đã nhận" value="40" unit="đôi" />
          <Qty label="Đang giữ" value="28" unit="đôi" />
          <Qty label="Đã giao" value="12" unit="đôi" />
        </View>
        <Body muted>Không ghi giày theo chiếc trên cùng một dòng.</Body>
      </Card>
      <Button label="Xem khi sổ trống" tone="ghost" onPress={() => router.push("/ledger/empty")} />
      <Button label="Xem khi không tải được" tone="ghost" onPress={() => router.push("/ledger/error")} />
    </Screen>
  );
}

export function BoardScreen({
  mode,
}: {
  mode: "active" | "draft" | "window" | "completed" | "cancelled" | "loading" | "error";
}) {
  if (mode === "loading") {
    return (
      <Screen tab="give">
        <Wait title="Đang kiểm tra trạng thái" detail="Chưa kết luận chiến dịch đã xong khi máy chưa đọc xong các đợt." />
        <Button label="Xem chiến dịch đang mở" onPress={() => router.replace("/board/active")} />
      </Screen>
    );
  }
  if (mode === "error") {
    return (
      <Screen tab="give">
        <Title>Không đọc được trạng thái</Title>
        <Body>Chưa biết chiến dịch đang mở, hết hạn nhận, hay đã đóng. Đừng ký hoàn tất.</Body>
        <Button label="Thử lại" onPress={() => router.replace("/board/active")} />
      </Screen>
    );
  }
  if (mode === "draft") {
    return (
      <Screen tab="give">
        <Eyebrow>Nháp · chưa công khai</Eyebrow>
        <Title>Áo ấm Hà Giang chưa mở nhận</Title>
        <Body>Hội đang chốt tiêu chuẩn và đơn vị. Trạm chưa được nhận đồ. Người dân chưa thấy chiến dịch trên trang chủ.</Body>
        <Button label="Phát hành chiến dịch" onPress={() => router.push("/board/active")} />
      </Screen>
    );
  }
  if (mode === "window") {
    return (
      <Screen tab="give">
        <Eyebrow>Hết cửa sổ nhận · vẫn đang phân phối</Eyebrow>
        <Title>Không nhận thêm đồ</Title>
        <Body>Hạn nhận đã qua ngày 20/10. Còn một đợt chưa ký tại Nước Min. Quản lý chưa được bấm hoàn tất chiến dịch.</Body>
        <Button label="Mở đợt chưa ký" onPress={() => router.push("/distribution/lots")} />
        <Button label="Xem lúc đã hoàn tất" tone="ghost" onPress={() => router.push("/board/completed")} />
      </Screen>
    );
  }
  if (mode === "completed") {
    return (
      <Screen tab="give">
        <Eyebrow>Hoàn tất · Hoàng Nam xác nhận</Eyebrow>
        <Title>Chiến dịch đã đóng</Title>
        <Body>Cửa sổ nhận đã hết và mọi đợt đã có biên bản. Số đã nhận, đang giữ và đã giao được khóa để báo cáo.</Body>
        <Button label="Báo cáo công khai" onPress={() => router.push("/report/content")} />
      </Screen>
    );
  }
  if (mode === "cancelled") {
    return (
      <Screen tab="give">
        <Eyebrow>Đã hủy</Eyebrow>
        <Title>Dừng nhận vì đường bị sạt</Title>
        <Body>Không nhận kiện mới. Số đã nhận vẫn giữ nguyên. Đồ đang nằm tại trạm phải chuyển hoặc giao, không xóa khỏi sổ.</Body>
        <Button label="Xem sổ còn lại" onPress={() => router.push("/ledger/content")} />
      </Screen>
    );
  }
  return (
    <Screen tab="give">
      <Eyebrow>Đang mở · còn 12 ngày nhận</Eyebrow>
      <Title>Áo ấm Hà Giang</Title>
      <Body>Trạm đang nhận đến 18:30. Phân phối có thể diễn ra song song. Ký một đợt không làm chiến dịch chuyển sang hoàn tất.</Body>
      <Button label="Hết hạn nhận, còn đợt chưa giao" tone="ghost" onPress={() => router.push("/board/window")} />
      <Button label="Bản nháp" tone="ghost" onPress={() => router.push("/board/draft")} />
      <Button label="Chiến dịch bị hủy" tone="ghost" onPress={() => router.push("/board/cancelled")} />
      <Button label="Không đọc được trạng thái" tone="ghost" onPress={() => router.push("/board/error")} />
    </Screen>
  );
}

export function HistoryScreen({ mode }: { mode: "content" | "empty" | "loading" | "error" }) {
  if (mode === "loading") {
    return (
      <Screen tab="profile">
        <Wait title="Đang tải lịch sử" detail="Chưa hiện danh sách trống khi lịch sử chưa về." />
        <Button label="Xem các lần đã nhận" onPress={() => router.replace("/history/content")} />
      </Screen>
    );
  }
  if (mode === "error") {
    return (
      <Screen tab="profile">
        <Title>Không tải được lịch sử</Title>
        <Body>Điểm trên hồ sơ có thể cũ. Các biên lai đã ký vẫn nằm tại trạm.</Body>
        <Button label="Thử lại" onPress={() => router.replace("/history/content")} />
      </Screen>
    );
  }
  if (mode === "empty") {
    return (
      <Screen tab="profile">
        <Title>Chưa có lần nào được nhận</Title>
        <Body>Lịch sử chỉ có dòng nhân viên đã ký. Kiện đang cân không xuất hiện ở đây.</Body>
        <Button label="Xem nhu cầu" onPress={() => router.push("/campaign")} />
      </Screen>
    );
  }
  return (
    <Screen tab="profile">
      <Title>Lịch sử được nhận</Title>
      <Card>
        <Eyebrow>20/03/2025 · Đa Kao</Eyebrow>
        <Text style={{ fontFamily: fonts.semibold, fontSize: 16 }}>8,5 kg áo ấm</Text>
        <Body muted>+85 điểm. 1,5 kg loại không có trong dòng này.</Body>
      </Card>
      <Card>
        <Eyebrow>02/03/2025 · Bình Thạnh</Eyebrow>
        <Text style={{ fontFamily: fonts.semibold, fontSize: 16 }}>12 đôi giày</Text>
        <Body muted>+120 điểm. Đơn vị của dòng là đôi.</Body>
      </Card>
      <Button label="Lịch sử trống" tone="ghost" onPress={() => router.push("/history/empty")} />
    </Screen>
  );
}

export function ReportScreen({ mode }: { mode: "content" | "empty" | "loading" | "error" }) {
  if (mode === "loading") {
    return (
      <Screen tab="give">
        <Wait title="Đang lập báo cáo" detail="Chưa công bố số khi sổ chưa đọc xong." />
        <Button label="Xem báo cáo" onPress={() => router.replace("/report/content")} />
      </Screen>
    );
  }
  if (mode === "error") {
    return (
      <Screen tab="give">
        <Title>Không lập được báo cáo</Title>
        <Body>Đừng công bố số khi sổ chưa đọc được. Trang này không hiện 0.</Body>
        <Button label="Thử lại" onPress={() => router.replace("/report/content")} />
      </Screen>
    );
  }
  if (mode === "empty") {
    return (
      <Screen tab="give">
        <Title>Chưa có số để công bố</Title>
        <Body>Chiến dịch còn nháp hoặc chưa có dòng đã nhận. Trang công khai không ghi 0 như thể đã xong.</Body>
        <Button label="Về chiến dịch" onPress={() => router.push("/board/draft")} />
      </Screen>
    );
  }
  return (
    <Screen tab="give">
      <Eyebrow>Công khai · Áo ấm Hà Giang</Eyebrow>
      <Title>Kết quả đến hôm nay</Title>
      <Body>340 kg áo đã nhận, 160 kg đã giao, 180 kg đang ở ba trạm. 90 thùng mì và 40 đôi giày theo đơn vị riêng.</Body>
      <Card>
        <Body>Đợt Nước Min: ông Sùng A Tủa đã ký phần hàng khô. Phần ẩm ghi phụ lục, chưa tính đã giao đủ.</Body>
        <Body muted>Tên người mang đồ và lý do loại từng kiện không đưa ra trang này.</Body>
      </Card>
      <Button label="Mở sổ chi tiết" onPress={() => router.push("/ledger/content")} />
      <Button label="Không lập được báo cáo" tone="ghost" onPress={() => router.push("/report/error")} />
    </Screen>
  );
}

export function StaffScreen({ mode }: { mode: "roster" | "empty" | "loading" | "error" }) {
  if (mode === "loading") {
    return (
      <Screen tab="stations">
        <Wait title="Đang tải ca trực" detail="Chưa phân công khi danh sách nhân sự chưa về." />
        <Button label="Xem ca đã tải" onPress={() => router.replace("/staff/roster")} />
      </Screen>
    );
  }
  if (mode === "error") {
    return (
      <Screen tab="stations">
        <Title>Không tải được ca trực</Title>
        <Body>Đừng mở quầy khi chưa biết ai có quyền ký nhận.</Body>
        <Button label="Thử lại" onPress={() => router.replace("/staff/roster")} />
      </Screen>
    );
  }
  if (mode === "empty") {
    return (
      <Screen tab="stations">
        <Title>Ca sáng chưa có người</Title>
        <Body>Quản lý cần gán nhân viên tiếp nhận trước khi mở quầy. Tình nguyện viên chưa duyệt không đứng trong danh sách này.</Body>
        <Button label="Xem ca đã có người" onPress={() => router.push("/staff/roster")} />
      </Screen>
    );
  }
  return (
    <Screen tab="stations">
      <Eyebrow>Trạm Đa Kao · ca sáng</Eyebrow>
      <Title>Người đang trực</Title>
      <Card>
        <Text style={{ fontFamily: fonts.semibold, fontSize: 16 }}>Nguyễn Nhật Huy · tiếp nhận</Text>
        <Body muted>ST-042. Chỉ người này ký dòng đã nhận hoặc từ chối.</Body>
      </Card>
      <Card>
        <Text style={{ fontFamily: fonts.semibold, fontSize: 16 }}>Trần Minh Đức · tình nguyện</Text>
        <Body muted>Đã duyệt. Phân công phân loại 13:30. Điểm giờ cộng khi ca được chốt.</Body>
      </Card>
      <Button label="Ca chưa ai trực" tone="ghost" onPress={() => router.push("/staff/empty")} />
      <Button label="Không tải được ca" tone="ghost" onPress={() => router.push("/staff/error")} />
      <Button label="Duyệt đơn khác" tone="ghost" onPress={() => router.push("/volunteer/pending")} />
    </Screen>
  );
}

export function InboxScreen({ mode }: { mode: "content" | "empty" | "error" | "loading" }) {
  if (mode === "loading") {
    return (
      <Screen tab="profile">
        <Wait title="Đang tải hộp thư" detail="Chưa kết luận hộp thư trống khi danh sách chưa về." />
        <Button label="Xem thư đã tải" onPress={() => router.replace("/inbox/content")} />
      </Screen>
    );
  }
  if (mode === "error") {
    return (
      <Screen tab="profile">
        <Title>Không tải được hộp thư</Title>
        <Body>Biên lai và ca trực không mất. Chỉ danh sách thông báo chưa hiện.</Body>
        <Button label="Thử lại" onPress={() => router.replace("/inbox/content")} />
      </Screen>
    );
  }
  if (mode === "empty") {
    return (
      <Screen tab="profile">
        <Title>Hộp thư trống</Title>
        <Body>Khi trạm ký biên lai hoặc duyệt ca, thông báo sẽ hiện ở đây.</Body>
        <Button label="Về trang chủ" onPress={() => router.push("/")} />
      </Screen>
    );
  }
  return (
    <Screen tab="profile">
      <Title>Thông báo</Title>
      <Card>
        <Eyebrow>Hôm nay · 10:46</Eyebrow>
        <Text style={{ fontFamily: fonts.semibold, fontSize: 16 }}>Biên lai đã ký</Text>
        <Body muted>8,5 kg áo ấm vào sổ. +85 điểm.</Body>
      </Card>
      <Card>
        <Eyebrow>Hôm nay · 09:12</Eyebrow>
        <Text style={{ fontFamily: fonts.semibold, fontSize: 16 }}>Ca chiều đã được duyệt</Text>
        <Body muted>Phân loại áo ấm, 13:30 tại Đa Kao.</Body>
      </Card>
      <Card>
        <Eyebrow>Hôm qua</Eyebrow>
        <Text style={{ fontFamily: fonts.semibold, fontSize: 16 }}>Lệnh chuyển đang trên đường</Text>
        <Body muted>#TF-2025-042. Số đã nhận của chiến dịch không đổi.</Body>
      </Card>
      <Button label="Hộp thư trống" tone="ghost" onPress={() => router.push("/inbox/empty")} />
      <Button label="Hộp thư đang tải" tone="ghost" onPress={() => router.push("/inbox/loading")} />
    </Screen>
  );
}

const atlas: { title: string; tab: TabKey; items: [string, string][] }[] = [
  {
    title: "Chiến dịch",
    tab: "give",
    items: [
      ["/board/active", "Đang mở"],
      ["/board/draft", "Nháp"],
      ["/board/window", "Hết cửa sổ nhận"],
      ["/board/completed", "Đã hoàn tất"],
      ["/board/cancelled", "Đã hủy"],
      ["/board/loading", "Đang tải trạng thái"],
      ["/board/error", "Không đọc được trạng thái"],
      ["/campaign", "Trang nhu cầu"],
      ["/campaign/loading", "Đang mở chiến dịch"],
      ["/campaign/error", "Không mở được chiến dịch"],
      ["/campaign/empty", "Chiến dịch chưa mở nhận"],
      ["/", "Trang chủ"],
      ["/home/loading", "Trang chủ đang tải"],
      ["/home/offline", "Mất mạng"],
      ["/home/none", "Chưa có chiến dịch"],
      ["/home/results", "Tìm thấy nhu cầu"],
      ["/home/empty", "Không khớp"],
      ["/search", "Ô tìm kiếm"],
      ["/search/loading", "Đang tìm"],
      ["/search/error", "Không tìm được"],
    ],
  },
  {
    title: "Sổ lượng",
    tab: "give",
    items: [
      ["/ledger/content", "Ba cột"],
      ["/ledger/empty", "Chưa có dòng"],
      ["/ledger/loading", "Đang tải sổ"],
      ["/ledger/error", "Không đọc được sổ"],
      ["/report/content", "Báo cáo công khai"],
      ["/report/empty", "Chưa có số công khai"],
      ["/report/loading", "Đang lập báo cáo"],
      ["/report/error", "Không lập được báo cáo"],
    ],
  },
  {
    title: "Tiếp nhận",
    tab: "stations",
    items: [
      ["/intake/review", "Đang đối soát"],
      ["/intake/loading", "Đang mở quầy"],
      ["/intake/empty", "Bàn cân trống"],
      ["/intake/guest", "Khách không tài khoản"],
      ["/intake/accepted", "Đã nhận"],
      ["/intake/rejected", "Phần loại"],
      ["/intake/failed", "Ký sổ thất bại"],
      ["/receipt/pending", "Đang cân"],
      ["/receipt/done", "Biên lai"],
      ["/receipt/rejected", "Biên lai phần loại"],
      ["/receipt/loading", "Đang tải biên lai"],
      ["/receipt/error", "Không thấy biên lai"],
      ["/feedback", "Góp ý quầy"],
      ["/feedback/sent", "Đã gửi góp ý"],
      ["/feedback/invalid", "Chưa chọn điểm"],
    ],
  },
  {
    title: "Trạm và điều phối",
    tab: "stations",
    items: [
      ["/stations/list", "Danh sách trạm"],
      ["/stations/closed", "Ngoài giờ"],
      ["/stations/overload", "Gần đầy"],
      ["/stations/loading", "Đang tải trạm"],
      ["/stations/error", "Không tải được trạm"],
      ["/stations/denied", "Không có quyền vị trí"],
      ["/stations/map", "Bản đồ trạm"],
      ["/transfer/create", "Tạo lệnh chuyển"],
      ["/transfer/empty", "Chưa có lệnh"],
      ["/transfer/loading", "Đang tải lệnh"],
      ["/transfer/error", "Không tải được lệnh"],
      ["/transfer/preparing", "Đang soạn lệnh"],
      ["/transfer/transit", "Đang giao"],
      ["/transfer/received", "Nhận đủ"],
      ["/transfer/short", "Nhận thiếu"],
      ["/transfer/cancelled", "Hủy lệnh"],
      ["/staff/roster", "Ca trực"],
      ["/staff/empty", "Ca trống"],
      ["/staff/loading", "Đang tải ca trực"],
      ["/staff/error", "Không tải được ca"],
      ["/settings", "Cài đặt"],
      ["/settings/off", "Tắt thông báo"],
      ["/settings/save-error", "Không lưu được cài đặt"],
    ],
  },
  {
    title: "Phân phối",
    tab: "stations",
    items: [
      ["/distribution/lots", "Các đợt"],
      ["/distribution/empty", "Chưa có đợt"],
      ["/distribution/handover", "Ký một đợt"],
      ["/distribution/exception", "Lệch số"],
      ["/distribution/done", "Đợt đã ký"],
      ["/distribution/loading", "Đang tải đợt"],
      ["/distribution/error", "Không tải được đợt"],
    ],
  },
  {
    title: "Tình nguyện",
    tab: "profile",
    items: [
      ["/volunteer/form", "Đơn đăng ký"],
      ["/volunteer/form-error", "Gửi đơn thất bại"],
      ["/volunteer/loading", "Đang tải bảng ca"],
      ["/volunteer/error", "Không tải được bảng ca"],
      ["/volunteer/tasks", "Bảng ca"],
      ["/volunteer/pending", "Chờ duyệt"],
      ["/volunteer/revision", "Cần bổ sung"],
      ["/volunteer/rejected", "Từ chối đơn"],
      ["/volunteer/cancelled", "Rút đơn"],
      ["/volunteer/approved", "Đã duyệt"],
      ["/volunteer/empty", "Chưa có ca"],
      ["/volunteer/assigned", "Đã được giao việc"],
      ["/volunteer/active", "Đang trong ca"],
      ["/volunteer/done", "Ca đã chốt điểm"],
      ["/qr/scan", "Quét QR"],
      ["/qr/checking", "Đang kiểm tra vị trí"],
      ["/qr/success", "Đã vào ca"],
      ["/qr/error", "QR ngoài phạm vi"],
      ["/qr/expired", "Mã QR hết hạn"],
      ["/shift/detail", "Chi tiết ca"],
      ["/shift/confirm", "Hủy ca"],
      ["/shift/reason", "Lý do hủy"],
      ["/shift/cancelled", "Đã hủy ca"],
      ["/shift/success", "Hủy xong"],
      ["/shift/missing", "Ca không còn"],
    ],
  },
  {
    title: "Tài khoản và nhận hỗ trợ",
    tab: "profile",
    items: [
      ["/history/content", "Lịch sử đóng góp"],
      ["/history/empty", "Chưa có lịch sử"],
      ["/history/loading", "Lịch sử đang tải"],
      ["/history/error", "Không tải được lịch sử"],
      ["/profile/full", "Hồ sơ"],
      ["/profile/empty", "Hồ sơ trống"],
      ["/profile/loading", "Hồ sơ đang tải"],
      ["/profile/error", "Không tải được hồ sơ"],
      ["/profile/low", "Điểm chất lượng thấp"],
      ["/otp/enter", "Nhập mã"],
      ["/otp/resend", "Gửi lại mã"],
      ["/otp/error", "Mã sai"],
      ["/otp/locked", "Mã OTP bị khóa"],
      ["/inbox/content", "Hộp thư có tin"],
      ["/inbox/empty", "Hộp thư trống"],
      ["/inbox/loading", "Hộp thư đang tải"],
      ["/inbox/error", "Hộp thư lỗi"],
      ["/receive/form", "Phiếu nhận"],
      ["/receive/sending", "Đang gửi phiếu"],
      ["/receive/stock", "Hết món tại trạm"],
      ["/receive/error", "Phiếu nhận thiếu tin"],
      ["/receive/success", "Đã gửi phiếu"],
    ],
  },
];

export function AtlasScreen() {
  return (
    <Screen tab="profile">
      <Title>Đủ trạng thái</Title>
      <Body>Mỗi dòng mở một màn. Trạng thái tải không hiện số 0. Trạng thái trống là khi sổ đã đọc và thật sự chưa có việc.</Body>
      {atlas.map((group) => (
        <View key={group.title} style={{ gap: 8 }}>
          <Eyebrow>{group.title}</Eyebrow>
          {group.items.map(([href, label]) => (
            <Button key={href} label={label} tone="ghost" onPress={() => router.push(href)} />
          ))}
        </View>
      ))}
    </Screen>
  );
}
