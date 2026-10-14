import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { backend } from "@/api/backend";
import { ApiError } from "@/api/client";
import { useSession } from "@/api/session";
import type { StationRow } from "@/api/types";
import { Screen } from "@/components/chrome";
import { Body, Button, Card, Eyebrow, Icon, Pill, Tap, Title } from "@/components/ui";
import { colors, fonts } from "@/theme";

const stations = [
  { name: "Trạm Đa Kao", address: "45 Mạc Đĩnh Chi, Quận 1", hours: "08:00–18:30", km: "1,2 km", load: "Đang nhận" },
  { name: "Trạm Phú Mỹ Hưng", address: "Nguyễn Lương Bằng, Quận 7", hours: "08:30–20:00", km: "6,4 km", load: "Còn chỗ" },
  { name: "Trạm Bình Thạnh", address: "125 Bạch Đằng, Bình Thạnh", hours: "08:30–20:00", km: "2,4 km", load: "Gần đầy" },
];

function StationCards() {
  const { token } = useSession();
  const [rows, setRows] = useState<StationRow[] | null>(null);
  const [problem, setProblem] = useState("");

  useEffect(() => {
    if (!token) {
      setRows(null);
      setProblem("");
      return;
    }
    let cancelled = false;
    backend.listStations(token)
      .then((data) => {
        if (!cancelled) setRows(data.data);
      })
      .catch((caught) => {
        if (!cancelled) setProblem(caught instanceof ApiError ? caught.message : "Không tải được trạm.");
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (!token) {
    return (
      <View style={{ gap: 14 }}>
        <Body muted>Danh sách dưới là bản minh họa. Đăng nhập để lấy trạm từ máy chủ.</Body>
        <Button label="Đăng nhập" onPress={() => router.push("/login")} />
        {stations.map((station) => (
          <Card key={station.name}>
            <Eyebrow>{`${station.km} · ${station.load}`}</Eyebrow>
            <Text style={{ fontFamily: fonts.bold, fontSize: 17 }}>{station.name}</Text>
            <Body muted>{station.address}</Body>
            <Body muted>{station.hours}</Body>
          </Card>
        ))}
      </View>
    );
  }

  if (!rows && !problem) {
    return (
      <Card>
        <ActivityIndicator color={colors.primary} />
        <Title>Đang tải trạm</Title>
      </Card>
    );
  }

  if (problem || !rows) {
    return (
      <Card>
        <Title>Không tải được trạm</Title>
        <Body>{problem || "Máy chủ không trả danh sách."}</Body>
      </Card>
    );
  }

  if (rows.length === 0) {
    return (
      <Card>
        <Title>Chưa có trạm đang mở</Title>
        <Body>Tài khoản này không thấy trạm đã kích hoạt.</Body>
      </Card>
    );
  }

  return (
    <View style={{ gap: 14 }}>
      {rows.map((station) => (
        <Card key={station._id}>
          <Eyebrow>{station.isActive ? "Đang mở" : "Chưa kích hoạt"}</Eyebrow>
          <Text style={{ fontFamily: fonts.bold, fontSize: 17 }}>{station.name}</Text>
          <Body muted>{station.address}</Body>
        </Card>
      ))}
    </View>
  );
}

export function StationsScreen({
  state,
}: {
  state: "list" | "map" | "overload" | "closed" | "loading" | "error" | "denied";
}) {
  if (state === "denied") {
    return (
      <Screen tab="stations">
        <Title>Chưa có quyền vị trí</Title>
        <Body>Bản đồ không hiện khoảng cách. Bạn vẫn chọn trạm trong danh sách và xem giờ mở cửa.</Body>
        <Button label="Xem danh sách trạm" onPress={() => router.push("/stations/list")} />
      </Screen>
    );
  }
  if (state === "loading") {
    return (
      <Screen tab="stations">
        <Card>
          <ActivityIndicator color={colors.primary} />
          <Title>Đang tải trạm</Title>
          <Body muted>Chưa gợi ý trạm khi danh sách chưa về.</Body>
        </Card>
        <Button label="Xem trạm đã tải" onPress={() => router.replace("/stations/list")} />
      </Screen>
    );
  }
  if (state === "error") {
    return (
      <Screen tab="stations">
        <Title>Không tải được trạm</Title>
        <Body>Giờ mở cửa trên màn cũ có thể sai. Hãy thử lại trước khi mang đồ tới.</Body>
        <Button label="Thử lại" onPress={() => router.replace("/stations/list")} />
      </Screen>
    );
  }
  if (state === "closed") {
    return (
      <Screen tab="stations">
        <Eyebrow>Ngoài giờ nhận</Eyebrow>
        <Title>Đa Kao đóng cửa lúc 18:30</Title>
        <Body>Quầy không nhận kiện sau giờ này. Phú Mỹ Hưng còn mở đến 20:00.</Body>
        <Button label="Xem Phú Mỹ Hưng" onPress={() => router.push("/stations/list")} />
      </Screen>
    );
  }
  return (
    <Screen tab="stations">
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Pill label="Danh sách" active={state === "list"} onPress={() => router.push("/stations/list")} />
        <Pill label="Bản đồ" active={state !== "list"} onPress={() => router.push("/stations/map")} />
      </View>
      {state !== "list" ? (
        <Card style={{ height: 220, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" }}>
          <Icon name="map" size={36} color={colors.primary} />
          <Body>Ba trạm trong thành phố. Đa Kao đang nhận áo ấm.</Body>
          {state === "overload" ? <Body>Đa Kao gần đầy. Ưu tiên mang mì gói sang Phú Mỹ Hưng.</Body> : null}
        </Card>
      ) : null}
      {state === "overload" ? (
        <Card style={{ backgroundColor: colors.warningSoft }}>
          <Title>Trạm Đa Kao gần đầy</Title>
          <Body>Áo ấm đã gần mục tiêu tập kết. Bạn vẫn mang được mì gói và thuốc, hoặc tới Phú Mỹ Hưng.</Body>
        </Card>
      ) : null}
      <StationCards />
      <Button label="Vào quầy kiểm định" onPress={() => router.push("/intake/review")} />
      <Button label="Trạm đã đóng cửa" tone="ghost" onPress={() => router.push("/stations/closed")} />
      <Button label="Ca trực hôm nay" tone="ghost" onPress={() => router.push("/staff/roster")} />
      <Button label="Không có quyền vị trí" tone="ghost" onPress={() => router.push("/stations/denied")} />
    </Screen>
  );
}

export function ReceiptScreen({ state }: { state: "done" | "pending" | "rejected" | "loading" | "error" }) {
  if (state === "loading") {
    return (
      <Screen tab="profile">
        <Card>
          <ActivityIndicator color={colors.primary} />
          <Title>Đang tải biên lai</Title>
          <Body muted>Chưa hiện số kg khi biên lai chưa về.</Body>
        </Card>
        <Button label="Xem biên lai đã tải" onPress={() => router.replace("/receipt/done")} />
      </Screen>
    );
  }
  if (state === "error") {
    return (
      <Screen tab="profile">
        <Title>Không thấy biên lai này</Title>
        <Body>Mã không còn hoặc máy chưa đọc được. Đừng chụp màn hình trống để làm bằng chứng.</Body>
        <Button label="Thử lại" onPress={() => router.replace("/receipt/done")} />
      </Screen>
    );
  }
  if (state === "pending") {
    return (
      <Screen tab="stations">
        <Eyebrow>Đang cân · chưa phải biên lai</Eyebrow>
        <Title>Kiện đang trên bàn</Title>
        <Body>Ước lượng khoảng 5,2 kg áo khoác. Số này chưa vào chiến dịch và chưa cộng điểm cho đến khi nhân viên ký.</Body>
        <Button label="Xem biên lai sau khi ký" onPress={() => router.push("/receipt/done")} />
      </Screen>
    );
  }
  if (state === "rejected") {
    return (
      <Screen tab="profile">
        <Eyebrow>#RC-2025-HG-0842</Eyebrow>
        <Title>1,5 kg không vào chiến dịch</Title>
        <Body>Váy mùa hè và áo hai dây không đúng nhu cầu áo ấm Hà Giang. Bạn nhận lại trong ngày hoặc để trạm chuyển tái chế.</Body>
        <Button label="Để trạm tái chế" onPress={() => router.push("/profile/full")} />
        <Button label="Tôi sẽ nhận lại" tone="ghost" onPress={() => router.push("/profile/full")} />
      </Screen>
    );
  }
  return (
    <Screen tab="profile">
      <Eyebrow>Biên lai #RC-2025-HG-0842</Eyebrow>
      <Title>Đã nhận 8,5 kg</Title>
      <Body>Trạm Đa Kao · 10:45 · Nguyễn Thu Thảo ký. Áo khoác 5,0 kg và quần 3,5 kg vào chiến dịch. 1,5 kg loại ra.</Body>
      <Card>
        <Text style={{ fontFamily: fonts.bold, fontSize: 20, color: colors.primary }}>+85 điểm</Text>
        <Body muted>10 điểm mỗi kg đạt. Phần loại = 0 điểm.</Body>
      </Card>
      <Button label="Góp ý quầy" tone="ghost" onPress={() => router.push("/feedback")} />
    </Screen>
  );
}

export function OtpScreen({ state }: { state: "enter" | "resend" | "error" | "locked" }) {
  if (state === "locked") {
    return (
      <Screen tab="profile">
        <Title>Tạm khóa nhập mã</Title>
        <Body>Ba lần sai. Đợi 15 phút hoặc mang đồ tới quầy với tư cách khách. Khách vẫn được ghi nhận, không có điểm.</Body>
        <Button label="Mang đồ như khách" onPress={() => router.push("/intake/guest")} />
        <Button label="Nhập lại sau" tone="ghost" onPress={() => router.push("/otp/enter")} />
      </Screen>
    );
  }
  return (
    <Screen tab="profile">
      <Title>Nhập mã 6 số</Title>
      <Body muted>Mã gửi tới 0908 ••• 412. Khách mang đồ tại quầy không bắt buộc bước này.</Body>
      <TextInput
        keyboardType="number-pad"
        maxLength={6}
        placeholder="••••••"
        placeholderTextColor={colors.outline}
        style={{
          fontFamily: fonts.bold,
          fontSize: 32,
          letterSpacing: 8,
          textAlign: "center",
          color: colors.ink,
          backgroundColor: colors.card,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: state === "error" ? colors.error : colors.hairline,
          minHeight: 64,
        }}
      />
      {state === "error" ? <Text style={{ color: colors.error, fontFamily: fonts.medium }}>Mã không đúng. Còn 2 lần.</Text> : null}
      {state === "resend" ? <Body muted>Gửi lại sau 42 giây.</Body> : <Button label="Gửi lại mã" tone="ghost" onPress={() => router.push("/otp/resend")} />}
      <Button label="Xác nhận" onPress={() => router.replace("/profile/full")} />
      <Button label="Xem mã sai" tone="ghost" onPress={() => router.push("/otp/error")} />
      <Button label="Mã bị khóa" tone="ghost" onPress={() => router.push("/otp/locked")} />
    </Screen>
  );
}

export function QrScreen({ state }: { state: "scan" | "error" | "success" | "expired" | "checking" }) {
  if (state === "checking") {
    return (
      <Screen tab="stations">
        <Card>
          <ActivityIndicator color={colors.primary} />
          <Title>Đang kiểm tra vị trí</Title>
          <Body muted>Chưa vào ca khi chưa biết bạn có đứng trong 80 m của trạm hay không.</Body>
        </Card>
        <Button label="Trong phạm vi" onPress={() => router.replace("/qr/success")} />
        <Button label="Ngoài phạm vi" tone="ghost" onPress={() => router.push("/qr/error")} />
      </Screen>
    );
  }
  if (state === "expired") {
    return (
      <Screen tab="stations">
        <Title>Mã quầy đã đổi</Title>
        <Body>Mã này hết hạn lúc 13:40. Nhờ trưởng ca chiếu mã mới. Ca chưa được tính giờ.</Body>
        <Button label="Quét mã mới" onPress={() => router.push("/qr/scan")} />
      </Screen>
    );
  }
  if (state === "error") {
    return (
      <Screen tab="stations">
        <Title>Mã không dùng được</Title>
        <Body>Bạn đang ngoài bán kính 80 m của Trạm Đa Kao, hoặc mã không thuộc ca này.</Body>
        <Button label="Thử lại" onPress={() => router.push("/qr/scan")} />
      </Screen>
    );
  }
  if (state === "success") {
    return (
      <Screen tab="stations">
        <Title>Đã vào ca</Title>
        <Body>13:28 tại Trạm Đa Kao. Giờ bắt đầu tính. Điểm được cộng khi ca được chốt.</Body>
        <Button label="Về bảng ca" onPress={() => router.push("/volunteer/active")} />
      </Screen>
    );
  }
  return (
    <Screen tab="stations">
      <Card style={{ height: 240, alignItems: "center", justifyContent: "center", backgroundColor: colors.primary }}>
        <Text style={{ fontFamily: fonts.semibold, color: colors.onPrimary }}>Đưa mã quầy vào khung</Text>
      </Card>
      <Body muted>Bản xem thử chưa mở camera. Chọn một kết quả quét.</Body>
      <Button label="Quét thành công" onPress={() => router.push("/qr/success")} />
      <Button label="Mã ngoài phạm vi" tone="ghost" onPress={() => router.push("/qr/error")} />
      <Button label="Mã hết hạn" tone="ghost" onPress={() => router.push("/qr/expired")} />
      <Button label="Đang kiểm tra vị trí" tone="ghost" onPress={() => router.push("/qr/checking")} />
    </Screen>
  );
}

export function ReceiveScreen({ state }: { state: "form" | "error" | "success" | "stock" | "sending" }) {
  const [note, setNote] = useState(state === "error" ? "Cần đồ ấm" : "");
  const [picked, setPicked] = useState(state !== "error");
  if (state === "success") {
    return (
      <Screen tab="give">
        <Eyebrow>Hồ sơ #RCV-2025-0891</Eyebrow>
        <Title>Đã gửi phiếu nhận</Title>
        <Body>Trạm Đa Kao sẽ soạn đồ ấm và sách lớp 3. Bạn nhận mã PIN qua SMS. Danh tính không đăng công khai.</Body>
        <Body muted>Phiếu này là nhu cầu cá nhân tại trạm, tách khỏi đợt bàn giao cho đại diện vùng lũ.</Body>
        <Button label="Về trang chủ" onPress={() => router.push("/")} />
      </Screen>
    );
  }
  if (state === "stock") {
    return (
      <Screen tab="give">
        <Title>Đa Kao hết mì gói</Title>
        <Body>Đang giữ 0 thùng. Áo ấm còn 120 kg tại trạm này. Phiếu xin mì sẽ không được gửi.</Body>
        <Button label="Xin áo ấm" onPress={() => router.push("/receive/form")} />
        <Button label="Xem sổ trạm" tone="ghost" onPress={() => router.push("/ledger/content")} />
      </Screen>
    );
  }
  if (state === "sending") {
    return (
      <Screen tab="give">
        <Card>
          <ActivityIndicator color={colors.primary} />
          <Title>Đang gửi phiếu</Title>
          <Body muted>Chưa có mã hồ sơ khi trạm chưa nhận phiếu.</Body>
        </Card>
        <Button label="Xem khi đã gửi" onPress={() => router.replace("/receive/success")} />
      </Screen>
    );
  }
  const noteOk = note.trim().length >= 20;
  const valid = picked && noteOk;
  return (
    <Screen tab="give">
      <Title>Đăng ký nhận hỗ trợ</Title>
      <Body muted>Chọn đúng món trạm đang có. Không gửi phiếu nếu chưa chọn nhóm đồ và ghi chú còn quá ngắn.</Body>
      {!picked && state === "error" ? <Text style={{ color: colors.error, fontFamily: fonts.medium }}>Chưa chọn nhóm đồ.</Text> : null}
      <Button label={picked ? "Đã chọn: áo ấm" : "Chọn áo ấm"} tone={picked ? "primary" : "ghost"} onPress={() => setPicked(true)} />
      <TextInput
        value={note}
        onChangeText={setNote}
        placeholder="Hoàn cảnh và cỡ đồ, tối thiểu 20 ký tự"
        placeholderTextColor={colors.outline}
        multiline
        style={{
          minHeight: 96,
          backgroundColor: colors.card,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: state === "error" && !noteOk ? colors.error : colors.hairline,
          padding: 12,
          fontFamily: fonts.regular,
          fontSize: 15,
          color: colors.ink,
        }}
      />
      {state === "error" && !noteOk ? (
        <Text style={{ color: colors.error, fontFamily: fonts.medium }}>{note.trim().length}/20 ký tự</Text>
      ) : null}
      <Button
        label="Gửi phiếu"
        onPress={() => {
          if (!valid) router.push("/receive/error");
          else router.push("/receive/sending");
        }}
      />
    </Screen>
  );
}

export function FeedbackScreen({ mode = "form" }: { mode?: "form" | "sent" | "invalid" }) {
  const [score, setScore] = useState(0);
  if (mode === "sent") {
    return (
      <Screen tab="profile">
        <Title>Đã ghi nhận góp ý</Title>
        <Body>Quầy Đa Kao nhận góp ý cho biên lai #RC-2025-HG-0842. Điểm tín nhiệm không đổi vì góp ý.</Body>
        <Button label="Về hồ sơ" onPress={() => router.push("/profile/full")} />
      </Screen>
    );
  }
  if (mode === "invalid") {
    return (
      <Screen tab="profile">
        <Title>Chưa chọn mức điểm</Title>
        <Body>Chọn từ 1 đến 5 trước khi gửi. Góp ý chưa được ghi.</Body>
        <Button label="Chọn điểm" onPress={() => router.push("/feedback")} />
      </Screen>
    );
  }
  return (
    <Screen tab="profile">
      <Title>Quầy hôm nay thế nào?</Title>
      <Body muted>Góp ý cho lần tiếp nhận #RC-2025-HG-0842 tại Đa Kao.</Body>
      <View style={{ flexDirection: "row", gap: 8 }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Tap
            key={n}
            onPress={() => setScore(n)}
            accessibilityLabel={`${n} điểm`}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: score === n ? colors.primary : colors.card,
              borderWidth: 1,
              borderColor: score === n ? colors.primary : colors.hairline,
            }}
          >
            <Text style={{ fontFamily: fonts.bold, color: score === n ? colors.onPrimary : colors.primary }}>{n}</Text>
          </Tap>
        ))}
      </View>
      <Button
        label="Gửi góp ý"
        onPress={() => {
          if (score > 0) router.push("/feedback/sent");
          else router.push("/feedback/invalid");
        }}
      />
    </Screen>
  );
}

export function SettingsScreen({ mode = "ready" }: { mode?: "ready" | "off" | "save-error" }) {
  const [logout, setLogout] = useState(false);
  const noticesOn = mode !== "off";
  return (
    <Screen tab="profile">
      <Title>Cài đặt</Title>
      <Card>
        <Body>{noticesOn ? "Thông báo biên lai và ca trực: bật" : "Thông báo biên lai và ca trực: tắt"}</Body>
        <Body muted>Địa điểm: TP. Hồ Chí Minh</Body>
      </Card>
      {mode === "save-error" ? (
        <Card>
          <Title>Không lưu được cài đặt</Title>
          <Body>Máy này giữ lựa chọn cũ. Thử lại khi có mạng.</Body>
          <Button label="Thử lưu lại" onPress={() => router.replace("/settings")} />
        </Card>
      ) : null}
      <Button
        label={noticesOn ? "Tắt thông báo" : "Bật thông báo"}
        tone="ghost"
        onPress={() => router.push(noticesOn ? "/settings/off" : "/settings")}
      />
      <Button label="Lưu thất bại" tone="ghost" onPress={() => router.push("/settings/save-error")} />
      <Button label="Đăng xuất" tone="danger" onPress={() => setLogout(true)} />
      <Button label="Đủ trạng thái nghiệp vụ" tone="ghost" onPress={() => router.push("/atlas")} />
      <Eyebrow>Các trạng thái trong bộ màn</Eyebrow>
      {(
        [
          ["/home/loading", "Trang chủ đang tải"],
          ["/home/offline", "Mất mạng"],
          ["/home/empty", "Không có kết quả"],
          ["/intake/rejected", "Kiểm định từ chối"],
          ["/profile/low", "Điểm thấp"],
          ["/transfer/transit", "Đang vận chuyển"],
          ["/distribution/exception", "Lệch bàn giao"],
          ["/volunteer/revision", "Hồ sơ TNV cần sửa"],
          ["/qr/error", "QR lỗi"],
          ["/receive/error", "Phiếu nhận lỗi"],
        ] as const
      ).map(([href, label]) => (
        <Button key={href} label={label} tone="ghost" onPress={() => router.push(href)} />
      ))}
      {logout ? (
        <Card>
          <Title>Đăng xuất khỏi máy này?</Title>
          <Body muted>Biên lai đã ký vẫn nằm trên hệ thống trạm.</Body>
          <Button label="Ở lại" onPress={() => setLogout(false)} />
          <Button label="Đăng xuất" tone="danger" onPress={() => router.replace("/otp/enter")} />
        </Card>
      ) : null}
    </Screen>
  );
}

export function MenuScreen() {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: "rgba(7,36,26,0.45)", justifyContent: "flex-end", alignItems: "center" }}>
      <View style={{ width: "100%", maxWidth: 430, backgroundColor: colors.card, padding: 20, paddingBottom: insets.bottom + 20, gap: 10, borderTopLeftRadius: 20, borderTopRightRadius: 20 }}>
        <Title>Bạn muốn làm gì?</Title>
        <Button label="Mang đồ tới trạm" onPress={() => router.replace("/stations/map")} />
        <Button label="Đăng ký tình nguyện" tone="ghost" onPress={() => router.replace("/volunteer/form")} />
        <Button label="Vận hành máy chủ" tone="ghost" onPress={() => router.replace("/desk")} />
        <Button label="Xin nhận hỗ trợ" tone="ghost" onPress={() => router.replace("/receive/form")} />
        <Button label="Check-in ca" tone="ghost" onPress={() => router.replace("/qr/scan")} />
        <Button label="Đóng" tone="ghost" onPress={() => router.back()} />
      </View>
    </View>
  );
}
