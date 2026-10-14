import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, Text, TextInput, View } from "react-native";
import { backend } from "@/api/backend";
import { ApiError } from "@/api/client";
import { formatDay, itemName, itemUnit, orgName, statusLabel } from "@/api/labels";
import type { CampaignDetail, CampaignSummary } from "@/api/types";
import { Screen } from "@/components/chrome";
import { Body, Button, Card, Eyebrow, Icon, Meter, Photo, Pill, Tap, Title } from "@/components/ui";
import { colors, fonts, photos } from "@/theme";

const chips = ["Tất cả", "Áo ấm", "Sách vở", "Đồ gia dụng", "Y tế", "Đồ chơi"];

const urgent = [
  { title: "Áo len trẻ em", meta: "Size 4–10 tuổi, còn tốt", gap: "Thiếu 45 kg", photo: photos.child, href: "/campaign" as const },
  { title: "Balo và giày dép", meta: "Balo đi học, giày đi mưa", gap: "Thiếu 28 đôi", photo: photos.backpack, href: "/campaign" as const },
  { title: "Mì gói và lương khô", meta: "Đồ hộp, mì gói vùng lũ", gap: "Thiếu 60 thùng", photo: photos.noodles, href: "/campaign" as const },
  { title: "Thuốc và vật phẩm y tế", meta: "Bông băng, dầu gió", gap: "Thiếu 18 hộp", photo: photos.medicine, href: "/campaign" as const },
];

export function HomeScreen({ state = "content" }: { state?: "content" | "loading" | "offline" | "empty" | "results" | "none" }) {
  if (state === "loading") {
    return (
      <Screen tab="home">
        <Card>
          <ActivityIndicator color={colors.primary} />
          <Title>Đang tải chiến dịch</Title>
          <Body muted>Trạm Đa Kao đang đồng bộ nhu cầu và số đã nhận.</Body>
          <View style={{ height: 120, borderRadius: 12, backgroundColor: colors.surfaceContainer }} />
          <View style={{ height: 14, width: "70%", borderRadius: 8, backgroundColor: colors.surfaceContainer }} />
          <View style={{ height: 14, width: "45%", borderRadius: 8, backgroundColor: colors.surfaceContainer }} />
        </Card>
      </Screen>
    );
  }
  if (state === "offline") {
    return (
      <Screen tab="home">
        <Card>
          <Icon name="wifi-off" size={28} color={colors.secondary} />
          <Title>Mất kết nối</Title>
          <Body>Nhu cầu chiến dịch chưa tải được. Bản đã xem lần cuối vẫn nằm trên máy, số lượng có thể cũ.</Body>
          <Button label="Thử lại" onPress={() => router.replace("/")} />
          <Button label="Xem trạm đã lưu" tone="ghost" onPress={() => router.push("/stations/list")} />
        </Card>
      </Screen>
    );
  }
  if (state === "empty") {
    return (
      <Screen tab="home">
        <SearchField />
        <Card>
          <Icon name="search-off" size={28} color={colors.outline} />
          <Title>Không có nhu cầu khớp</Title>
          <Body muted>Thử bỏ bộ lọc, hoặc xem chiến dịch Hà Giang đang mở.</Body>
          <Button label="Xóa bộ lọc" tone="ghost" onPress={() => router.push("/")} />
        </Card>
      </Screen>
    );
  }
  if (state === "results") {
    return (
      <Screen tab="home">
        <SearchField />
        <Title>3 nhu cầu khớp</Title>
        <Body muted>Từ khóa nằm trong chiến dịch đang mở. Đơn vị mỗi dòng đã khóa.</Body>
        {urgent.slice(0, 3).map((item) => (
          <Tap key={item.title} onPress={() => router.push("/campaign")}>
            <Card>
              <Text style={{ fontFamily: fonts.semibold, fontSize: 16, color: colors.ink }}>{item.title}</Text>
              <Body muted>{item.meta}</Body>
              <Text style={{ fontFamily: fonts.bold, fontSize: 13, color: colors.secondary }}>{item.gap}</Text>
            </Card>
          </Tap>
        ))}
      </Screen>
    );
  }
  if (state === "none") {
    return (
      <Screen tab="home">
        <Title>Chưa có chiến dịch đang mở</Title>
        <Body>TP.HCM chưa có nhu cầu nào được phát hành. Khi hội mở chiến dịch, trang này hiện số đã nhận và tiêu chuẩn.</Body>
        <Button label="Xem bản nháp nội bộ" onPress={() => router.push("/board/draft")} />
      </Screen>
    );
  }
  return (
    <Screen tab="home">
      <SearchField />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {chips.map((chip, index) => (
          <Pill
            key={chip}
            label={chip}
            active={index === 0}
            onPress={() => router.push(index === 0 ? "/" : "/home/empty")}
          />
        ))}
      </ScrollView>
      <View style={{ flexDirection: "row", gap: 10, alignItems: "stretch" }}>
        <Card style={{ flex: 1, backgroundColor: colors.primary, justifyContent: "space-between" }}>
          <Text style={{ fontFamily: fonts.semibold, color: colors.onPrimary, fontSize: 13 }}>Bạn có đồ dư?</Text>
          <Text style={{ fontFamily: fonts.bold, color: colors.onPrimary, fontSize: 18, lineHeight: 24 }}>Pass đồ trao gửi</Text>
          <Text style={{ fontFamily: fonts.regular, color: "#d5e4dc", fontSize: 12, lineHeight: 18 }}>
            Xem nhu cầu và mang tới trạm. Không cần khai báo trước.
          </Text>
          <Button label="Xem nhu cầu" tone="coral" onPress={() => router.push("/campaign")} />
        </Card>
        <Card style={{ flex: 1, justifyContent: "space-between" }}>
          <Text style={{ fontFamily: fonts.semibold, color: colors.secondary, fontSize: 13 }}>Đồng hành</Text>
          <Text style={{ fontFamily: fonts.bold, color: colors.ink, fontSize: 18 }}>Tham gia TNV</Text>
          <Body muted>Phân loại, đóng gói, vận chuyển.</Body>
          <Button label="Đăng ký TNV" tone="ghost" onPress={() => router.push("/volunteer/form")} />
        </Card>
      </View>
      <Body muted>Mọi kiện được kiểm định tại trạm trước khi ghi nhận và trao đi.</Body>
      <FeaturedCampaigns />
      <Button label="Chưa có chiến dịch đang mở" tone="ghost" onPress={() => router.push("/home/none")} />
    </Screen>
  );
}

export function SearchScreen({ mode = "ready" }: { mode?: "ready" | "loading" | "error" }) {
  const params = useLocalSearchParams<{ q?: string }>();
  const query = typeof params.q === "string" ? params.q : "";
  const [found, setFound] = useState<CampaignSummary[] | null>(null);
  const [problem, setProblem] = useState("");

  useEffect(() => {
    if (!query) {
      setFound(null);
      setProblem("");
      return;
    }
    let cancelled = false;
    backend.listCampaigns({ search: query })
      .then((data) => {
        if (!cancelled) setFound(data.campaigns);
      })
      .catch((caught) => {
        if (!cancelled) setProblem(caught instanceof ApiError ? caught.message : "Không tìm được.");
      });
    return () => {
      cancelled = true;
    };
  }, [query]);
  if (mode === "loading") {
    return (
      <Screen tab="home">
        <Card>
          <ActivityIndicator color={colors.primary} />
          <Title>Đang tìm nhu cầu</Title>
          <Body muted>Chưa kết luận là không có kết quả khi tìm chưa xong.</Body>
        </Card>
        <Button label="Xem kết quả" onPress={() => router.replace("/home/results")} />
      </Screen>
    );
  }
  if (mode === "error") {
    return (
      <Screen tab="home">
        <Title>Không tìm được</Title>
        <Body>Máy tìm kiếm chưa trả lời. Trang chủ vẫn mở nếu đã tải lần trước.</Body>
        <Button label="Thử lại" onPress={() => router.replace("/search")} />
      </Screen>
    );
  }
  return (
    <Screen tab="home">
      <SearchField autoFocus />
      <Body muted>Gõ xyz để xem trạng thái không có kết quả. Từ khóa khác gửi lên GET /campaigns.</Body>
      {problem ? <Body>{problem}</Body> : null}
      {found?.map((campaign) => (
        <Tap key={campaign._id} onPress={() => router.push(`/campaign?id=${campaign._id}`)}>
          <Card>
            <Text style={{ fontFamily: fonts.semibold, fontSize: 16, color: colors.ink }}>{campaign.title}</Text>
            <Body muted>{`${statusLabel(campaign.status)} · ${orgName(campaign.organizationId)}`}</Body>
          </Card>
        </Tap>
      ))}
      {found && found.length === 0 ? <Body>Không có chiến dịch khớp từ khóa này.</Body> : null}
      {urgent.slice(0, 2).map((item) => (
        <Tap key={item.title} onPress={() => router.push("/campaign")}>
          <Card>
            <Text style={{ fontFamily: fonts.semibold, fontSize: 16, color: colors.ink }}>{item.title}</Text>
            <Body muted>{item.meta}</Body>
          </Card>
        </Tap>
      ))}
      <Button label="Không có kết quả" tone="ghost" onPress={() => router.push("/home/empty")} />
      <Button label="Đang tìm" tone="ghost" onPress={() => router.push("/search/loading")} />
      <Button label="Tìm bị lỗi" tone="ghost" onPress={() => router.push("/search/error")} />
    </Screen>
  );
}

function SearchField({ autoFocus }: { autoFocus?: boolean }) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        backgroundColor: colors.card,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.hairline,
        paddingHorizontal: 12,
        minHeight: 46,
      }}
    >
      <Icon name="search" size={20} color={colors.outline} />
      <TextInput
        placeholder="Tìm chiến dịch, vật phẩm, trạm"
        placeholderTextColor={colors.outline}
        autoFocus={autoFocus}
        onSubmitEditing={(event) => {
          const query = event.nativeEvent.text.trim();
          if (!query) return;
          if (query.toLowerCase() === "xyz") router.push("/home/empty");
          else router.push(`/search?q=${encodeURIComponent(query)}`);
        }}
        style={{ flex: 1, fontFamily: fonts.regular, fontSize: 15, color: colors.ink, paddingVertical: 10 }}
      />
      <Tap onPress={() => router.push("/home/empty")} accessibilityLabel="Bộ lọc">
        <Icon name="tune" size={20} color={colors.primary} />
      </Tap>
    </View>
  );
}

export function CampaignScreen({ mode = "content" }: { mode?: "content" | "loading" | "error" | "empty" }) {
  if (mode === "loading") {
    return (
      <Screen tab="give">
        <Card>
          <ActivityIndicator color={colors.primary} />
          <Title>Đang mở chiến dịch</Title>
          <Body muted>Chưa hiện 340 kg khi số chưa về.</Body>
        </Card>
        <Button label="Xem chiến dịch đã tải" onPress={() => router.replace("/campaign")} />
      </Screen>
    );
  }
  if (mode === "error") {
    return (
      <Screen tab="give">
        <Title>Không mở được chiến dịch</Title>
        <Body>Tiêu chuẩn nhận và số đã nhận chưa hiện. Đừng mang đồ theo số nhớ.</Body>
        <Button label="Thử lại" onPress={() => router.replace("/campaign")} />
      </Screen>
    );
  }
  if (mode === "empty") {
    return (
      <Screen tab="give">
        <Title>Chiến dịch này chưa mở nhận</Title>
        <Body>Chưa có tiêu chuẩn và chưa có trạm nhận. Xem bản nháp hoặc đợi hội phát hành.</Body>
        <Button label="Xem bản nháp" onPress={() => router.push("/board/draft")} />
      </Screen>
    );
  }
  return (
    <Screen tab="give">
      <CampaignLive />
      <Button label="Tôi sẽ mang đồ tới trạm" onPress={() => router.push("/stations/map")} />
      <Button label="Sổ đã nhận, đang giữ, đã giao" tone="ghost" onPress={() => router.push("/ledger/content")} />
      <Button label="Trạng thái chiến dịch" tone="ghost" onPress={() => router.push("/board/active")} />
      <Button label="Xem kiểm định tại quầy" tone="ghost" onPress={() => router.push("/intake/review")} />
      <Button label="Chiến dịch chưa tải được" tone="ghost" onPress={() => router.push("/campaign/error")} />
      <Button label="Chiến dịch chưa mở nhận" tone="ghost" onPress={() => router.push("/campaign/empty")} />
    </Screen>
  );
}

function FeaturedCampaigns() {
  const [campaigns, setCampaigns] = useState<CampaignSummary[] | null>(null);
  const [problem, setProblem] = useState("");

  useEffect(() => {
    let cancelled = false;
    backend.listCampaigns()
      .then((data) => {
        if (!cancelled) setCampaigns(data.campaigns);
      })
      .catch((caught) => {
        if (!cancelled) setProblem(caught instanceof ApiError ? caught.message : "Không tải được chiến dịch.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!campaigns && !problem) {
    return (
      <Card>
        <ActivityIndicator color={colors.primary} />
        <Title>Đang tải chiến dịch</Title>
        <Body muted>Chưa hiện số minh họa khi máy chủ chưa trả lời.</Body>
      </Card>
    );
  }

  if (problem || !campaigns) {
    return (
      <Card>
        <Title>Chưa đọc được chiến dịch từ máy chủ</Title>
        <Body>{problem || "Máy chủ không trả danh sách."}</Body>
        <Body muted>Bản minh họa Áo ấm Hà Giang vẫn mở ở mục Tặng đồ khi bạn cần xem bố cục.</Body>
        <Button label="Mở màn minh họa" tone="ghost" onPress={() => router.push("/campaign")} />
      </Card>
    );
  }

  if (campaigns.length === 0) {
    return (
      <Card>
        <Title>Chưa có chiến dịch đang mở</Title>
        <Body>Máy chủ không có chiến dịch đã phát hành. Bản nháp không hiện trên trang này.</Body>
      </Card>
    );
  }

  return (
    <View style={{ gap: 14 }}>
      <Eyebrow>Chiến dịch từ máy chủ</Eyebrow>
      {campaigns.map((campaign) => (
        <Tap key={campaign._id} onPress={() => router.push(`/campaign?id=${campaign._id}`)}>
          <Card>
            <Eyebrow>{`${statusLabel(campaign.status)} · ${formatDay(campaign.startDate)} đến ${formatDay(campaign.endDate)}`}</Eyebrow>
            <Title>{campaign.title}</Title>
            <Body muted>{orgName(campaign.organizationId)}</Body>
            {campaign.description ? <Body>{campaign.description}</Body> : null}
          </Card>
        </Tap>
      ))}
    </View>
  );
}

function CampaignLive() {
  const params = useLocalSearchParams<{ id?: string }>();
  const requestedId = typeof params.id === "string" ? params.id : "";
  const [detail, setDetail] = useState<CampaignDetail | null>(null);
  const [problem, setProblem] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        let id = requestedId;
        if (!id) {
          const list = await backend.listCampaigns();
          id = list.campaigns[0]?._id ?? "";
        }
        if (!id) {
          if (!cancelled) setProblem("Chưa có chiến dịch đã phát hành.");
          return;
        }
        const next = await backend.getCampaign(id);
        try {
          const stationList = await backend.campaignStations(id);
          next.stations = stationList.stations;
        } catch {
          // Chi tiết chiến dịch đã kèm trạm. Route riêng lỗi thì vẫn hiện chi tiết.
        }
        if (!cancelled) setDetail(next);
      } catch (caught) {
        if (!cancelled) setProblem(caught instanceof ApiError ? caught.message : "Không mở được chiến dịch.");
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [requestedId]);

  if (!detail && !problem) {
    return (
      <Card>
        <ActivityIndicator color={colors.primary} />
        <Title>Đang mở chiến dịch</Title>
        <Body muted>Số lượng chỉ hiện sau khi máy chủ trả về.</Body>
      </Card>
    );
  }

  if (problem || !detail) {
    return (
      <Card>
        <Title>Không mở được chiến dịch trên máy chủ</Title>
        <Body>{problem || "Không có dữ liệu."}</Body>
        <Body muted>Sổ ba cột và số 340 kg là bản minh họa, bấm các nút bên dưới.</Body>
      </Card>
    );
  }

  const { campaign, items, stations } = detail;
  return (
    <View style={{ gap: 14 }}>
      <Photo uri={photos.coats} height={210} radius={18} />
      <Eyebrow>{`${statusLabel(campaign.status)} · ${orgName(campaign.organizationId)}`}</Eyebrow>
      <Title>{campaign.title}</Title>
      <Body>{campaign.description || "Mang đồ tới trạm. Nhân viên cân và quyết định phần được nhận."}</Body>
      <Body muted>{`${formatDay(campaign.startDate)} đến ${formatDay(campaign.endDate)}`}</Body>
      {items.length === 0 ? <Body>Chiến dịch chưa khai báo loại đồ.</Body> : null}
      {items.map((item) => {
        const current = Number(item.currentQuantity) || 0;
        const target = Number(item.targetQuantity) || 0;
        const unit = itemUnit(item);
        return (
          <Card key={item._id}>
            <Eyebrow>{itemName(item)}</Eyebrow>
            <Meter
              value={current}
              max={Math.max(target, current, 1)}
              unit={unit}
              label={`Đã ghi nhận ${current} ${unit}. Mục tiêu ${target} ${unit}. Máy chủ đang lưu một cột số lượng.`}
            />
          </Card>
        );
      })}
      <Card>
        <Eyebrow>Trạm tham gia</Eyebrow>
        {stations.filter((station) => station && station.name).length === 0 ? <Body>Chưa gán trạm.</Body> : null}
        {stations.map((station, index) =>
          station?.name ? (
            <Body key={station._id ?? `${station.name}-${index}`}>{`${station.name}. ${station.address ?? ""}`}</Body>
          ) : null,
        )}
        <Button label="Xem danh sách trạm" tone="ghost" onPress={() => router.push("/stations/list")} />
      </Card>
    </View>
  );
}
