import { useEffect, useRef, useState } from "react";
import { Platform, ScrollView, View } from "react-native";
import { backend } from "@/api/backend";
import { donorLabel } from "@/api/labels";
import { ApiError } from "@/api/client";
import { Body, Button, Card, Pill, StatRow, Title } from "@/components/ui";
import { colors } from "@/theme";
import { can, Fold, nextCampaignStatuses, Note, OpsGate, PickList, RoleNote, TextField, Units, useJob, useRole, useRows, type Row } from "@/screens/ops/kit";

const AppleMaps = Platform.OS === "ios" ? (require("expo-maps") as typeof import("expo-maps")).AppleMaps : null;

function StationPlaceMap({
  latitude,
  longitude,
  onPick,
}: {
  latitude: string;
  longitude: string;
  onPick: (latitude: string, longitude: string) => void;
}) {
  const camera = useRef({ coordinates: { latitude: 10.7769, longitude: 106.7009 }, zoom: 13 }).current;
  if (!AppleMaps) return null;
  const lat = Number(latitude);
  const lng = Number(longitude);
  const picked = Number.isFinite(lat) && Number.isFinite(lng);
  return (
    <View style={{ height: 220, borderRadius: 14, overflow: "hidden" }}>
      <AppleMaps.View
        style={{ flex: 1, width: "100%" }}
        cameraPosition={camera}
        markers={picked ? [{ id: "new-station", title: "Vị trí trạm", coordinates: { latitude: lat, longitude: lng }, tintColor: colors.primary }] : []}
        onMapClick={(event) => {
          const nextLat = event.coordinates.latitude;
          const nextLng = event.coordinates.longitude;
          if (typeof nextLat !== "number" || typeof nextLng !== "number" || !Number.isFinite(nextLat) || !Number.isFinite(nextLng)) return;
          onPick(nextLat.toFixed(6), nextLng.toFixed(6));
        }}
        colorScheme={AppleMaps.MapColorScheme.LIGHT}
      />
    </View>
  );
}

function orgState(row: Row) {
  if (row.status === "REJECTED") return "Bị từ chối";
  if (row.status === "APPROVED" || row.isVerified) return "Đã duyệt";
  return "Chờ duyệt";
}

function orgDetail(row: Row) {
  return `${orgState(row)}${row.code ? ` · ${row.code}` : ""}`;
}

function orgBucket(row: Row) {
  if (row.status === "REJECTED") return "REJECTED";
  if (row.status === "APPROVED" || row.isVerified) return "APPROVED";
  return "PENDING";
}

export function OrgScreen() {
  const list = useRows((token) => backend.listOrganizations(token).then((data) => data.data as Row[]));
  const job = useJob();
  const role = useRole();
  const [picked, setPicked] = useState("");
  const [reason, setReason] = useState("");
  const [bucket, setBucket] = useState<"ALL" | "PENDING" | "APPROVED" | "REJECTED">(role === "ADMIN" ? "PENDING" : "ALL");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [address, setAddress] = useState("");
  const allRows = list.rows ?? [];
  const counts = {
    pending: allRows.filter((row) => orgBucket(row) === "PENDING").length,
    approved: allRows.filter((row) => orgBucket(row) === "APPROVED").length,
    rejected: allRows.filter((row) => orgBucket(row) === "REJECTED").length,
  };
  const shown = allRows.filter((row) => bucket === "ALL" || orgBucket(row) === bucket);

  return (
    <OpsGate>
      <Title>Tổ chức</Title>
      <RoleNote />
      <Note text={list.error || job.note} />
      {list.rows ? (
        <StatRow
          items={[
            { label: "Chờ duyệt", value: counts.pending, unit: "đơn", tone: "coral" },
            { label: "Đã duyệt", value: counts.approved, unit: "hội", tone: "primary" },
            { label: "Từ chối", value: counts.rejected, unit: "đơn", tone: "ink" },
          ]}
        />
      ) : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        <Pill label={`Chờ duyệt (${counts.pending})`} active={bucket === "PENDING"} onPress={() => setBucket("PENDING")} />
        <Pill label={`Đã duyệt (${counts.approved})`} active={bucket === "APPROVED"} onPress={() => setBucket("APPROVED")} />
        <Pill label={`Bị từ chối (${counts.rejected})`} active={bucket === "REJECTED"} onPress={() => setBucket("REJECTED")} />
        <Pill label={`Tất cả (${allRows.length})`} active={bucket === "ALL"} onPress={() => setBucket("ALL")} />
      </ScrollView>
      <PickList
        rows={list.rows ? shown : null}
        selected={picked}
        onPick={setPicked}
        detail={orgDetail}
        panel={(row) => can(role, ["ADMIN"]) ? (
          <>
            {row.address ? <Body>{row.address}</Body> : null}
            {row.phone ? <Body muted>{row.phone}</Body> : null}
            {row.email ? <Body muted>{row.email}</Body> : null}
            {row.operatingArea ? <Body muted>{row.operatingArea}</Body> : null}
            {row.idCardNumber ? <Body muted>{`CCCD ${row.idCardNumber}`}</Body> : null}
            {row.description ? <Body>{row.description}</Body> : null}
            {row.rejectionReason ? <Body>{row.rejectionReason}</Body> : null}
            {orgBucket(row) === "PENDING" ? (
              <>
                <Button label={job.busy ? "Đang gửi" : "Duyệt tổ chức này"} onPress={() => void job.run((token) => backend.approveOrganization(token, row._id)).then((ok) => ok && list.reload())} />
                <TextField label="Lý do từ chối" value={reason} onChangeText={setReason} />
                <Button label="Từ chối tổ chức này" tone="danger" onPress={() => void job.run((token) => backend.rejectOrganization(token, row._id, reason.trim())).then((ok) => ok && list.reload())} />
              </>
            ) : null}
          </>
        ) : null}
      />
      {role === "USER" ? <Title>Tổ chức mới</Title> : null}
      {role === "USER" ? (
        <View style={{ gap: 8 }}>
          <TextField label="Tên" value={name} onChangeText={setName} />
          <TextField label="Mã" value={code} onChangeText={setCode} />
          <TextField label="Địa chỉ" value={address} onChangeText={setAddress} />
          <Button
            label="Tạo tổ chức"
            onPress={() => void job.run((token) => backend.createOrganization(token, { name: name.trim(), code: code.trim(), address: address.trim() })).then((ok) => {
              if (!ok) return;
              setName("");
              setCode("");
              setAddress("");
              list.reload();
            })}
          />
        </View>
      ) : null}
    </OpsGate>
  );
}

export function StationScreen() {
  const stations = useRows((token) => backend.listStations(token).then((data) => data.data as Row[]));
  const orgs = useRows((token) => backend.listOrganizations(token).then((data) => data.data as Row[]));
  const job = useJob();
  const role = useRole();
  const [picked, setPicked] = useState("");
  const [staffError, setStaffError] = useState("");
  const [orgId, setOrgId] = useState("");
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [staff, setStaff] = useState<Row[] | null>(null);
  const [staffId, setStaffId] = useState("");

  useEffect(() => {
    if (!job.token || !picked) return;
    if (!can(role, ["STATION_MANAGER", "ORG_MANAGER"])) {
      setStaff(null);
      setStaffError(role === "ADMIN" ? "Server chỉ cho quản lý trạm hoặc quản lý tổ chức xem nhân viên." : "");
      return;
    }
    let cancelled = false;
    setStaffError("");
    backend.listStaff(job.token, picked)
      .then((data) => {
        if (!cancelled) setStaff(data.data as Row[]);
      })
      .catch((caught) => {
        if (!cancelled) {
          setStaff(null);
          setStaffError(caught instanceof ApiError ? caught.message : "Không tải được nhân viên.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [job.token, picked, job.note, role]);

  return (
    <OpsGate>
      <Title>Trạm</Title>
      <Note text={stations.error || orgs.error || staffError || job.note} />
      {stations.rows ? (
        <StatRow
          items={[
            { label: "Đang mở", value: stations.rows.filter((r) => r.isActive).length, unit: "trạm", tone: "primary" },
            { label: "Chờ kích hoạt", value: stations.rows.filter((r) => !r.isActive).length, unit: "trạm", tone: "coral" },
            { label: "Tổng cộng", value: stations.rows.length, unit: "trạm", tone: "ink" },
          ]}
        />
      ) : null}
      <PickList rows={stations.rows} selected={picked} onPick={setPicked} detail={(row) => `${row.isActive ? "Đang mở" : "Chưa kích hoạt"} · ${row.address || ""}`} />
      {picked ? (
        <View style={{ gap: 8 }}>
          {can(role, ["ADMIN"]) && stations.rows?.find((row) => row._id === picked)?.isActive ? <Body>Trạm này đã được duyệt.</Body> : null}
          {can(role, ["ADMIN"]) && !stations.rows?.find((row) => row._id === picked)?.isActive ? <Button label={job.busy ? "Đang gửi" : "Duyệt trạm"} onPress={() => void job.run((token) => backend.approveStation(token, picked)).then((ok) => ok && stations.reload())} /> : null}
          {role === "ORG_MANAGER" && stations.rows?.find((row) => row._id === picked)?.isActive ? (
            <View style={{ gap: 8 }}>
              <TextField label="Email hoặc điện thoại của trưởng trạm có sẵn" value={identifier} onChangeText={setIdentifier} />
              <Button label="Gán trưởng trạm có sẵn" tone="ghost" onPress={() => void job.run((token) => backend.assignStationManagerByContact(token, picked, identifier.trim()))} />
              <Button label="Gỡ trưởng trạm" tone="danger" onPress={() => void job.run((token) => backend.removeStationManager(token, picked))} />
            </View>
          ) : null}
          {can(role, ["STATION_MANAGER", "ORG_MANAGER"]) ? (
            <View style={{ gap: 8 }}>
              <Title>Nhân viên của trạm</Title>
              <PickList rows={staff} selected={staffId} onPick={setStaffId} detail={(row) => row.phone || row.username || ""} />
              {staffId ? <Button label="Gỡ nhân viên này" tone="danger" onPress={() => void job.run((token) => backend.removeStaff(token, picked, staffId))} /> : null}
            </View>
          ) : null}
          {role === "ORG_MANAGER" && picked && !stations.rows?.find((row) => row._id === picked)?.isActive ? <Body muted>Chờ admin duyệt trạm này rồi mới gán trưởng trạm.</Body> : null}
          {can(role, ["STATION_MANAGER", "ORG_MANAGER"]) ? (
            <View style={{ gap: 8 }}>
              <Title>Thêm nhân viên đã có tài khoản</Title>
              <Body muted>Người đó phải tự đăng ký trước. Chỉ điền một trong hai: email hoặc số điện thoại 10 số. Không tạo mật khẩu ở đây.</Body>
              <TextField label="Email hoặc số điện thoại" value={identifier} onChangeText={setIdentifier} />
              <Button
                label="Thêm vào trạm"
                tone="ghost"
                onPress={() => {
                  const value = identifier.trim();
                  const body = value.includes("@") ? { email: value } : { phone: value };
                  void job.run((token) => backend.createStaff(token, picked, body));
                }}
              />
            </View>
          ) : null}
          {role === "ORG_MANAGER" && stations.rows?.find((row) => row._id === picked)?.isActive ? (
            <View style={{ gap: 8 }}>
              <Title>Tạo tài khoản trưởng trạm mới</Title>
              <TextField label="Email" value={email} onChangeText={setEmail} />
              <TextField label="Username" value={username} onChangeText={setUsername} />
              <TextField label="Mật khẩu" value={password} onChangeText={setPassword} secure />
              <TextField label="Họ tên" value={fullName} onChangeText={setFullName} />
              <TextField label="Điện thoại" value={phone} onChangeText={setPhone} />
              <Button
                label="Tạo và gán trưởng trạm"
                onPress={() => void job.run((token) => backend.createStationManager(token, picked, {
                  email: email.trim(),
                  username: username.trim(),
                  password,
                  fullName: fullName.trim(),
                  phone: phone.trim(),
                }))}
              />
            </View>
          ) : null}
        </View>
      ) : null}
      {role === "ORG_MANAGER" ? (
        <View style={{ gap: 8 }}>
          <Title>Trạm mới</Title>
          <Body muted>Chọn tổ chức sở hữu trạm.</Body>
          <PickList rows={orgs.rows} selected={orgId} onPick={setOrgId} detail={orgDetail} />
          <TextField label="Tên trạm" value={name} onChangeText={setName} />
          <TextField label="Địa chỉ" value={address} onChangeText={setAddress} />
          {AppleMaps ? <Body muted>Chạm bản đồ để đặt vị trí trạm.</Body> : null}
          {AppleMaps ? <StationPlaceMap latitude={latitude} longitude={longitude} onPick={(lat, lng) => { setLatitude(lat); setLongitude(lng); }} /> : null}
          <TextField label="Vĩ độ" value={latitude} onChangeText={setLatitude} />
          <TextField label="Kinh độ" value={longitude} onChangeText={setLongitude} />
          <Button
            label="Tạo trạm"
            onPress={() => void job.run((token) => backend.createStationForOrganization(token, orgId, {
              name: name.trim(),
              address: address.trim(),
              latitude: latitude.trim(),
              longitude: longitude.trim(),
            })).then((ok) => ok && stations.reload())}
          />
        </View>
      ) : role === "ADMIN" ? null : <Body muted>Vai trò này không tạo trạm.</Body>}
    </OpsGate>
  );
}

export function CatalogScreen() {
  const categories = useRows(async () => {
    const data = await backend.listCategories();
    return data.categories as Row[];
  });
  const items = useRows(async () => {
    const data = await backend.listItemTypes();
    return data.itemTypes as Row[];
  });
  const job = useJob();
  const role = useRole();
  const editor = can(role, ["ADMIN", "ORG_MANAGER", "STATION_MANAGER"]);
  const [categoryId, setCategoryId] = useState("");
  const [itemId, setItemId] = useState("");
  const [categoryName, setCategoryName] = useState("");
  const [editCategoryName, setEditCategoryName] = useState("");
  const [itemName, setItemName] = useState("");
  const [editItemName, setEditItemName] = useState("");
  const [editUnit, setEditUnit] = useState("KG");
  const [createUnit, setCreateUnit] = useState("KG");

  return (
    <OpsGate>
      <Title>Danh mục đồ</Title>
      <RoleNote />
      <Note text={categories.error || items.error || job.note} />
      {categories.rows && items.rows ? (
        <StatRow
          items={[
            { label: "Nhóm đồ", value: categories.rows.length, unit: "nhóm", tone: "primary" },
            { label: "Loại vật phẩm", value: items.rows.length, unit: "loại", tone: "coral" },
          ]}
        />
      ) : null}
      <Body>Nhóm đồ</Body>
      <PickList
        rows={categories.rows}
        selected={categoryId}
        onPick={(id) => {
          setCategoryId(id);
          setEditCategoryName(categories.rows?.find((row) => row._id === id)?.name || "");
        }}
        detail={() => "Nhóm"}
        panel={(row) => editor ? (
          <>
            <TextField label="Tên nhóm" value={editCategoryName} onChangeText={setEditCategoryName} />
            <Button label="Lưu tên nhóm" onPress={() => void job.run((token) => backend.updateCategory(token, row._id, { name: editCategoryName.trim() })).then((ok) => ok && categories.reload())} />
            <Button label="Xóa nhóm" tone="danger" onPress={() => void job.run((token) => backend.deleteCategory(token, row._id)).then((ok) => ok && categories.reload())} />
          </>
        ) : null}
      />
      {editor ? (
        <Fold title="Nhóm mới">
          <TextField label="Tên nhóm mới" value={categoryName} onChangeText={setCategoryName} />
          <Button label="Thêm nhóm" onPress={() => void job.run((token) => backend.createCategory(token, { name: categoryName.trim() })).then((ok) => ok && categories.reload())} />
        </Fold>
      ) : <Body muted>Vai trò này chỉ xem danh mục.</Body>}
      <Body>Loại đồ</Body>
      <PickList
        rows={items.rows}
        selected={itemId}
        onPick={(id) => {
          setItemId(id);
          const row = items.rows?.find((item) => item._id === id);
          setEditItemName(row?.name || "");
          setEditUnit(row?.unit || "KG");
        }}
        detail={(row) => row.unit || ""}
        panel={(row) => editor ? (
          <>
            <TextField label="Tên loại đồ" value={editItemName} onChangeText={setEditItemName} />
            <Units value={editUnit} onChange={setEditUnit} />
            <Button label="Lưu loại đồ" onPress={() => void job.run((token) => backend.updateItemType(token, row._id, { name: editItemName.trim(), unit: editUnit })).then((ok) => ok && items.reload())} />
            <Button label="Xóa loại đồ" tone="danger" onPress={() => void job.run((token) => backend.deleteItemType(token, row._id)).then((ok) => ok && items.reload())} />
          </>
        ) : null}
      />
      {editor ? (
        <Fold title="Loại đồ mới">
          <TextField label="Tên loại đồ" value={itemName} onChangeText={setItemName} />
          <Units value={createUnit} onChange={setCreateUnit} />
          <Button
            label="Thêm vào nhóm đang chọn"
            onPress={() => void job.run((token) => backend.createItemType(token, { categoryId, name: itemName.trim(), unit: createUnit })).then((ok) => ok && items.reload())}
          />
        </Fold>
      ) : null}
    </OpsGate>
  );
}

export function CampaignWork() {
  const campaigns = useRows(async () => {
    const data = await backend.listCampaigns();
    return data.campaigns as Row[];
  });
  const orgs = useRows((token) => backend.listOrganizations(token).then((data) => data.data as Row[]));
  const items = useRows(async () => (await backend.listItemTypes()).itemTypes as Row[]);
  const stations = useRows((token) => backend.listStations(token).then((data) => data.data as Row[]));
  const job = useJob();
  const role = useRole();
  const editor = can(role, ["ADMIN", "ORG_MANAGER", "STATION_MANAGER"]);
  const [picked, setPicked] = useState("");
  const [orgId, setOrgId] = useState("");
  const [itemId, setItemId] = useState("");
  const [stationId, setStationId] = useState("");
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState("2026-10-20");
  const [endDate, setEndDate] = useState("2026-10-26");
  const [quantity, setQuantity] = useState("10");

  return (
    <OpsGate>
      <Title>Chiến dịch</Title>
      <RoleNote />
      <Note text={campaigns.error || job.note} />
      {campaigns.rows ? (
        <StatRow
          items={[
            { label: "Đang nhận", value: campaigns.rows.filter((r) => r.status === "ACTIVE").length, unit: "đợt", tone: "primary" },
            { label: "Sắp mở", value: campaigns.rows.filter((r) => r.status === "PUBLISHED").length, unit: "đợt", tone: "coral" },
            { label: "Tổng cộng", value: campaigns.rows.length, unit: "đợt", tone: "ink" },
          ]}
        />
      ) : null}
      <PickList
        rows={campaigns.rows}
        selected={picked}
        onPick={setPicked}
        detail={(row) => donorLabel({ status: row.status || "" })}
        panel={(row) => editor ? (
          <>
            {nextCampaignStatuses(row.status || "DRAFT").map((status) => (
              <Button key={status} label={status === "CANCELLED" ? "Hủy chiến dịch" : donorLabel({ status })} tone={status === "CANCELLED" ? "danger" : "ghost"} onPress={() => void job.run((token) => backend.updateCampaignStatus(token, row._id, status)).then((ok) => ok && campaigns.reload())} />
            ))}
            {nextCampaignStatuses(row.status || "").length === 0 ? <Body muted>Chiến dịch này không còn trạng thái để chuyển.</Body> : null}
            <PickList rows={items.rows} selected={itemId} onPick={setItemId} detail={(item) => item.unit || ""} />
            <TextField label="Số mục tiêu" value={quantity} onChangeText={setQuantity} />
            <Button label="Gắn loại đồ" onPress={() => void job.run((token) => backend.addCampaignItem(token, row._id, { itemTypeId: itemId, targetQuantity: Number(quantity), priority: "MEDIUM" }))} />
            {itemId ? <Button label="Gỡ loại đồ đang chọn" tone="danger" onPress={() => void job.run((token) => backend.removeCampaignItem(token, row._id, itemId))} /> : null}
            <PickList rows={stations.rows} selected={stationId} onPick={setStationId} detail={(station) => station.address || ""} />
            <Button label="Gắn trạm" onPress={() => void job.run((token) => backend.assignCampaignStation(token, row._id, stationId))} />
            {stationId ? <Button label="Gỡ trạm đang chọn" tone="danger" onPress={() => void job.run((token) => backend.removeCampaignStation(token, row._id, stationId))} /> : null}
          </>
        ) : null}
      />
      {editor ? <Title>Chiến dịch mới</Title> : null}
      {editor ? <Body muted>Thời lượng từ 5 đến 7 ngày.</Body> : null}
      {editor ? (
        <View style={{ gap: 8 }}>
          <PickList rows={orgs.rows} selected={orgId} onPick={setOrgId} detail={(row) => row.address || ""} />
          <TextField label="Tên chiến dịch" value={title} onChangeText={setTitle} />
          <TextField label="Ngày bắt đầu" value={startDate} onChangeText={setStartDate} />
          <TextField label="Ngày kết thúc" value={endDate} onChangeText={setEndDate} />
          <Button
            label="Tạo bản nháp"
            onPress={() => void job.run(async (token) => {
              const station = stations.rows?.find((row) => row._id === stationId) || stations.rows?.[0];
              const linked = (station as (Row & { organizationId?: string | { _id?: string } }) | undefined)?.organizationId;
              const organizationId = orgId || (typeof linked === "string" ? linked : linked?._id || "");
              const data = await backend.createCampaign(token, { title: title.trim(), startDate, endDate, organizationId }) as { campaign?: { _id?: string } };
              if (data.campaign?._id) setPicked(data.campaign._id);
              return data;
            })}
          />
        </View>
      ) : null}
      {editor && picked && !campaigns.rows?.some((row) => row._id === picked) ? (
        <View style={{ gap: 8 }}>
          <Body muted>Bản nháp vừa tạo chưa hiện trong danh sách công khai. Gắn trạm đang hoạt động, rồi phát hành. Không cần admin duyệt.</Body>
          <PickList rows={items.rows} selected={itemId} onPick={setItemId} detail={(item) => item.unit || ""} />
          <TextField label="Số mục tiêu" value={quantity} onChangeText={setQuantity} />
          <Button label="Gắn loại đồ" onPress={() => void job.run((token) => backend.addCampaignItem(token, picked, { itemTypeId: itemId, targetQuantity: Number(quantity), priority: "MEDIUM" }))} />
          <PickList rows={stations.rows} selected={stationId} onPick={setStationId} detail={(station) => station.address || ""} />
          <Button label="Gắn trạm" onPress={() => void job.run((token) => backend.assignCampaignStation(token, picked, stationId))} />
          <Button label="Phát hành" onPress={() => void job.run((token) => backend.updateCampaignStatus(token, picked, "PUBLISHED")).then((ok) => ok && campaigns.reload())} />
        </View>
      ) : null}
    </OpsGate>
  );
}
