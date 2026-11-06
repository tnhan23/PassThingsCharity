import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, Text, TextInput, View } from "react-native";
import * as Location from "expo-location";
import { backend } from "@/api/backend";
import { ApiError } from "@/api/client";
import { campaignPhase, donorLabel, formatDay, itemName, itemUnit, orgName } from "@/api/labels";
import type { CampaignDetail, CampaignSummary } from "@/api/types";
import { Screen } from "@/components/chrome";
import { Badge, Body, Button, Card, Eyebrow, Icon, Meter, Photo, Pill, StatRow, Tap, Title } from "@/components/ui";
import { colors, fonts, photos } from "@/theme";

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
      <Button label="Quản lý trạm (tạm thời)" tone="ghost" onPress={() => router.push("/desk/stations")} />
      <Button label="Tiếp nhận (tạm thời)" tone="ghost" onPress={() => router.push("/desk/intake")} />
      <Button label="Nhân sự (tạm thời)" tone="ghost" onPress={() => router.push("/routes/workforce")} />
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
          <Body muted>Phân loại, đóng gói, vận chuyển tại trạm.</Body>
          <Button label="Việc đang tuyển" tone="ghost" onPress={() => router.push("/jobs")} />
        </Card>
      </View>
      <View style={{ flexDirection: "row", gap: 8 }}>
        {[
          { label: "Trạm gần bạn", icon: "place" as const, href: "/stations/map" as const },
          { label: "Việc tại trạm", icon: "volunteer-activism" as const, href: "/jobs" as const },
          { label: "Hồ sơ & Điểm", icon: "card-membership" as const, href: "/profile/full" as const },
        ].map((shortcut) => (
          <Tap
            key={shortcut.label}
            onPress={() => router.push(shortcut.href)}
            style={{
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              minHeight: 42,
              paddingHorizontal: 10,
              paddingVertical: 10,
              borderRadius: 12,
              backgroundColor: colors.card,
              borderWidth: 1,
              borderColor: colors.hairline,
            }}
          >
            <Icon name={shortcut.icon} size={16} color={colors.primary} />
            <Text style={{ fontFamily: fonts.semibold, fontSize: 12, color: colors.ink }} numberOfLines={1}>
              {shortcut.label}
            </Text>
          </Tap>
        ))}
      </View>
      <FeaturedCampaigns />
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
        if (!cancelled) setFound(data.campaigns.filter((campaign) => !campaign.title.startsWith("[Mẫu]")));
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
            <Body muted>{`${donorLabel(campaign)} · ${orgName(campaign.organizationId)}`}</Body>
          </Card>
        </Tap>
      ))}
      {found && found.length === 0 ? <Body>Không có chiến dịch khớp từ khóa này.</Body> : null}
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
    </Screen>
  );
}

function FeaturedCampaigns() {
  const [campaigns, setCampaigns] = useState<CampaignSummary[] | null>(null);
  const [problem, setProblem] = useState("");
  const [phase, setPhase] = useState<"open" | "soon" | "closed">("open");

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
      </Card>
    );
  }

  const listed = campaigns.filter((campaign) => !campaign.title.startsWith("[Mẫu]"));
  const counts = {
    open: listed.filter((campaign) => campaignPhase(campaign) === "open").length,
    soon: listed.filter((campaign) => campaignPhase(campaign) === "soon").length,
    closed: listed.filter((campaign) => campaignPhase(campaign) === "closed").length,
  };
  const visible = listed.filter((campaign) => campaignPhase(campaign) === phase);
  const emptyCopy = {
    open: "Chưa có chiến dịch nào máy chủ đang để ở trạng thái nhận đồ.",
    soon: "Chưa có chiến dịch đã phát hành nhưng chưa tới ngày bắt đầu.",
    closed: "Chưa có chiến dịch đã kết thúc hoặc đã hủy.",
  }[phase];

  return (
    <View style={{ gap: 14 }}>
      <Title>{phase === "open" ? "Chiến dịch đang diễn ra" : phase === "soon" ? "Sắp mở" : "Đã kết thúc"}</Title>
      <StatRow
        items={[
          { label: "Đang nhận", value: counts.open, unit: "đợt", tone: "primary" },
          { label: "Sắp mở", value: counts.soon, unit: "đợt", tone: "coral" },
          { label: "Đã kết thúc", value: counts.closed, unit: "đợt", tone: "ink" },
        ]}
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        <Pill label={`Đang nhận (${counts.open})`} active={phase === "open"} onPress={() => setPhase("open")} />
        <Pill label={`Sắp mở (${counts.soon})`} active={phase === "soon"} onPress={() => setPhase("soon")} />
        <Pill label={`Đã xong (${counts.closed})`} active={phase === "closed"} onPress={() => setPhase("closed")} />
      </ScrollView>
      {visible.length === 0 ? (
        <Card>
          <Title>Không có chiến dịch ở mục này</Title>
          <Body>{emptyCopy}</Body>
        </Card>
      ) : null}
      {visible.map((campaign) => {
        const currentPhase = campaignPhase(campaign);
        return (
          <Tap
            key={campaign._id}
            onPress={() => {
              router.navigate(`/campaign?id=${campaign._id}`);
            }}
          >
            <Card>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                <Badge
                  label={donorLabel(campaign)}
                  tone={currentPhase === "open" ? "primary" : currentPhase === "soon" ? "warning" : "neutral"}
                />
                <Text style={{ fontFamily: fonts.medium, fontSize: 12, color: colors.muted, fontVariant: ["tabular-nums"] }}>
                  {`${formatDay(campaign.startDate)} – ${formatDay(campaign.endDate)}`}
                </Text>
              </View>
              <Title>{campaign.title}</Title>
              <Body muted>{orgName(campaign.organizationId)}</Body>
              {campaign.progress && campaign.progress.totalItemTypes > 0 ? (
                <Meter
                  value={campaign.progress.fulfilledItemTypes}
                  max={campaign.progress.totalItemTypes}
                  unit="loại"
                  label={`Đã đủ ${campaign.progress.fulfilledItemTypes} trên ${campaign.progress.totalItemTypes} loại đồ cần nhận.`}
                />
              ) : null}
              {campaign.description ? <Body numberOfLines={2}>{campaign.description}</Body> : null}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingTop: 8,
                  borderTopWidth: 1,
                  borderTopColor: colors.hairline,
                }}
              >
                <Text style={{ fontFamily: fonts.semibold, fontSize: 13, color: colors.primary }}>
                  Xem chi tiết & trạm tiếp nhận
                </Text>
                <Icon name="chevron-right" size={18} color={colors.primary} />
              </View>
            </Card>
          </Tap>
        );
      })}
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
          id = list.campaigns.find((campaign) => campaignPhase(campaign) === "open")?._id
            ?? list.campaigns.find((campaign) => campaignPhase(campaign) === "soon")?._id
            ?? "";
        }
        if (!id) {
          if (!cancelled) setProblem("Chưa có chiến dịch đang nhận đồ.");
          return;
        }
        const next = await backend.getCampaign(id);
        if (!cancelled) setDetail(next);
        let stationRequest = 0;
        const loadStations = async (coords?: { userLat: string; userLng: string }) => {
          const request = ++stationRequest;
          try {
            const stationList = await backend.campaignStations(id, coords);
            if (!cancelled && request === stationRequest) {
              setDetail((current) => current ? { ...current, stations: stationList.stations } : current);
            }
          } catch {
            // The campaign detail remains available if the optional station request fails.
          }
        };
        void loadStations();
        try {
          const permission = await Location.requestForegroundPermissionsAsync();
          if (cancelled) return;
          if (!permission.granted) return;
          const cachedPosition = await Location.getLastKnownPositionAsync();
          if (cancelled) return;
          if (cachedPosition) {
            void loadStations({
              userLat: String(cachedPosition.coords.latitude),
              userLng: String(cachedPosition.coords.longitude),
            });
            return;
          }

          let timeout: ReturnType<typeof setTimeout> | undefined;
          try {
            const position = await Promise.race([
              Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
              new Promise<never>((_, reject) => {
                timeout = setTimeout(() => reject(new Error("Location request timed out.")), 8000);
              }),
            ]);
            if (!cancelled) {
              void loadStations({
                userLat: String(position.coords.latitude),
                userLng: String(position.coords.longitude),
              });
            }
          } catch {
            // Stations without distance are already being loaded.
          } finally {
            if (timeout) clearTimeout(timeout);
          }
        } catch {
          // Location is optional; stations without distance are already being loaded.
        }
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
      </Card>
    );
  }

  const { campaign, items, stations } = detail;
  const phase = campaignPhase(campaign);
  const open = phase === "open";
  const mapHref = `/stations/map?campaign=${campaign._id}`;
  const validStations = stations.filter((station) => station && station.name);
  const fulfilledCount = items.filter((item) => {
    const current = Number(item.currentQuantity) || 0;
    const target = Number(item.targetQuantity) || 0;
    return target > 0 && current >= target;
  }).length;

  return (
    <View style={{ gap: 14 }}>
      <Photo uri={photos.coats} height={210} radius={18} />
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
        <Badge
          label={donorLabel(campaign)}
          tone={open ? "primary" : phase === "soon" ? "warning" : "neutral"}
        />
        <Text style={{ fontFamily: fonts.medium, fontSize: 12, color: colors.muted, fontVariant: ["tabular-nums"] }}>
          {`${formatDay(campaign.startDate)} – ${formatDay(campaign.endDate)}`}
        </Text>
      </View>
      <Title>{campaign.title}</Title>
      <Body muted>{orgName(campaign.organizationId)}</Body>
      <Body>
        {open
          ? (campaign.description || "Mang đồ tới trạm. Nhân viên cân và quyết định phần được nhận.")
          : phase === "soon"
            ? "Chiến dịch chưa tới ngày bắt đầu. Trạm chưa nhận đồ."
            : "Chiến dịch này đã kết thúc. Trạm không còn nhận đồ cho chiến dịch này."}
      </Body>
      <StatRow
        items={[
          { label: "Loại vật phẩm", value: items.length, unit: "mục", tone: "ink" },
          { label: "Đạt mục tiêu", value: `${fulfilledCount}/${items.length}`, unit: "loại", tone: "primary" },
          { label: "Trạm tiếp nhận", value: validStations.length, unit: "trạm", tone: "coral" },
        ]}
      />
      <Title>Nhu cầu vật phẩm</Title>
      {items.length === 0 ? <Body>Chiến dịch chưa khai báo loại đồ.</Body> : null}
      {items.map((item) => {
        const current = Number(item.currentQuantity) || 0;
        const target = Number(item.targetQuantity) || 0;
        const remaining = Math.max(0, target - current);
        const unit = itemUnit(item);
        const done = target > 0 && current >= target;
        return (
          <Card key={item._id}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <Text style={{ flex: 1, fontFamily: fonts.bold, fontSize: 17, color: colors.ink }}>
                {itemName(item)}
              </Text>
              <Badge
                label={done ? "Đã đủ chỉ tiêu" : `Còn cần ${remaining} ${unit}`}
                tone={done ? "primary" : "coral"}
              />
            </View>
            <Meter
              value={current}
              max={Math.max(target, current, 1)}
              unit={unit}
              label={`Đã ghi nhận ${current} ${unit} / mục tiêu ${target} ${unit}.`}
            />
          </Card>
        );
      })}
      <Title>Trạm của chiến dịch</Title>
      {validStations.length === 0 ? <Body>Chưa gán trạm.</Body> : null}
      {validStations.map((station, index) =>
        station?.name ? (
          <Tap
            key={station._id ?? `${station.name}-${index}`}
            onPress={() => {
              if (!station._id) return;
              router.push(`/stations/map?campaign=${campaign._id}&station=${station._id}`);
            }}
          >
            <Card>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <Text style={{ flex: 1, fontFamily: fonts.bold, fontSize: 17, color: colors.ink }}>{station.name}</Text>
                {typeof station.distanceKm === "number" ? (
                  <Badge label={`Cách ${station.distanceKm.toFixed(1)} km`} tone="primary" />
                ) : null}
              </View>
              {station.address ? <Body muted>{station.address}</Body> : null}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingTop: 6,
                  borderTopWidth: 1,
                  borderTopColor: colors.hairline,
                }}
              >
                <Text style={{ fontFamily: fonts.semibold, fontSize: 13, color: colors.primary }}>
                  {open ? "Xem trạm trên bản đồ để mang đồ" : "Xem vị trí trạm trên bản đồ"}
                </Text>
                <Icon name="chevron-right" size={18} color={colors.primary} />
              </View>
            </Card>
          </Tap>
        ) : null,
      )}
      {validStations.length > 0 ? (
        <Button label="Xem mọi trạm trên bản đồ" tone="ghost" onPress={() => router.push(mapHref)} />
      ) : null}
    </View>
  );
}
