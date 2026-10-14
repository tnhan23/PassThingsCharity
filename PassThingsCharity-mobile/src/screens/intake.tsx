import { router } from "expo-router";
import { ActivityIndicator, Text, View } from "react-native";
import { Screen } from "@/components/chrome";
import { Body, Button, Card, Eyebrow, LineItem, Meter, Photo, Title } from "@/components/ui";
import { colors, fonts, photos } from "@/theme";

export function IntakeScreen({
  state,
}: {
  state: "review" | "accepted" | "rejected" | "guest" | "failed" | "loading" | "empty";
}) {
  if (state === "loading") {
    return (
      <Screen tab="stations">
        <Card>
          <ActivityIndicator color={colors.primary} />
          <Title>Đang mở quầy</Title>
          <Body muted>Chưa hiện kiện trên bàn khi ca chưa đồng bộ.</Body>
        </Card>
        <Button label="Xem quầy đã mở" onPress={() => router.replace("/intake/review")} />
      </Screen>
    );
  }
  if (state === "empty") {
    return (
      <Screen tab="stations">
        <Title>Bàn cân trống</Title>
        <Body>Ca sáng chưa có kiện nào. Số chiến dịch không đổi cho đến khi có dòng được ký.</Body>
        <Button label="Xem kiện mẫu" onPress={() => router.push("/intake/review")} />
      </Screen>
    );
  }
  if (state === "guest") {
    return (
      <Screen tab="stations">
        <Eyebrow>Khách tại quầy · không có tài khoản</Eyebrow>
        <Title>Đã nhận 6,0 kg</Title>
        <Body>Người mang đồ không để số điện thoại. Dòng này vào sổ chiến dịch. Cột điểm để trống.</Body>
        <LineItem title="Áo khoác trẻ em" detail="Sạch, khô, đúng mùa" amount="6,0 kg" ok />
        <Card>
          <Body muted>Nếu sau này họ đăng nhập cùng số điện thoại, điểm của lần này vẫn không tự cộng vì lúc ký không có tài khoản.</Body>
        </Card>
        <Button label="Về quầy" onPress={() => router.push("/intake/review")} />
      </Screen>
    );
  }
  if (state === "failed") {
    return (
      <Screen tab="stations">
        <Eyebrow>Chưa vào sổ</Eyebrow>
        <Title>Ký nhận bị đứt mạng</Title>
        <Body>8,5 kg vẫn nằm trên bàn. Chiến dịch chưa cộng số này. Hãy ký lại khi quầy có mạng, đừng ghi tay rồi cộng sau.</Body>
        <Button label="Ký lại" onPress={() => router.push("/intake/accepted")} />
        <Button label="Ở lại màn đối soát" tone="ghost" onPress={() => router.push("/intake/review")} />
      </Screen>
    );
  }
  if (state === "accepted") {
    return (
      <Screen tab="stations">
        <Eyebrow>Kiện #DN-2025-0894 · Lê Mai Anh</Eyebrow>
        <Title>Đã ghi nhận 8,5 kg đạt</Title>
        <Body>1,5 kg loại không cộng vào chiến dịch và không cộng điểm.</Body>
        <Meter value={348.5} max={500} unit="kg áo ấm" label="Đã nhận của chiến dịch Hà Giang. Điều phối sau này không cộng thêm vào số này." />
        <Card>
          <Text style={{ fontFamily: fonts.bold, fontSize: 16, color: colors.primary }}>+85 điểm đóng góp</Text>
          <Body muted>Chỉ tính trên 8,5 kg đã nhận. Tài khoản Lê Mai Anh.</Body>
        </Card>
        <Button label="Xem biên lai" onPress={() => router.push("/receipt/done")} />
        <Button label="Về quầy" tone="ghost" onPress={() => router.push("/intake/review")} />
      </Screen>
    );
  }
  if (state === "rejected") {
    return (
      <Screen tab="stations">
        <Eyebrow>Cảnh báo chất lượng · #DN-2025-0894</Eyebrow>
        <Title>1,5 kg không đạt</Title>
        <Body>Phần rách, mốc không vào kho chiến dịch. Điểm đóng góp của phần này là 0.</Body>
        <LineItem title="Áo khoác và len" detail="Sạch, đạt" amount="5,0 kg" ok />
        <LineItem title="Quần dài" detail="Sạch, đạt" amount="3,5 kg" ok />
        <LineItem title="Rách, ố mốc" detail="Lý do: rách lớn, ẩm mốc" amount="1,5 kg" ok={false} />
        <Card>
          <Eyebrow>Xử lý phần loại</Eyebrow>
          <Body>Người mang đồ có thể nhận lại trong 48 giờ. Hết hạn, trạm chuyển tái chế.</Body>
        </Card>
        <Button label="Xác nhận nhận 8,5 kg" onPress={() => router.push("/intake/accepted")} />
        <Button label="Biên lai từ chối" tone="ghost" onPress={() => router.push("/receipt/rejected")} />
      </Screen>
    );
  }
  return (
    <Screen tab="stations">
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Body muted>Trạm Đa Kao · Ca sáng</Body>
        <Text style={{ fontFamily: fonts.semibold, color: colors.secondary }}>03 kiện trên bàn</Text>
      </View>
      <Card>
        <Eyebrow>Đang đối soát #DN-2025-0894</Eyebrow>
        <Title>Nguyễn Nhật Huy</Title>
        <Body muted>Nhân viên tiếp nhận · ST-042 · 14/17 kiện</Body>
      </Card>
      <Card>
        <Text style={{ fontFamily: fonts.semibold, fontSize: 16 }}>Người trao: Lê Mai Anh</Text>
        <Body muted>Có tài khoản. Khách không tài khoản vẫn ghi nhận được, điểm để trống.</Body>
      </Card>
      <Photo uri={photos.coats} height={180} radius={16} />
      <Card>
        <Eyebrow>Cân thực tế · tổng 10,0 kg</Eyebrow>
        <LineItem title="Áo khoác và len" detail="Đạt" amount="5,0 kg" ok />
        <LineItem title="Quần dài" detail="Đạt" amount="3,5 kg" ok />
        <LineItem title="Rách, ố mốc" detail="Từ chối" amount="1,5 kg" ok={false} />
      </Card>
      <Card style={{ backgroundColor: colors.primarySoft }}>
        <Body>Sau khi xác nhận, 8,5 kg cộng vào đã nhận của chiến dịch Áo ấm Hà Giang. 1,5 kg không cộng.</Body>
      </Card>
      <Button label="Xác nhận 8,5 kg đạt / 1,5 kg loại" onPress={() => router.push("/intake/accepted")} />
      <Button label="Xem chi tiết phần loại" tone="ghost" onPress={() => router.push("/intake/rejected")} />
      <Button label="Khách không tài khoản" tone="ghost" onPress={() => router.push("/intake/guest")} />
      <Button label="Ký sổ bị lỗi mạng" tone="ghost" onPress={() => router.push("/intake/failed")} />
      <Button label="Đang cân, chưa ký" tone="ghost" onPress={() => router.push("/receipt/pending")} />
      <Button label="Bàn cân trống" tone="ghost" onPress={() => router.push("/intake/empty")} />
    </Screen>
  );
}
