import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { backend } from "@/api/backend";
import { ApiError } from "@/api/client";
import { pickImage } from "@/api/images";
import { useSession } from "@/api/session";
import { readOrgRequest, writeOrgRequest } from "@/api/storage";
import type { OrgApplication } from "@/api/types";
import { Screen } from "@/components/chrome";
import { Field } from "@/components/form";
import { Body, Button, Card, Icon, Photo, Tap, Title } from "@/components/ui";
import { colors, fonts } from "@/theme";

function namedRole(role: unknown) {
  if (typeof role === "string") return role;
  if (role && typeof role === "object" && "name" in role) {
    const name = (role as { name?: unknown }).name;
    return typeof name === "string" ? name : "";
  }
  return "";
}

function orgStatus(application: OrgApplication) {
  if (application.status === "APPROVED" || application.isVerified) return "Đã duyệt";
  if (application.status === "REJECTED") return "Bị từ chối";
  return "Chờ duyệt";
}

export function OrganizationScreen() {
  const { token, user, patchUser } = useSession();
  const [application, setApplication] = useState<OrgApplication | null>(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [note, setNote] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [description, setDescription] = useState("");
  const [operatingArea, setOperatingArea] = useState("");
  const [idCardNumber, setIdCardNumber] = useState("");
  const [evidenceImageUrls, setEvidenceImageUrls] = useState<string[]>([]);

  useEffect(() => {
    if (!token || !user?.id) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    readOrgRequest(user.id)
      .then(async (id) => {
        if (!id) return null;
        const data = await backend.getOrganization(token, id);
        return data.organization;
      })
      .then((next) => {
        if (!cancelled) setApplication(next);
      })
      .catch(() => {
        if (!cancelled && user.id) void writeOrgRequest(user.id, null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token, user?.id]);

  useEffect(() => {
    if (!token || application?.status !== "APPROVED" || user?.role === "ORG_MANAGER") return;
    let cancelled = false;
    backend.myProfile(token).then((profile) => {
      if (cancelled) return;
      if (namedRole(profile.user.role) === "ORG_MANAGER") patchUser({ role: "ORG_MANAGER" });
    }).catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [application?.status, patchUser, token, user?.role]);

  async function uploadEvidence() {
    if (!token) return;
    if (evidenceImageUrls.length >= 10) {
      setNote("Tối đa 10 ảnh minh chứng.");
      return;
    }
    setUploading(true);
    setNote("");
    try {
      const file = await pickImage();
      if (!file) {
        return;
      }
      const uploaded = await backend.uploadOrganizationEvidence(token, [file]);
      const nextUrls = (uploaded.imageUrls ?? []).filter((url) => url && !evidenceImageUrls.includes(url));
      if (nextUrls.length > 0) {
        setEvidenceImageUrls((current) => [...current, ...nextUrls].slice(0, 10));
        setNote(`Đã tải lên ${Math.min(evidenceImageUrls.length + nextUrls.length, 10)} ảnh minh chứng.`);
      } else {
        setNote("Ảnh này đã được đính kèm hoặc máy chủ không trả đường dẫn.");
      }
    } catch (caught) {
      setNote(caught instanceof Error ? caught.message : "Không tải được ảnh minh chứng.");
    } finally {
      setUploading(false);
    }
  }

  async function submit() {
    if (!token || !user?.id) return;
    if (!name.trim() || !code.trim() || !address.trim()) {
      setNote("Vui lòng nhập đủ tên tổ chức, mã tổ chức và địa chỉ.");
      return;
    }
    if (evidenceImageUrls.length === 0) {
      setNote("Vui lòng đính kèm ít nhất 1 ảnh minh chứng trước khi gửi hồ sơ.");
      return;
    }
    setBusy(true);
    setNote("");
    try {
      const data = await backend.createOrganization(token, {
        name: name.trim(),
        code: code.trim(),
        address: address.trim(),
        phone: phone.trim(),
        email: email.trim(),
        description: description.trim(),
        operatingArea: operatingArea.trim(),
        idCardNumber: idCardNumber.trim(),
        evidenceImageUrls,
      });
      await writeOrgRequest(user.id, data.organization._id);
      setApplication(data.organization);
      setEditing(false);
      setNote(data.message);
    } catch (caught) {
      setNote(caught instanceof ApiError ? caught.message : "Không gửi được hồ sơ.");
    } finally {
      setBusy(false);
    }
  }

  if (!user || !token) {
    return (
      <Screen tab="profile">
        <Title>Đăng ký tổ chức</Title>
        <Body>Đăng nhập bằng tài khoản người dùng rồi gửi hồ sơ. Admin duyệt xong, tài khoản được nâng thành quản lý tổ chức.</Body>
        <Button label="Đăng nhập" onPress={() => router.push("/login")} />
      </Screen>
    );
  }

  if (user.role && user.role !== "USER" && user.role !== "ORG_MANAGER") {
    return (
      <Screen tab="profile">
        <Title>Đăng ký tổ chức</Title>
        <Body>Hồ sơ thành lập dành cho người dùng. Admin xem và duyệt trong mục Vận hành.</Body>
        {user.role === "ADMIN" ? <Button label="Hồ sơ chờ duyệt" onPress={() => router.push("/desk/orgs")} /> : null}
      </Screen>
    );
  }

  if (!loading && user.role === "ORG_MANAGER" && !application) {
    return (
      <Screen tab="profile">
        <Title>Bạn đã là quản lý tổ chức</Title>
        <Body>Hồ sơ đã được duyệt. Tạo chiến dịch và trạm trong Vận hành.</Body>
        <Button label="Vận hành" onPress={() => router.push("/desk")} />
      </Screen>
    );
  }

  const pending = application?.status === "PENDING" || (application && !application.status && !application.isVerified);
  const rejected = application?.status === "REJECTED";
  const approved = application?.status === "APPROVED" || application?.isVerified;
  const showForm = !loading && (!application || editing || (!pending && !approved));

  return (
    <Screen tab="profile">
      <Title>Đăng ký tổ chức</Title>
      <Body>Gửi tên, mã, địa chỉ, thông tin người đại diện và ảnh minh chứng. Hồ sơ mới ở trạng thái chờ duyệt. Khi còn một hồ sơ chờ, máy chủ không nhận hồ sơ thứ hai.</Body>
      {loading ? <ActivityIndicator color={colors.primary} /> : null}
      {application && !editing ? (
        <Card>
          <Title>{application.name}</Title>
          <Body>{orgStatus(application)}</Body>
          {application.code ? <Body muted>{application.code}</Body> : null}
          {application.address ? <Body>{application.address}</Body> : null}
          {application.operatingArea ? <Body muted>{application.operatingArea}</Body> : null}
          {application.phone ? <Body muted>{application.phone}</Body> : null}
          {application.email ? <Body muted>{application.email}</Body> : null}
          {application.evidenceImageUrls?.length ? (
            <View style={{ gap: 8 }}>
              <Body muted>{`Ảnh minh chứng (${application.evidenceImageUrls.length})`}</Body>
              {application.evidenceImageUrls.map((url) => (
                <Photo key={url} uri={url} height={160} radius={14} />
              ))}
            </View>
          ) : null}
          {rejected && application.rejectionReason ? <Body>{application.rejectionReason}</Body> : null}
          {pending ? <Body muted>Admin chưa phản hồi. Bạn không cần gửi lại.</Body> : null}
          {approved ? <Body>Tài khoản đã được nâng thành quản lý tổ chức. Mở Vận hành để tạo chiến dịch và trạm.</Body> : null}
          {approved ? <Button label="Vận hành" onPress={() => router.push("/desk")} /> : null}
          {rejected ? (
            <Button
              label="Gửi hồ sơ khác"
              tone="ghost"
              onPress={() => {
                setEvidenceImageUrls([]);
                setEditing(true);
              }}
            />
          ) : null}
        </Card>
      ) : null}
      {showForm ? (
        <Card>
          <Field label="Tên tổ chức" value={name} onChangeText={setName} autoCapitalize="words" />
          <Field label="Mã tổ chức" value={code} onChangeText={setCode} autoCapitalize="characters" />
          <Body muted>Mã viết liền, không dấu. Ví dụ ANHDUONG2026.</Body>
          <Field label="Địa chỉ" value={address} onChangeText={setAddress} autoCapitalize="sentences" />
          <Field label="Số điện thoại" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" />
          <Field label="Mô tả" value={description} onChangeText={setDescription} autoCapitalize="sentences" multiline />
          <Field label="Khu vực hoạt động" value={operatingArea} onChangeText={setOperatingArea} autoCapitalize="sentences" />
          <Field label="CCCD người đại diện" value={idCardNumber} onChangeText={setIdCardNumber} keyboardType="number-pad" />
          <View style={{ gap: 8 }}>
            <Text style={{ fontFamily: fonts.medium, fontSize: 13, color: colors.muted }}>Hình ảnh minh chứng (bắt buộc)</Text>
            <Body muted>Đính kèm 1–10 ảnh giấy phép hoạt động, quyết định thành lập hoặc CCCD người đại diện (JPEG, PNG, WebP).</Body>
            {evidenceImageUrls.map((url, index) => (
              <View key={url} style={{ gap: 6 }}>
                <Photo uri={url} height={160} radius={14} />
                <Tap
                  onPress={() => setEvidenceImageUrls((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                  accessibilityLabel="Xóa ảnh minh chứng"
                  style={{ alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 4, minHeight: 32 }}
                >
                  <Icon name="delete-outline" size={18} color={colors.error} />
                  <Text style={{ fontFamily: fonts.semibold, fontSize: 13, color: colors.error }}>{`Xóa ảnh #${index + 1}`}</Text>
                </Tap>
              </View>
            ))}
            <Button
              label={uploading ? "Đang tải ảnh..." : evidenceImageUrls.length > 0 ? `Thêm ảnh minh chứng (${evidenceImageUrls.length}/10)` : "Tải ảnh minh chứng"}
              tone="ghost"
              icon="add-photo-alternate"
              disabled={busy || uploading || evidenceImageUrls.length >= 10}
              onPress={() => void uploadEvidence()}
            />
            <Body muted>
              {evidenceImageUrls.length === 0
                ? "Chưa có ảnh minh chứng. Cần tải lên ít nhất 1 ảnh trước khi gửi hồ sơ."
                : `Đã đính kèm ${evidenceImageUrls.length} ảnh minh chứng.`}
            </Body>
          </View>
          <Button
            label={busy ? "Đang gửi" : "Gửi hồ sơ"}
            disabled={busy || uploading || !name.trim() || !code.trim() || !address.trim() || evidenceImageUrls.length === 0}
            onPress={() => void submit()}
          />
        </Card>
      ) : null}
      {note ? <Body>{note}</Body> : null}
    </Screen>
  );
}
