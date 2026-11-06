import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Platform, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { backend } from "@/api/backend";
import { ApiError } from "@/api/client";
import { useGuest } from "@/api/guest";
import { isOperator, useSession } from "@/api/session";
import { StationMap } from "@/components/station-map";
import { campaignPhase, donorLabel, formatDay } from "@/api/labels";
import type { CampaignSummary, StationRow } from "@/api/types";
import { Screen } from "@/components/chrome";
import { PasswordReset } from "@/components/form";
import { Badge, Body, Button, Card, Eyebrow, Icon, Pill, StatRow, Tap, Title } from "@/components/ui";
import { colors, fonts } from "@/theme";

const LiveQr = Platform.OS === "web" ? null : (require("./qr-camera") as typeof import("./qr-camera")).LiveQr;

const stations = [
  { name: "Trạm Đa Kao", address: "45 Mạc Đĩnh Chi, Quận 1", hours: "08:00–18:30", km: "1,2 km", load: "Đang nhận" },
  { name: "Trạm Phú Mỹ Hưng", address: "Nguyễn Lương Bằng, Quận 7", hours: "08:30–20:00", km: "6,4 km", load: "Còn chỗ" },
  { name: "Trạm Bình Thạnh", address: "125 Bạch Đằng, Bình Thạnh", hours: "08:30–20:00", km: "2,4 km", load: "Gần đầy" },
];

function StationCards({
  rows,
  problem,
  filtered,
}: {
  rows: StationRow[] | null;
  problem: string;
  filtered: boolean;
}) {
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
        <Title>{filtered ? "Chiến dịch chưa gán trạm" : "Chưa có trạm đang mở"}</Title>
        <Body>{filtered ? "Chiến dịch này chưa có trạm đang mở để nhận đồ." : "Tài khoản này không thấy trạm đã kích hoạt."}</Body>
      </Card>
    );
  }

  return (
    <View style={{ gap: 14 }}>
      <StatRow
        items={[
          { label: "Trạm đang mở", value: rows.filter((row) => row.isActive).length, unit: "trạm", tone: "primary" },
          { label: "Tổng cộng", value: rows.length, unit: "trạm", tone: "ink" },
        ]}
      />
      {rows.map((station) => (
        <Card key={station._id}>
          <Badge label={station.isActive ? "Đang mở" : "Chưa kích hoạt"} tone={station.isActive ? "primary" : "neutral"} />
          <Text style={{ fontFamily: fonts.bold, fontSize: 17, color: colors.ink }}>{station.name}</Text>
          <Body muted>{station.address}</Body>
          <Button label="Xem chi tiết" tone="ghost" onPress={() => router.push(`/station/${station._id}`)} />
        </Card>
      ))}
    </View>
  );
}

function stationPath(mode: "list" | "map", campaign: string) {
  return campaign ? `/stations/${mode}?campaign=${encodeURIComponent(campaign)}` : `/stations/${mode}`;
}
function useOpenCampaigns() {
  const [rows, setRows] = useState<CampaignSummary[]>([]);
  useEffect(() => {
    let cancelled = false;
    backend.listCampaigns()
      .then((data) => {
        if (!cancelled) setRows(data.campaigns.filter((campaign) => campaignPhase(campaign) !== "closed"));
      })
      .catch(() => {
        if (!cancelled) setRows([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return rows;
}

function useStationRows(campaignId: string) {
  const { token } = useSession();
  const [rows, setRows] = useState<StationRow[] | null>(null);
  const [problem, setProblem] = useState("");
  const [needsLogin, setNeedsLogin] = useState(false);
  useEffect(() => {
    let cancelled = false;
    setRows(null);
    setProblem("");
    setNeedsLogin(false);
    async function load() {
      try {
        if (campaignId) {
          const data = await backend.campaignStations(campaignId);
          if (cancelled) return;
          setRows(data.stations.flatMap((station) => {
            if (!station._id || !station.name) return [];
            return [{
              _id: station._id,
              name: station.name,
              address: station.address ?? "",
              isActive: station.isActive !== false,
              latitude: station.latitude,
              longitude: station.longitude,
            }];
          }));
          return;
        }
        if (!token) {
          setNeedsLogin(true);
          return;
        }
        const data = await backend.listStations(token);
        if (!cancelled) {
          setRows(data.data.map((station) => ({
            ...station,
            address: station.address || "",
            isActive: station.isActive !== false,
          })));
        }
      } catch (caught) {
        if (!cancelled) setProblem(caught instanceof ApiError ? caught.message : "Không tải được trạm.");
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [campaignId, token]);
  return { rows, problem, needsLogin };
}
function GuestStations() {
  return (
    <View style={{ gap: 14 }}>
      <Body muted>Đăng nhập để xem trạm thật. Danh sách dưới chỉ là ví dụ.</Body>
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

function StationChrome({
  mode,
  campaignId,
  campaignTitle,
  filterOpen,
  onToggle,
  campaigns,
}: {
  mode: "list" | "map";
  campaignId: string;
  campaignTitle: string;
  filterOpen: boolean;
  onToggle: () => void;
  campaigns: CampaignSummary[];
}) {
  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Pill label="Danh sách" active={mode === "list"} onPress={() => router.push(stationPath("list", campaignId))} />
        <Pill label="Bản đồ" active={mode === "map"} onPress={() => router.push(stationPath("map", campaignId))} />
        <View style={{ flex: 1 }} />
        <Tap onPress={onToggle} accessibilityLabel={campaignId ? "Bộ lọc, đang áp dụng 1" : "Bộ lọc"} style={{ alignItems: "center", minWidth: 44 }}>
          <Icon name="tune" size={22} color={campaignId ? colors.primary : colors.ink} />
          {campaignId ? <Text style={{ fontFamily: fonts.bold, fontSize: 12, color: colors.primary }}>1</Text> : null}
        </Tap>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 8 }}>
        <Pill label="Tất cả trạm" active={!campaignId} onPress={() => router.replace(stationPath(mode, ""))} />
        {campaigns.map((campaign) => (
          <Pill
            key={campaign._id}
            label={campaign.title}
            active={campaign._id === campaignId}
            onPress={() => router.replace(stationPath(mode, campaign._id))}
          />
        ))}
      </ScrollView>
      {campaignId ? <Body muted>{campaignTitle ? `Đang xem trạm của ${campaignTitle}.` : "Đang xem trạm của một chiến dịch."}</Body> : null}
      {filterOpen ? (
        <View style={{ gap: 8 }}>
          {campaigns.length === 0 ? <Body muted>Chưa có chiến dịch đang nhận đồ hoặc sắp mở.</Body> : null}
          {campaigns.map((campaign) => {
            const selected = campaign._id === campaignId;
            return (
              <Tap key={campaign._id} onPress={() => router.replace(stationPath(mode, campaign._id))} accessibilityLabel={campaign.title}>
                <Card style={selected ? { borderColor: colors.primary, backgroundColor: colors.primarySoft } : undefined}>
                  <Text style={{ fontFamily: fonts.semibold, fontSize: 13, color: campaignPhase(campaign) === "open" ? colors.primary : colors.secondary }}>
                    {donorLabel(campaign)}
                  </Text>
                  <Text style={{ fontFamily: fonts.bold, fontSize: 16, color: colors.ink }}>{campaign.title}</Text>
                  <Body muted>{`${formatDay(campaign.startDate)} đến ${formatDay(campaign.endDate)}`}</Body>
                </Card>
              </Tap>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

export function StationsScreen({
  state,
}: {
  state: "list" | "map" | "overload" | "closed" | "loading" | "error";
}) {
  const { user } = useSession();
  const [mapInteracting, setMapInteracting] = useState(false);
  const params = useLocalSearchParams<{ campaign?: string }>();
  const campaignId = typeof params.campaign === "string" ? params.campaign : "";
  const [filterOpen, setFilterOpen] = useState(false);
  const openCampaigns = useOpenCampaigns();
  const loaded = useStationRows(state === "list" || state === "map" ? campaignId : "");
  const selectedCampaign = openCampaigns.find((campaign) => campaign._id === campaignId);
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
      <Screen tab="stations" scrollEnabled={!mapInteracting}>
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
    <Screen tab="stations" scrollEnabled={!mapInteracting}>
      <StationChrome
        mode={state === "map" ? "map" : "list"}
        campaignId={campaignId}
        campaignTitle={selectedCampaign?.title ?? ""}
        filterOpen={filterOpen}
        onToggle={() => setFilterOpen((open) => !open)}
        campaigns={openCampaigns}
      />
      {user?.role === "USER" ? <Body>Khi tới trạm, đọc số điện thoại, email hoặc username cho nhân viên. Nhân viên lập phiếu giúp bạn.</Body> : null}
      {state === "map" ? (
        loaded.needsLogin
          ? <Card><Title>Đăng nhập để xem vị trí trạm</Title><Body>Danh sách ví dụ không có vị trí thật để hiển thị trên bản đồ.</Body><Button label="Đăng nhập" onPress={() => router.push("/login")} /></Card>
          : <StationMap rows={loaded.rows} problem={loaded.problem} onInteractionChange={setMapInteracting} />
      ) : loaded.needsLogin ? <GuestStations /> : <StationCards rows={loaded.rows} problem={loaded.problem} filtered={Boolean(campaignId)} />}
      {user?.role === "STATION_MANAGER" || user?.role === "STAFF" ? <Button label="Tiếp nhận đồ" onPress={() => router.push("/desk/intake")} /> : null}
      {user?.role === "STATION_MANAGER" || user?.role === "ORG_MANAGER" || user?.role === "STAFF" ? <Button label="Ca trực hôm nay" tone="ghost" onPress={() => router.push("/shifts")} /> : null}
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
        <Body>Máy chủ không khóa sau ba lần sai. Mã hết hạn sau 10 phút. Gửi email mới để lấy mã khác.</Body>
        <Button label="Mang đồ như khách" onPress={() => router.push("/intake/guest")} />
        <Button label="Nhập lại sau" tone="ghost" onPress={() => router.push("/otp/enter")} />
      </Screen>
    );
  }
  return (
    <Screen tab="profile">
      <PasswordReset />
      {state === "error" ? <Body>Mã sai hoặc đã hết hạn. Gửi lại email để lấy mã mới.</Body> : null}
      {state === "resend" ? <Body muted>Bấm Gửi mã ở form trên. Máy chủ không đếm 42 giây.</Body> : null}
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
      {LiveQr ? <LiveQr /> : <Body>Camera quét mã mở trên điện thoại. Máy chủ chưa nhận mã này.</Body>}
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
        <Body muted>Máy chủ chưa có phiếu xin nhận của người dân. Giao hàng cứu trợ nằm ở màn phân phối.</Body>
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
  const { logout } = useSession();
  const { leaveGuest } = useGuest();
  const [confirming, setConfirming] = useState(false);
  return (
    <Screen tab="profile">
      <Title>Cài đặt</Title>
      <Body muted>Đăng xuất xóa phiên trên máy này. Phiếu và điểm vẫn nằm trên máy chủ.</Body>
      {mode === "save-error" ? <Body>Máy chủ không có mục cài đặt thông báo để lưu.</Body> : null}
      <Button label="Đăng xuất" tone="danger" onPress={() => setConfirming(true)} />
      {confirming ? (
        <Card>
          <Title>Đăng xuất khỏi máy này?</Title>
          <Button label="Ở lại" onPress={() => setConfirming(false)} />
          <Button
            label="Đăng xuất"
            tone="danger"
            onPress={() => {
              leaveGuest();
              void logout().then(() => router.replace("/login"));
            }}
          />
        </Card>
      ) : null}
    </Screen>
  );
}

export function MenuScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useSession();
  return (
    <View style={{ flex: 1, backgroundColor: "rgba(7,36,26,0.45)", justifyContent: "flex-end", alignItems: "center" }}>
      <View style={{ width: "100%", maxWidth: 430, backgroundColor: colors.card, padding: 20, paddingBottom: insets.bottom + 20, gap: 10, borderTopLeftRadius: 20, borderTopRightRadius: 20 }}>
        <Title>Bạn muốn làm gì?</Title>
        <Button label="Mang đồ tới trạm" onPress={() => router.replace("/stations/list")} />
        <Button label="Việc tình nguyện" tone="ghost" onPress={() => router.replace("/volunteer/tasks")} />
        {user?.role === "STATION_MANAGER" || user?.role === "ORG_MANAGER" || user?.role === "STAFF" ? <Button label="Ca trực" tone="ghost" onPress={() => router.replace("/shifts")} /> : null}
        {isOperator(user?.role) ? <Button label="Vận hành" tone="ghost" onPress={() => router.replace("/desk")} /> : null}
        <Button label="Đóng" tone="ghost" onPress={() => router.back()} />
      </View>
    </View>
  );
}
