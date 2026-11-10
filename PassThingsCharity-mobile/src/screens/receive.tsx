import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { backend } from "@/api/backend";
import { ApiError } from "@/api/client";
import { pickImage } from "@/api/images";
import { formatDay, unitSpoken } from "@/api/labels";
import { useSession } from "@/api/session";
import type { CampaignSummary, ContributionItemRow, ContributionRow, PointsPayload, StationRow } from "@/api/types";
import { Field } from "@/components/form";
import { Badge, Body, Button, Card, Icon, Photo, Pill, StatRow, Tap, Title } from "@/components/ui";
import { colors, fonts } from "@/theme";

type CatalogItem = {
  _id: string;
  name: string;
  unit: string;
  pointsPerUnit: number;
};

type Donor = {
  _id: string;
  fullName?: string;
  email?: string;
  phone?: string;
  username?: string;
};

type Line = {
  key: string;
  itemTypeId: string;
  quantity: string;
  note: string;
};

function blankLine(): Line {
  return { key: `${Date.now()}-${Math.random()}`, itemTypeId: "", quantity: "", note: "" };
}

function refTitle(value: ContributionRow["campaignId"]) {
  if (value && typeof value === "object") return value.title || value.name || "";
  return "";
}

function receiptStatus(status: string) {
  if (status === "ACCEPTED") return "Đã tiếp nhận";
  if (status === "REJECTED") return "Từ chối";
  if (status === "COMPLETED") return "Hoàn tất";
  if (status === "PENDING") return "Chờ xử lý";
  return status;
}

export function pointsForReceipt(points: PointsPayload | null, contributionId: string) {
  if (!points) return null;
  const match = points.transactions.find((row) => row.type === "DONATION" && String(row.sourceId) === String(contributionId));
  return match ? match.points : null;
}

function itemLabel(item: ContributionItemRow) {
  if (item.itemTypeId && typeof item.itemTypeId === "object" && item.itemTypeId.name) return item.itemTypeId.name;
  return "Vật phẩm";
}

export function MyDonations({ summary = false }: { summary?: boolean }) {
  const { token, user } = useSession();
  const [rows, setRows] = useState<ContributionRow[] | null>(null);
  const [points, setPoints] = useState<PointsPayload | null>(null);
  const [quantities, setQuantities] = useState<string>("");
  const [problem, setProblem] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PENDING" | "ACCEPTED" | "REJECTED" | "COMPLETED">("ALL");

  useEffect(() => {
    if (!token || !user?.id) return;
    let cancelled = false;
    Promise.all([
      backend.listMyContributions(token, user.id),
      backend.myPoints(token),
    ])
      .then(async ([list, score]) => {
        if (cancelled) return;
        const receipts = list.data ?? [];
        setRows(receipts);
        setPoints(score);
        const accepted = receipts.filter((row) => row.status === "ACCEPTED");
        const details = await Promise.all(accepted.map((row) => backend.getContribution(token, row._id).catch(() => null)));
        if (cancelled) return;
        const totals = new Map<string, number>();
        for (const detail of details) {
          for (const item of detail?.items ?? []) {
            const unit = item.unit || "đơn vị";
            totals.set(unit, (totals.get(unit) ?? 0) + (Number(item.quantity) || 0));
          }
        }
        setQuantities([...totals.entries()].map(([unit, amount]) => `${amount} ${unitSpoken(unit)}`).join(", "));
      })
      .catch((caught) => {
        if (!cancelled) setProblem(caught instanceof ApiError ? caught.message : "Không tải được phiếu quyên góp.");
      });
    return () => {
      cancelled = true;
    };
  }, [token, user?.id]);

  if (!token || !user) {
    return (
      <Card>
        <Title>Quyên góp của tôi</Title>
        <Body>Đăng nhập để xem các phiếu nhân viên đã lập cho bạn.</Body>
        <Button label="Đăng nhập" onPress={() => router.push("/login")} />
      </Card>
    );
  }

  if (!rows && !problem) {
    return (
      <Card>
        <ActivityIndicator color={colors.primary} />
        <Title>Đang tải phiếu</Title>
      </Card>
    );
  }

  if (problem || !rows) {
    return (
      <Card>
        <Title>Không tải được phiếu</Title>
        <Body>{problem || "Máy chủ không trả danh sách."}</Body>
      </Card>
    );
  }

  const accepted = rows.filter((row) => row.status === "ACCEPTED");
  const campaigns = new Set(accepted.map((row) => (typeof row.campaignId === "object" ? row.campaignId?._id || row.campaignId?.title : row.campaignId) || row._id));
  const firstDay = accepted
    .map((row) => row.createdAt)
    .filter((value): value is string => Boolean(value))
    .sort()[0];
  const visibleRows = rows.filter((row) => statusFilter === "ALL" || row.status === statusFilter);
  const statusFilters = [
    { status: "ALL" as const, label: "Tất cả", count: rows.length },
    { status: "PENDING" as const, label: "Chờ xử lý", count: rows.filter((row) => row.status === "PENDING").length },
    { status: "ACCEPTED" as const, label: "Đã tiếp nhận", count: rows.filter((row) => row.status === "ACCEPTED").length },
    { status: "REJECTED" as const, label: "Từ chối", count: rows.filter((row) => row.status === "REJECTED").length },
    { status: "COMPLETED" as const, label: "Hoàn tất", count: rows.filter((row) => row.status === "COMPLETED").length },
  ];

  return (
    <View style={{ gap: 14 }}>
      <Title>Quyên góp của tôi</Title>
      <StatRow
        items={[
          { label: "Tổng điểm", value: points ? points.totalPoints : "…", unit: "điểm", tone: "primary" },
          { label: "Đã tiếp nhận", value: accepted.length, unit: "phiếu", tone: "coral" },
          { label: "Chiến dịch", value: campaigns.size, unit: "đợt", tone: "ink" },
        ]}
      />
      <Card>
        <Text style={{ fontFamily: fonts.bold, fontSize: 15, color: colors.ink }}>
          {quantities ? `Tổng đồ đã ghi nhận: ${quantities}.` : "Chưa cộng được số lượng từng món."}
        </Text>
        <Body muted>{firstDay ? `Quyên góp từ ${formatDay(firstDay)}.` : "Chưa có phiếu để tính mốc thời gian."}</Body>
      </Card>
      {summary ? null : <Body muted>Nhân viên lập phiếu khi bạn mang đồ tới quầy.</Body>}
      {rows.length === 0 ? <Body>Chưa có phiếu nào gắn với tài khoản này.</Body> : null}
      {rows.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {statusFilters.map((filter) => (
            <Pill
              key={filter.status}
              label={`${filter.label} (${filter.count})`}
              active={statusFilter === filter.status}
              onPress={() => setStatusFilter(filter.status)}
            />
          ))}
        </ScrollView>
      ) : null}
      {rows.length > 0 && visibleRows.length === 0 ? <Body>Không có phiếu ở trạng thái này.</Body> : null}
      {visibleRows.map((row) => {
        const awarded = pointsForReceipt(points, row._id);
        return (
          <Tap key={row._id} onPress={() => router.push(`/contribution/${row._id}`)}>
            <Card>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                <Text style={{ fontFamily: fonts.bold, fontSize: 16, color: colors.ink, fontVariant: ["tabular-nums"] }}>{row.code}</Text>
                <Badge
                  label={receiptStatus(row.status)}
                  tone={row.status === "ACCEPTED" ? "primary" : row.status === "REJECTED" ? "danger" : "warning"}
                />
              </View>
              <Body muted>{`${refTitle(row.stationId) || "Trạm"} · ${refTitle(row.campaignId) || "Chiến dịch"}`}</Body>
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
                <Text style={{ fontFamily: fonts.medium, fontSize: 12, color: colors.muted, fontVariant: ["tabular-nums"] }}>
                  {row.createdAt ? formatDay(row.createdAt) : ""}
                </Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  {awarded !== null ? <Badge label={`+${awarded} điểm`} tone="coral" /> : null}
                  <Icon name="chevron-right" size={18} color={colors.primary} />
                </View>
              </View>
            </Card>
          </Tap>
        );
      })}
    </View>
  );
}

export function ContributionDetailScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const receiptId = typeof id === "string" ? id : "";
  const { token } = useSession();
  const [detail, setDetail] = useState<Awaited<ReturnType<typeof backend.getContribution>> | null>(null);
  const [points, setPoints] = useState<PointsPayload | null>(null);
  const [problem, setProblem] = useState("");

  useEffect(() => {
    if (!token || !receiptId) return;
    let cancelled = false;
    Promise.all([backend.getContribution(token, receiptId), backend.myPoints(token)])
      .then(([next, score]) => {
        if (cancelled) return;
        setDetail(next);
        setPoints(score);
      })
      .catch((caught) => {
        if (!cancelled) setProblem(caught instanceof ApiError ? caught.message : "Không mở được phiếu.");
      });
    return () => {
      cancelled = true;
    };
  }, [receiptId, token]);

  if (!token) {
    return (
      <Card>
        <Title>Chi tiết phiếu</Title>
        <Body>Đăng nhập để xem phiếu.</Body>
        <Button label="Đăng nhập" onPress={() => router.push("/login")} />
      </Card>
    );
  }

  if (!detail && !problem) {
    return (
      <Card>
        <ActivityIndicator color={colors.primary} />
        <Title>Đang mở phiếu</Title>
      </Card>
    );
  }

  if (problem || !detail) {
    return (
      <Card>
        <Title>Không mở được phiếu</Title>
        <Body>{problem || "Không có dữ liệu."}</Body>
      </Card>
    );
  }

  const awarded = pointsForReceipt(points, detail.contribution._id);
  return (
    <View style={{ gap: 14 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
        <Title>{detail.contribution.code}</Title>
        <Badge
          label={receiptStatus(detail.contribution.status)}
          tone={detail.contribution.status === "ACCEPTED" ? "primary" : detail.contribution.status === "REJECTED" ? "danger" : "warning"}
        />
      </View>
      <Body muted>{`${refTitle(detail.contribution.stationId) || "Trạm"} · ${refTitle(detail.contribution.campaignId) || "Chiến dịch"}`}</Body>
      {detail.contribution.createdAt ? <Body muted>{formatDay(detail.contribution.createdAt)}</Body> : null}
      <StatRow
        items={[
          { label: "Loại vật phẩm", value: detail.items.length, unit: "mục", tone: "ink" },
          { label: "Điểm cộng", value: awarded !== null ? `+${awarded}` : "0", unit: "điểm", tone: "coral" },
          { label: "Ảnh xác minh", value: detail.images.length, unit: "ảnh", tone: "primary" },
        ]}
      />
      <Title>Các món trong phiếu</Title>
      {detail.items.length === 0 ? <Body>Phiếu chưa có món.</Body> : null}
      {detail.items.map((item, index) => (
        <Card key={`${itemLabel(item)}-${index}`}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <Text style={{ flex: 1, fontFamily: fonts.bold, fontSize: 16, color: colors.ink }}>{itemLabel(item)}</Text>
            <Badge label={`${item.quantity} ${unitSpoken(item.unit)}`} tone="primary" />
          </View>
          {item.note ? <Body muted>{item.note}</Body> : null}
        </Card>
      ))}
      {detail.images.length > 0 ? <Title>Ảnh xác minh</Title> : null}
      {detail.images.map((image, index) => image.imageUrl ? <Photo key={image.imageUrl} uri={image.imageUrl} height={180} radius={16} /> : <Body key={index} muted>Ảnh không có đường dẫn.</Body>)}
    </View>
  );
}

export function ReceptionForm({ onCreated }: { onCreated?: () => void }) {
  const { token, user } = useSession();
  const stations = user?.stations ?? [];
  const [stationId, setStationId] = useState(stations.length === 1 ? stations[0]._id : "");
  const [extraStations, setExtraStations] = useState<StationRow[] | null>(stations.length ? stations : null);
  const [query, setQuery] = useState("");
  const [donors, setDonors] = useState<Donor[]>([]);
  const [donor, setDonor] = useState<Donor | null>(null);
  const [campaigns, setCampaigns] = useState<CampaignSummary[]>([]);
  const [campaignId, setCampaignId] = useState("");
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [lines, setLines] = useState<Line[]>([blankLine()]);
  const [notes, setNotes] = useState("");
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [done, setDone] = useState<{ code: string; count: number; points: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      backend.listCampaigns({ status: "ACTIVE" }),
      backend.listItemTypes(true),
    ]).then(([campaignList, itemList]) => {
      if (cancelled) return;
      setCampaigns(campaignList.campaigns);
      setCatalog(itemList.itemTypes.flatMap((item) => item.unit ? [{
        _id: item._id,
        name: item.name,
        unit: item.unit,
        pointsPerUnit: item.pointsPerUnit || 0,
      }] : []));
    }).catch((caught) => {
      if (!cancelled) setNote(caught instanceof ApiError ? caught.message : "Không tải được danh mục.");
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (stations.length || !token || user?.role !== "ADMIN") return;
    let cancelled = false;
    backend.listStations(token).then((data) => {
      if (!cancelled) setExtraStations(data.data);
    }).catch(() => {
      if (!cancelled) setExtraStations([]);
    });
    return () => {
      cancelled = true;
    };
  }, [stations.length, token, user?.role]);

  const stationChoices = stations.length ? stations : (extraStations ?? []);
  const neededIds = useMemo(() => {
    const campaign = campaigns.find((item) => item._id === campaignId);
    const ids = new Set<string>();
    for (const item of campaign?.items ?? []) {
      const id = typeof item.itemTypeId === "object" ? item.itemTypeId?._id : item.itemTypeId;
      if (id) ids.add(String(id));
    }
    return ids;
  }, [campaignId, campaigns]);

  const estimated = 20 + lines.reduce((sum, line) => {
    const type = catalog.find((item) => item._id === line.itemTypeId);
    return sum + Math.round(Number(line.quantity || 0) * (type?.pointsPerUnit || 0));
  }, 0);
  const filled = lines.filter((line) => line.itemTypeId && Number(line.quantity) > 0);

  function chooseItem(index: number, item: CatalogItem) {
    setLines((current) => current.map((line, lineIndex) => {
      if (lineIndex !== index) return line;
      return { ...line, itemTypeId: item._id, quantity: line.quantity };
    }));
  }

  function resetForm() {
    setDonor(null);
    setDonors([]);
    setQuery("");
    setCampaignId("");
    setLines([blankLine()]);
    setNotes("");
    setImageUrls([]);
    setDone(null);
    setNote("");
    if (stations.length === 1) setStationId(stations[0]._id);
  }

  async function searchDonor() {
    if (!token || !query.trim()) return;
    setBusy(true);
    setNote("");
    try {
      const data = await backend.lookupDonor(token, query.trim());
      setDonors(data.data || []);
      setNote(data.data?.length ? `Có ${data.data.length} người.` : "Không thấy người quyên góp.");
    } catch (caught) {
      setNote(caught instanceof ApiError ? caught.message : "Không tra được người quyên góp.");
    } finally {
      setBusy(false);
    }
  }

  async function upload() {
    if (!token) return;
    setBusy(true);
    setNote("");
    try {
      const file = await pickImage();
      if (!file) {
        setNote("Chưa chọn ảnh.");
        return;
      }
      const uploaded = await backend.uploadContributionImages(token, [file]);
      setImageUrls(uploaded.imageUrls ?? []);
      setNote(uploaded.imageUrls?.length ? `Đã tải ${uploaded.imageUrls.length} ảnh.` : "Máy chủ không trả đường dẫn ảnh.");
    } catch (caught) {
      setNote(caught instanceof ApiError ? caught.message : "Không tải được ảnh.");
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    if (!token) return;
    const items = lines.flatMap((line) => {
      const type = catalog.find((item) => item._id === line.itemTypeId);
      const quantity = Number(line.quantity);
      if (!type || !(quantity > 0)) return [];
      if (type.unit !== "KG" && !Number.isInteger(quantity)) return [];
      return [{ itemTypeId: type._id, quantity, unit: type.unit, note: line.note.trim() }];
    });
    if (!donor || !stationId || !campaignId || items.length !== filled.length || items.length === 0) {
      setNote("Chọn người tặng, trạm, chiến dịch, và nhập số lượng hợp lệ cho từng món. Đơn vị khác Kg dùng số nguyên.");
      return;
    }
    setBusy(true);
    setNote("");
    try {
      const data = await backend.createContribution(token, {
        userId: donor._id,
        stationId,
        campaignId,
        notes: notes.trim(),
        items,
        imageUrls,
      });
      setDone({
        code: data.contribution.code,
        count: Array.isArray(data.items) ? data.items.length : items.length,
        points: data.gamification?.pointsAwarded ?? 0,
      });
      onCreated?.();
    } catch (caught) {
      setNote(caught instanceof ApiError ? caught.message : "Không lập được phiếu.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <Card>
        <Title>Đã tiếp nhận</Title>
        <Text style={{ fontFamily: fonts.bold, fontSize: 28, color: colors.primary }}>{done.code}</Text>
        <Body>{`${done.count} món trong phiếu.`}</Body>
        <Text style={{ fontFamily: fonts.bold, fontSize: 22, color: colors.secondary }}>{`+${done.points} điểm`}</Text>
        <Button label="Lập phiếu tiếp theo" onPress={resetForm} />
      </Card>
    );
  }

  const stationName = stationChoices.find((item) => item._id === stationId)?.name;

  return (
    <View style={{ gap: 12 }}>
      <Title>Lập phiếu tiếp nhận</Title>
      <Body muted>Một phiếu ghi nhiều loại đồ. Đơn vị gửi lên đúng mã máy chủ đang lưu.</Body>
      {stations.length === 1 ? <Body>{`Trạm ${stations[0].name}`}</Body> : null}
      {stationChoices.length !== 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {stationChoices.map((station) => (
            <Pill key={station._id} label={station.name} active={station._id === stationId} onPress={() => setStationId(station._id)} />
          ))}
        </ScrollView>
      ) : null}
      {user?.role === "STAFF" && stations.length === 0 ? <Body>Bạn chưa được gán vào trạm nào. Đăng nhập lại nếu vừa được phân trạm.</Body> : null}
      {stationName && stations.length !== 1 ? <Body muted>{stationName}</Body> : null}
      {donor ? (
        <Card>
          <Text style={{ fontFamily: fonts.bold, fontSize: 18, color: colors.ink }}>{donor.fullName || donor.username || "Người tặng"}</Text>
          {donor.phone ? <Body>{donor.phone}</Body> : null}
          {donor.email ? <Body muted>{donor.email}</Body> : null}
          {donor.username ? <Body muted>{donor.username}</Body> : null}
          <Button label="Đổi người khác" tone="ghost" onPress={() => setDonor(null)} />
        </Card>
      ) : (
        <View style={{ gap: 8 }}>
          <Field label="Số điện thoại, email, username hoặc họ tên" value={query} onChangeText={setQuery} />
          <Button label={busy ? "Đang tìm" : "Tìm người tặng"} tone="ghost" disabled={busy} onPress={() => void searchDonor()} />
          {donors.map((person) => (
            <Tap key={person._id} onPress={() => setDonor(person)}>
              <Card>
                <Text style={{ fontFamily: fonts.semibold, fontSize: 16, color: colors.ink }}>{person.fullName || person.username}</Text>
                <Body muted>{[person.phone, person.email, person.username].filter(Boolean).join("\n")}</Body>
              </Card>
            </Tap>
          ))}
        </View>
      )}
      <Body>Chiến dịch đang nhận</Body>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {campaigns.map((campaign) => (
          <Pill key={campaign._id} label={campaign.title} active={campaign._id === campaignId} onPress={() => setCampaignId(campaign._id)} />
        ))}
      </ScrollView>
      {lines.map((line, index) => {
        const chosen = catalog.find((item) => item._id === line.itemTypeId);
        const taken = new Set(lines.flatMap((row, rowIndex) => rowIndex === index || !row.itemTypeId ? [] : [row.itemTypeId]));
        return (
          <Card key={line.key}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
              <Text style={{ flex: 1, fontFamily: fonts.bold, fontSize: 16, color: colors.ink }}>
                {chosen ? `${index + 1}. ${chosen.name}` : `Món #${index + 1} · Chọn vật phẩm`}
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                {chosen && neededIds.has(chosen._id) ? <Badge label="Chiến dịch đang cần" tone="primary" /> : null}
                {chosen ? <Badge label={chosen.unit} tone="neutral" /> : null}
              </View>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {catalog.filter((item) => item._id === line.itemTypeId || !taken.has(item._id)).map((item) => (
                <Pill key={item._id} label={item.name} active={item._id === line.itemTypeId} onPress={() => chooseItem(index, item)} />
              ))}
            </ScrollView>
            <Field
              label={chosen ? `Số lượng (${unitSpoken(chosen.unit)})` : "Số lượng"}
              value={line.quantity}
              onChangeText={(value) => setLines((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, quantity: value.replace(",", ".") } : row))}
              keyboardType={chosen?.unit === "KG" ? "decimal-pad" : "number-pad"}
            />
            <Field label="Ghi chú món" value={line.note} onChangeText={(value) => setLines((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, note: value } : row))} autoCapitalize="sentences" />
            {lines.length > 1 ? (
              <Tap
                onPress={() => setLines((current) => current.filter((_, rowIndex) => rowIndex !== index))}
                accessibilityLabel="Xóa món"
                style={{ alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 4, minHeight: 36 }}
              >
                <Icon name="delete-outline" size={20} color={colors.error} />
                <Text style={{ fontFamily: fonts.semibold, fontSize: 13, color: colors.error }}>Xóa dòng này</Text>
              </Tap>
            ) : null}
          </Card>
        );
      })}
      <Button label="Thêm vật phẩm" tone="ghost" onPress={() => setLines((current) => [...current, blankLine()])} />
      <Field label="Ghi chú phiếu" value={notes} onChangeText={setNotes} autoCapitalize="sentences" />
      <Body muted>{imageUrls.length ? "Đã có 1 ảnh." : "Chưa đính ảnh. Mỗi lần chỉ chọn một ảnh."}</Body>
      <Button label={busy ? "Đang gửi" : "Tải ảnh"} tone="ghost" disabled={busy} onPress={() => void upload()} />
      <StatRow
        items={[
          { label: "Loại vật phẩm", value: filled.length, unit: "món", tone: "primary" },
          { label: "Điểm dự kiến", value: filled.length > 0 ? `+${estimated}` : "0", unit: "điểm", tone: "coral" },
          { label: "Ảnh đính kèm", value: imageUrls.length, unit: "ảnh", tone: "ink" },
        ]}
      />
      {note ? <Body>{note}</Body> : null}
      <Button label={busy ? "Đang gửi" : "Lập phiếu"} disabled={busy} onPress={() => void submit()} />
    </View>
  );
}
