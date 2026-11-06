import { useEffect, useState } from "react";
import { ScrollView, View } from "react-native";
import { backend } from "@/api/backend";
import { ApiError } from "@/api/client";
import { Body, Button, Card, Pill, Title } from "@/components/ui";
import { can, nextCampaignStatuses, Note, OpsGate, PickList, RoleNote, TextField, Units, useJob, useRole, useRows, type Row } from "@/screens/ops/kit";

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
  const shown = (list.rows ?? []).filter((row) => bucket === "ALL" || orgBucket(row) === bucket);
  const chosen = shown.find((row) => row._id === picked) ?? list.rows?.find((row) => row._id === picked);

  return (
    <OpsGate>
      <Title>Tổ chức</Title>
      <RoleNote />
      <Note text={list.error || job.note} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        <Pill label="Chờ duyệt" active={bucket === "PENDING"} onPress={() => setBucket("PENDING")} />
        <Pill label="Đã duyệt" active={bucket === "APPROVED"} onPress={() => setBucket("APPROVED")} />
        <Pill label="Bị từ chối" active={bucket === "REJECTED"} onPress={() => setBucket("REJECTED")} />
        <Pill label="Tất cả" active={bucket === "ALL"} onPress={() => setBucket("ALL")} />
      </ScrollView>
      <PickList rows={list.rows ? shown : null} selected={picked} onPick={setPicked} detail={orgDetail} />
      {chosen && can(role, ["ADMIN"]) ? (
        <Card>
          <Title>{chosen.name || "Tổ chức"}</Title>
          <Body>{orgState(chosen)}</Body>
          {chosen.address ? <Body>{chosen.address}</Body> : null}
          {chosen.phone ? <Body muted>{chosen.phone}</Body> : null}
          {chosen.email ? <Body muted>{chosen.email}</Body> : null}
          {chosen.operatingArea ? <Body muted>{chosen.operatingArea}</Body> : null}
          {chosen.idCardNumber ? <Body muted>{`CCCD ${chosen.idCardNumber}`}</Body> : null}
          {chosen.description ? <Body>{chosen.description}</Body> : null}
          {chosen.rejectionReason ? <Body>{chosen.rejectionReason}</Body> : null}
        </Card>
      ) : null}
      {picked && can(role, ["ADMIN"]) ? (
        <View style={{ gap: 8 }}>
          <Button label={job.busy ? "Đang gửi" : "Duyệt tổ chức này"} onPress={() => void job.run((token) => backend.approveOrganization(token, picked)).then((ok) => ok && list.reload())} />
          <TextField label="Lý do từ chối" value={reason} onChangeText={setReason} />
          <Button label="Từ chối tổ chức này" tone="danger" onPress={() => void job.run((token) => backend.rejectOrganization(token, picked, reason.trim())).then((ok) => ok && list.reload())} />
        </View>
      ) : null}
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
    <OpsGate allowNonOperator>
      <Title>Trạm</Title>
      <Note text={stations.error || orgs.error || staffError || job.note} />
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
          {can(role, ["ORG_MANAGER", "STATION_MANAGER"]) ? (
            <View style={{ gap: 8 }}>
              <Title>Tài khoản mới cho trạm</Title>
              <TextField label="Email" value={email} onChangeText={setEmail} />
              <TextField label="Username" value={username} onChangeText={setUsername} />
              <TextField label="Mật khẩu" value={password} onChangeText={setPassword} secure />
              <TextField label="Họ tên" value={fullName} onChangeText={setFullName} />
              <TextField label="Điện thoại" value={phone} onChangeText={setPhone} />
            </View>
          ) : null}
          {can(role, ["STATION_MANAGER", "ORG_MANAGER"]) ? (
            <Button
              label="Tạo nhân viên"
              tone="ghost"
              onPress={() => void job.run((token) => backend.createStaff(token, picked, {
                email: email.trim(),
                username: username.trim(),
                password,
                fullName: fullName.trim(),
                phone: phone.trim(),
              }))}
            />
          ) : null}
          {role === "ORG_MANAGER" && stations.rows?.find((row) => row._id === picked)?.isActive ? (
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
          <Button
            label="Tạo trạm"
            onPress={() => void job.run((token) => backend.createStationForOrganization(token, orgId, {
              name: name.trim(),
              address: address.trim(),
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
  const [itemName, setItemName] = useState("");
  const [unit, setUnit] = useState("KG");

  return (
    <OpsGate>
      <Title>Danh mục đồ</Title>
      <RoleNote />
      <Note text={categories.error || items.error || job.note} />
      <Body>Nhóm đồ</Body>
      <PickList rows={categories.rows} selected={categoryId} onPick={setCategoryId} detail={() => "Nhóm"} />
      {editor ? <TextField label="Tên nhóm mới" value={categoryName} onChangeText={setCategoryName} /> : <Body muted>Vai trò này chỉ xem danh mục.</Body>}
      {editor ? <Button label="Thêm nhóm" onPress={() => void job.run((token) => backend.createCategory(token, { name: categoryName.trim() })).then((ok) => ok && categories.reload())} /> : null}
      {editor && categoryId ? <Button label="Xóa nhóm đang chọn" tone="danger" onPress={() => void job.run((token) => backend.deleteCategory(token, categoryId)).then((ok) => ok && categories.reload())} /> : null}
      <Body>Loại đồ</Body>
      <PickList rows={items.rows} selected={itemId} onPick={setItemId} detail={(row) => row.unit || ""} />
      {editor ? <TextField label="Tên loại đồ" value={itemName} onChangeText={setItemName} /> : null}
      {editor ? <Units value={unit} onChange={setUnit} /> : null}
      {editor ? (
        <Button
          label="Thêm loại đồ vào nhóm đang chọn"
          onPress={() => void job.run((token) => backend.createItemType(token, { categoryId, name: itemName.trim(), unit })).then((ok) => ok && items.reload())}
        />
      ) : null}
      {editor && itemId ? <Button label="Xóa loại đồ đang chọn" tone="danger" onPress={() => void job.run((token) => backend.deleteItemType(token, itemId)).then((ok) => ok && items.reload())} /> : null}
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
      <PickList rows={campaigns.rows} selected={picked} onPick={setPicked} detail={(row) => row.status || ""} />
      {picked && editor ? (
        <View style={{ gap: 8 }}>
          {nextCampaignStatuses(campaigns.rows?.find((row) => row._id === picked)?.status || "DRAFT").map((status) => (
            <Button key={status} label={status === "CANCELLED" ? "Hủy chiến dịch" : status} tone={status === "CANCELLED" ? "danger" : "ghost"} onPress={() => void job.run((token) => backend.updateCampaignStatus(token, picked, status)).then((ok) => ok && campaigns.reload())} />
          ))}
          {nextCampaignStatuses(campaigns.rows?.find((row) => row._id === picked)?.status || "").length === 0 ? <Body muted>Chiến dịch này không còn trạng thái để chuyển.</Body> : null}
          <Body muted>Chọn loại đồ và trạm để gắn vào chiến dịch đang chọn.</Body>
          <PickList rows={items.rows} selected={itemId} onPick={setItemId} detail={(row) => row.unit || ""} />
          <TextField label="Số mục tiêu" value={quantity} onChangeText={setQuantity} />
          <Button label="Gắn loại đồ" onPress={() => void job.run((token) => backend.addCampaignItem(token, picked, { itemTypeId: itemId, targetQuantity: Number(quantity), priority: "MEDIUM" }))} />
          {itemId ? <Button label="Gỡ loại đồ đang chọn" tone="danger" onPress={() => void job.run((token) => backend.removeCampaignItem(token, picked, itemId))} /> : null}
          <PickList rows={stations.rows} selected={stationId} onPick={setStationId} detail={(row) => row.address || ""} />
          <Button label="Gắn trạm" onPress={() => void job.run((token) => backend.assignCampaignStation(token, picked, stationId))} />
          {stationId ? <Button label="Gỡ trạm đang chọn" tone="danger" onPress={() => void job.run((token) => backend.removeCampaignStation(token, picked, stationId))} /> : null}
        </View>
      ) : null}
      {editor ? <Title>Chiến dịch mới</Title> : <Body muted>Vai trò này không tạo chiến dịch.</Body>}
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
              const data = await backend.createCampaign(token, { title: title.trim(), startDate, endDate, organizationId: orgId }) as { campaign?: { _id?: string } };
              if (data.campaign?._id) setPicked(data.campaign._id);
              return data;
            })}
          />
        </View>
      ) : null}
    </OpsGate>
  );
}
