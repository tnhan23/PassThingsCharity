import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Text, TextInput, View } from "react-native";
import * as Location from "expo-location";
import { backend } from "@/api/backend";
import { ApiError } from "@/api/client";
import { campaignPhase, donorLabel, formatDay, itemName, itemUnit, orgName } from "@/api/labels";
import { useSession } from "@/api/session";
import type { CampaignDetail, CampaignSummary } from "@/api/types";
import { Screen } from "@/components/chrome";
import { Badge, Body, Button, Card, Eyebrow, Icon, Meter, Photo, StatRow, Tap, Title } from "@/components/ui";
import { colors, fonts, photos } from "@/theme";

const urgent = [
  { title: "Áo len trẻ em", meta: "Size 4–10 tuổi, còn tốt", gap: "Thiếu 45 kg", photo: photos.child, href: "/campaign" as const },
  { title: "Balo và giày dép", meta: "Balo đi học, giày đi mưa", gap: "Thiếu 28 đôi", photo: photos.backpack, href: "/campaign" as const },
  { title: "Mì gói và lương khô", meta: "Đồ hộp, mì gói vùng lũ", gap: "Thiếu 60 thùng", photo: photos.noodles, href: "/campaign" as const },
  { title: "Thuốc và vật phẩm y tế", meta: "Bông băng, dầu gió", gap: "Thiếu 18 hộp", photo: photos.medicine, href: "/campaign" as const },
];

function OpenJobs() {
  const { token } = useSession();
  const [posts, setPosts] = useState<{ _id: string; title?: string; imageUrl?: string | null; rewardPoints?: number; slots?: { remaining?: number }; stationId?: { name?: string; imageUrl?: string | null } | string }[] | null>(null);

  useEffect(() => {
    if (!token) {
      setPosts([]);
      return;
    }
    let cancelled = false;
    backend.listOpenTasks(token)
      .then((data) => {
        if (!cancelled) setPosts(data.data ?? []);
      })
      .catch(() => {
        if (!cancelled) setPosts([]);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (!token) return null;
  const shown = (posts ?? []).slice(0, 3);
  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 4 }}>
        <View style={{ width: 44, height: 44, borderRadius: 15, backgroundColor: colors.coralSoft, alignItems: "center", justifyContent: "center" }}>
          <Icon name="volunteer-activism" size={23} color={colors.secondary} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Eyebrow>CƠ HỘI ĐỒNG HÀNH</Eyebrow>
          <Text style={{ fontFamily: fonts.bold, fontSize: 21, lineHeight: 28, color: colors.ink }}>Việc đang tuyển</Text>
        </View>
        <Icon name="arrow-forward" size={20} color={colors.secondary} />
      </View>
      {posts === null ? <Body muted>Đang tải tin tuyển.</Body> : null}
      {posts && shown.length === 0 ? <Body muted>Hiện chưa có tin tuyển tình nguyện.</Body> : null}
      {shown.map((post) => {
        const station = post.stationId && typeof post.stationId === "object" ? post.stationId : null;
        const remaining = post.slots?.remaining;
        const image = post.imageUrl || station?.imageUrl || "";
        return (
          <Card key={post._id} style={{ borderColor: colors.coralSoft, padding: 14 }}>
            {image ? (
              <Photo uri={image} height={164} radius={14} />
            ) : (
              <View style={{ height: 84, borderRadius: 14, backgroundColor: colors.coralSoft, alignItems: "center", justifyContent: "center" }}>
                <Icon name="volunteer-activism" size={34} color={colors.secondary} />
              </View>
            )}
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
              <Eyebrow>{station?.name || "Trạm"}</Eyebrow>
              <Badge label={`+${post.rewardPoints || 0} điểm`} tone="coral" icon="stars" />
            </View>
            <Text style={{ fontFamily: fonts.bold, fontSize: 19, lineHeight: 26, color: colors.ink }}>{post.title || "Việc chưa đặt tên"}</Text>
            <Body muted>{typeof remaining === "number" ? `Còn ${remaining} chỗ tuyển` : "Đang nhận tình nguyện viên"}</Body>
            <Button label="Xem việc và ứng tuyển" tone="coral" icon="arrow-forward" onPress={() => router.push("/jobs")} />
          </Card>
        );
      })}
      {posts && posts.length > 3 ? (
        <Button label={`Xem thêm ${posts.length - 3} tin`} tone="ghost" onPress={() => router.push("/jobs")} />
      ) : null}
    </View>
  );
}

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
      <View style={{ flexDirection: "row", gap: 8 }}>
        {[
          { label: "Danh sách trạm", icon: "place" as const, href: "/stations/list" as const },
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
      <OpenJobs />
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

  const visible = campaigns
    .filter((campaign) => !campaign.title.startsWith("[Mẫu]") && campaignPhase(campaign) !== "closed")
    .slice(0, 3);

  return (
    <View style={{ gap: 14 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 4 }}>
        <View style={{ width: 44, height: 44, borderRadius: 15, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" }}>
          <Icon name="volunteer-activism" size={23} color={colors.primary} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Eyebrow>CHUNG TAY TRAO GỬI</Eyebrow>
          <Text style={{ fontFamily: fonts.bold, fontSize: 21, lineHeight: 28, color: colors.ink }}>Chiến dịch đang diễn ra</Text>
        </View>
        <Icon name="arrow-forward" size={20} color={colors.primary} />
      </View>
      {visible.length === 0 ? (
        <Card style={{ backgroundColor: colors.primarySoft, borderColor: colors.primarySoft }}>
          <Title>Chưa có chiến dịch</Title>
          <Body>Hiện chưa có chiến dịch nào đang diễn ra hoặc sắp mở.</Body>
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
            <Card style={{ borderColor: colors.primarySoft, padding: 14 }}>
              {campaign.imageUrl ? (
                <Photo uri={campaign.imageUrl} height={190} radius={14} />
              ) : (
                <View style={{ height: 100, borderRadius: 14, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" }}>
                  <Icon name="volunteer-activism" size={36} color={colors.primary} />
                </View>
              )}
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
              {campaign.items?.length ? (
                <View style={{ gap: 8, padding: 12, borderRadius: 14, backgroundColor: colors.surfaceLow }}>
                  <Text style={{ fontFamily: fonts.semibold, fontSize: 13, color: colors.ink }}>
                    Vật phẩm cần quyên góp
                  </Text>
                  {campaign.items.slice(0, 3).map((item) => {
                    const donated = item.currentQuantity;
                    const target = item.targetQuantity;
                    const progress = target > 0 ? Math.min(100, Math.max(0, donated / target * 100)) : 0;
                    return (
                      <View key={item._id} style={{ flexDirection: "row", alignItems: "center", gap: 9 }}>
                        <View style={{ width: 30, height: 30, borderRadius: 10, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" }}>
                          <Icon name="inventory-2" size={16} color={colors.primary} />
                        </View>
                        <View style={{ flex: 1, gap: 2 }}>
                          <Text style={{ fontFamily: fonts.medium, fontSize: 13, color: colors.ink }} numberOfLines={1}>
                            {itemName(item)}
                          </Text>
                          <Text style={{ fontFamily: fonts.regular, fontSize: 11, color: colors.muted }}>
                            {`Đã quyên góp ${donated.toLocaleString("vi-VN")} / ${target.toLocaleString("vi-VN")} ${itemUnit(item)}`}
                          </Text>
                          <View style={{ height: 5, borderRadius: 99, backgroundColor: colors.surfaceContainer, overflow: "hidden" }}>
                            <View style={{ width: `${progress}%`, height: "100%", borderRadius: 99, backgroundColor: colors.primary }} />
                          </View>
                        </View>
                      </View>
                    );
                  })}
                  {campaign.items.length > 3 ? (
                    <Text style={{ fontFamily: fonts.medium, fontSize: 12, color: colors.primary }}>
                      {`Và ${campaign.items.length - 3} vật phẩm khác`}
                    </Text>
                  ) : null}
                </View>
              ) : null}
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
      <Button
        label="Xem thêm chiến dịch"
        tone="ghost"
        onPress={() => router.push("/campaigns")}
      />
    </View>
  );
}

export function CampaignsListScreen() {
  const [campaigns, setCampaigns] = useState<CampaignSummary[] | null>(null);
  const [problem, setProblem] = useState("");

  useEffect(() => {
    let cancelled = false;
    backend.listCampaigns()
      .then((data) => {
        if (!cancelled) {
          setCampaigns(data.campaigns.filter((campaign) => !campaign.title.startsWith("[Mẫu]")));
        }
      })
      .catch((caught) => {
        if (!cancelled) setProblem(caught instanceof ApiError ? caught.message : "Không tải được chiến dịch.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Screen tab="home">
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 4 }}>
        <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" }}>
          <Icon name="volunteer-activism" size={25} color={colors.primary} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Eyebrow>CHUNG TAY TRAO GỬI</Eyebrow>
          <Text style={{ fontFamily: fonts.bold, fontSize: 23, lineHeight: 30, color: colors.ink }}>Tất cả chiến dịch</Text>
        </View>
      </View>
      <Body muted>Khám phá các chiến dịch đang diễn ra và sắp mở.</Body>
      {problem ? (
        <Card style={{ borderColor: colors.errorSoft, backgroundColor: colors.errorSoft }}>
          <Icon name="wifi-off" size={22} color={colors.error} />
          <Title>Không tải được chiến dịch</Title>
          <Body>{problem}</Body>
        </Card>
      ) : null}
      {!campaigns && !problem ? (
        <Card>
          <ActivityIndicator color={colors.primary} />
          <Body muted>Đang tải danh sách chiến dịch.</Body>
        </Card>
      ) : null}
      {campaigns?.length === 0 ? (
        <Card style={{ backgroundColor: colors.primarySoft, borderColor: colors.primarySoft }}>
          <Icon name="campaign" size={26} color={colors.primary} />
          <Title>Chưa có chiến dịch</Title>
          <Body muted>Hiện chưa có chiến dịch nào được phát hành.</Body>
        </Card>
      ) : null}
      <View style={{ gap: 14 }}>
        {campaigns?.map((campaign) => {
          const currentPhase = campaignPhase(campaign);
          return (
            <Tap key={campaign._id} onPress={() => router.push(`/campaign?id=${campaign._id}`)}>
              <Card style={{ borderColor: colors.primarySoft, padding: 14 }}>
                {campaign.imageUrl ? (
                  <Photo uri={campaign.imageUrl} height={190} radius={14} />
                ) : (
                  <View style={{ height: 100, borderRadius: 14, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" }}>
                    <Icon name="volunteer-activism" size={36} color={colors.primary} />
                  </View>
                )}
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
                {campaign.items?.length ? (
                  <View style={{ gap: 8, padding: 12, borderRadius: 14, backgroundColor: colors.surfaceLow }}>
                    <Text style={{ fontFamily: fonts.semibold, fontSize: 13, color: colors.ink }}>
                      Vật phẩm cần quyên góp
                    </Text>
                    {campaign.items.slice(0, 3).map((item) => {
                      const donated = item.currentQuantity;
                      const target = item.targetQuantity;
                      const progress = target > 0 ? Math.min(100, Math.max(0, donated / target * 100)) : 0;
                      return (
                        <View key={item._id} style={{ flexDirection: "row", alignItems: "center", gap: 9 }}>
                          <View style={{ width: 30, height: 30, borderRadius: 10, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" }}>
                            <Icon name="inventory-2" size={16} color={colors.primary} />
                          </View>
                          <View style={{ flex: 1, gap: 2 }}>
                            <Text style={{ fontFamily: fonts.medium, fontSize: 13, color: colors.ink }} numberOfLines={1}>
                              {itemName(item)}
                            </Text>
                            <Text style={{ fontFamily: fonts.regular, fontSize: 11, color: colors.muted }}>
                              {`Đã quyên góp ${donated.toLocaleString("vi-VN")} / ${target.toLocaleString("vi-VN")} ${itemUnit(item)}`}
                            </Text>
                            <View style={{ height: 5, borderRadius: 99, backgroundColor: colors.surfaceContainer, overflow: "hidden" }}>
                              <View style={{ width: `${progress}%`, height: "100%", borderRadius: 99, backgroundColor: colors.primary }} />
                            </View>
                          </View>
                        </View>
                      );
                    })}
                    {campaign.items.length > 3 ? (
                      <Text style={{ fontFamily: fonts.medium, fontSize: 12, color: colors.primary }}>
                        {`Và ${campaign.items.length - 3} vật phẩm khác`}
                      </Text>
                    ) : null}
                  </View>
                ) : null}
                {campaign.progress && campaign.progress.totalItemTypes > 0 ? (
                  <Meter
                    value={campaign.progress.fulfilledItemTypes}
                    max={campaign.progress.totalItemTypes}
                    unit="loại"
                    label={`Đã đủ ${campaign.progress.fulfilledItemTypes} trên ${campaign.progress.totalItemTypes} loại đồ cần nhận.`}
                  />
                ) : null}
                {campaign.description ? <Body numberOfLines={2}>{campaign.description}</Body> : null}
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.hairline }}>
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
    </Screen>
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
        try {
          let coords: { userLat: string; userLng: string } | undefined;
          const permission = await Location.requestForegroundPermissionsAsync();
          if (permission.granted) {
            const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            coords = { userLat: String(position.coords.latitude), userLng: String(position.coords.longitude) };
          }
          const stationList = await backend.campaignStations(id, coords);
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
      </Card>
    );
  }

  const { campaign, items, stations } = detail;
  const phase = campaignPhase(campaign);
  const open = phase === "open";
  const stationsHref = `/stations/list?campaign=${campaign._id}`;
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
              router.push(`/station/${station._id}`);
            }}
          >
            <Card style={{ borderColor: colors.primarySoft, padding: 14 }}>
              {station.imageUrl ? (
                <Photo uri={station.imageUrl} height={150} radius={14} />
              ) : (
                <View style={{ height: 82, borderRadius: 14, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" }}>
                  <Icon name="place" size={34} color={colors.primary} />
                </View>
              )}
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 7, flex: 1 }}>
                  <View style={{ width: 30, height: 30, borderRadius: 10, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" }}>
                    <Icon name="place" size={17} color={colors.primary} />
                  </View>
                  <Text style={{ flex: 1, fontFamily: fonts.bold, fontSize: 17, color: colors.ink }} numberOfLines={2}>
                    {station.name}
                  </Text>
                </View>
                {typeof station.distanceKm === "number" ? (
                  <Badge label={`Cách ${station.distanceKm.toFixed(1)} km`} tone="primary" icon="near-me" />
                ) : null}
              </View>
              {station.address ? (
                <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 7 }}>
                  <Icon name="location-on" size={17} color={colors.outline} />
                  <Text style={{ flex: 1, fontFamily: fonts.regular, fontSize: 13, lineHeight: 19, color: colors.muted }}>
                    {station.address}
                  </Text>
                </View>
              ) : null}
              {station.openingTime || station.closingTime ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
                  <Icon name="schedule" size={17} color={colors.outline} />
                  <Text style={{ fontFamily: fonts.medium, fontSize: 12, color: colors.muted }}>
                    {`${station.openingTime || "?"} – ${station.closingTime || "?"}`}
                  </Text>
                </View>
              ) : null}
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.hairline }}>
                <Text style={{ fontFamily: fonts.semibold, fontSize: 13, color: colors.primary }}>
                  {open ? "Xem thông tin trạm để mang đồ" : "Xem thông tin trạm"}
                </Text>
                <Icon name="chevron-right" size={18} color={colors.primary} />
              </View>
            </Card>
          </Tap>
        ) : null,
      )}
      {validStations.length > 0 ? (
        <Button label="Xem danh sách trạm" tone="ghost" onPress={() => router.push(stationsHref)} />
      ) : null}
    </View>
  );
}
