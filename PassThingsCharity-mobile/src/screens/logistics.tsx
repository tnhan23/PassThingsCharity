import { router } from "expo-router";
import { Text } from "react-native";
import { Screen } from "@/components/chrome";
import { Body, Button, Card, Eyebrow, LineItem, Title } from "@/components/ui";
import { colors, fonts } from "@/theme";

export function TransferScreen({
  state,
}: {
  state: "create" | "transit" | "received" | "preparing" | "short" | "cancelled" | "loading" | "error" | "empty";
}) {
  if (state === "empty") {
    return (
      <Screen tab="stations">
        <Title>Chưa có lệnh chuyển</Title>
        <Body>Tồn đang giữ vẫn ở từng trạm. Số đã nhận của chiến dịch không đổi vì chưa có hàng rời kho.</Body>
        <Button label="Tạo lệnh" onPress={() => router.push("/transfer/create")} />
      </Screen>
    );
  }
  if (state === "loading") {
    return (
      <Screen tab="stations">
        <Title>Đang tải lệnh chuyển</Title>
        <Body>Chưa hiện tồn kho khi lệnh chưa về. Số đã nhận của chiến dịch không được đoán.</Body>
        <Button label="Xem lệnh đã tải" onPress={() => router.replace("/transfer/create")} />
      </Screen>
    );
  }
  if (state === "error") {
    return (
      <Screen tab="stations">
        <Title>Không tải được lệnh</Title>
        <Body>Đừng xuất kho theo số nhớ. Tồn đang giữ có thể đã đổi.</Body>
        <Button label="Thử lại" onPress={() => router.replace("/transfer/create")} />
      </Screen>
    );
  }
  if (state === "preparing") {
    return (
      <Screen tab="stations">
        <Eyebrow>#TF-2025-042 · đang soạn</Eyebrow>
        <Title>Hàng chưa rời Đa Kao</Title>
        <Body>60 kg áo ấm và 25 thùng mì đã giữ chỗ. Cột đã nhận không đổi. Cột đang giữ cũng chưa đổi cho đến khi xe rời trạm.</Body>
        <Button label="Xuất kho" onPress={() => router.push("/transfer/transit")} />
        <Button label="Hủy lệnh" tone="ghost" onPress={() => router.push("/transfer/cancelled")} />
      </Screen>
    );
  }
  if (state === "short") {
    return (
      <Screen tab="stations">
        <Eyebrow>#TF-2025-042 · nhận thiếu</Eyebrow>
        <Title>Phú Mỹ Hưng thiếu 5 kg</Title>
        <LineItem title="Áo ấm" detail="Xuất 60 kg · nhận 55 kg" amount="-5 kg" ok={false} />
        <LineItem title="Mì gói" detail="Xuất 25 thùng · nhận 25 thùng" amount="Khớp" ok />
        <Card>
          <Body>Đã nhận chiến dịch không tăng. Đang giữ chỉ chuyển 55 kg. 5 kg thiếu lập biên bản, chưa tính là đã giao cho người dân.</Body>
        </Card>
        <Button label="Về lệnh mới" onPress={() => router.push("/transfer/create")} />
      </Screen>
    );
  }
  if (state === "cancelled") {
    return (
      <Screen tab="stations">
        <Eyebrow>#TF-2025-042 · đã hủy</Eyebrow>
        <Title>Lệnh không còn hiệu lực</Title>
        <Body>Hàng ở lại Đa Kao. Không cột nào của chiến dịch thay đổi.</Body>
        <Button label="Tạo lệnh khác" onPress={() => router.push("/transfer/create")} />
      </Screen>
    );
  }
  if (state === "transit") {
    return (
      <Screen tab="stations">
        <Eyebrow>Lệnh #TF-2025-042 · đang giao</Eyebrow>
        <Title>Đa Kao sang Bình Thạnh</Title>
        <Body>40 kg áo ấm và 15 thùng sữa. ETA 15 phút. Số đã nhận của chiến dịch không đổi.</Body>
        <Card>
          <Body muted>Tài xế Nguyễn Văn Hưng · 59P1-492.10 · đang qua Cầu Bông.</Body>
        </Card>
        <Button label="Trạm đích xác nhận nhận hàng" onPress={() => router.push("/transfer/received")} />
      </Screen>
    );
  }
  if (state === "received") {
    return (
      <Screen tab="stations">
        <Eyebrow>#TF-2025-042 · đã nhập kho</Eyebrow>
        <Title>Phú Mỹ Hưng đã nhận đủ</Title>
        <LineItem title="Quần áo ấm" detail="Xuất 60 kg · nhận 60 kg" amount="Khớp" ok />
        <LineItem title="Mì gói" detail="Xuất 25 thùng · nhận 25 thùng" amount="Khớp" ok />
        <Card>
          <Text style={{ fontFamily: fonts.semibold, color: colors.primary }}>Đã nhận chiến dịch: không tăng</Text>
          <Body muted>Đa Kao đang giữ giảm 60 kg. Phú Mỹ Hưng đang giữ tăng 60 kg.</Body>
        </Card>
        <Button label="Tạo lệnh khác" tone="ghost" onPress={() => router.push("/transfer/create")} />
      </Screen>
    );
  }
  return (
    <Screen tab="stations">
      <Eyebrow>Điều phối trong chiến dịch Hà Giang</Eyebrow>
      <Title>Cân tồn giữa các trạm</Title>
      <Body>Chỉ chuyển phần đang giữ. Không cộng vào số đã nhận.</Body>
      <Card>
        <Eyebrow>Trạm Đa Kao · dư</Eyebrow>
        <Body>Áo ấm khả dụng xuất: 120 kg. Mì gói: 45 thùng.</Body>
      </Card>
      <Card>
        <Eyebrow>Trạm Phú Mỹ Hưng · đang thiếu chỗ tập kết</Eyebrow>
        <Body>Đề xuất chuyển 60 kg áo ấm và 25 thùng mì.</Body>
      </Card>
      <Card>
        <Body muted>Xe 51D-892.41 · Lê Tuấn Anh · 14:00–15:30 hôm nay.</Body>
      </Card>
      <Button label="Tạo lệnh và xuất kho" onPress={() => router.push("/transfer/preparing")} />
      <Button label="Chưa có lệnh nào" tone="ghost" onPress={() => router.push("/transfer/empty")} />
    </Screen>
  );
}

export function DistributionScreen({
  state,
}: {
  state: "handover" | "exception" | "done" | "lots" | "loading" | "error" | "empty";
}) {
  if (state === "empty") {
    return (
      <Screen tab="stations">
        <Title>Chưa có đợt giao</Title>
        <Body>Cửa sổ nhận vẫn mở. Cột đã giao đang là 0 vì chưa có biên bản nào được ký.</Body>
        <Button label="Xem các đợt mẫu" onPress={() => router.push("/distribution/lots")} />
      </Screen>
    );
  }
  if (state === "loading") {
    return (
      <Screen tab="stations">
        <Title>Đang tải các đợt giao</Title>
        <Body>Chưa kết luận chiến dịch đã xong khi danh sách đợt chưa về.</Body>
        <Button label="Xem các đợt" onPress={() => router.replace("/distribution/lots")} />
      </Screen>
    );
  }
  if (state === "error") {
    return (
      <Screen tab="stations">
        <Title>Không tải được đợt giao</Title>
        <Body>Đừng ký nhận khi không thấy số xuất kho. Biên bản cũ vẫn lưu tại trạm.</Body>
        <Button label="Thử lại" onPress={() => router.replace("/distribution/lots")} />
      </Screen>
    );
  }
  if (state === "lots") {
    return (
      <Screen tab="stations">
        <Eyebrow>Áo ấm Hà Giang · còn mở</Eyebrow>
        <Title>Ba đợt phân phối</Title>
        <Body>Cột đã giao chỉ tăng khi một đợt được ký. Chiến dịch chưa hoàn tất.</Body>
        <Card>
          <Eyebrow>Đã ký</Eyebrow>
          <Text style={{ fontFamily: fonts.semibold, fontSize: 16 }}>Đợt Đồng Văn · 100 kg</Text>
          <Body muted>Đại diện thôn đã ký. Không có tài khoản.</Body>
        </Card>
        <Card>
          <Eyebrow>Đã ký, có phụ lục</Eyebrow>
          <Text style={{ fontFamily: fonts.semibold, fontSize: 16 }}>Đợt Mèo Vạc · 60 kg khô</Text>
          <Body muted>15 kg ẩm không tính đã giao đủ.</Body>
        </Card>
        <Card>
          <Eyebrow>Đang mở</Eyebrow>
          <Text style={{ fontFamily: fonts.semibold, fontSize: 16 }}>Đợt Nước Min</Text>
          <Body muted>Chưa ký. Bấm vào đây không đóng chiến dịch.</Body>
          <Button label="Mở biên bản đợt này" onPress={() => router.push("/distribution/handover")} />
        </Card>
      </Screen>
    );
  }
  if (state === "exception") {
    return (
      <Screen tab="stations">
        <Eyebrow>Đợt #HG-25-D04 · điểm trường Nước Min</Eyebrow>
        <Title>Lệch 15 kg trên đường</Title>
        <Body>Xuất 520 kg, thực nhận 505 kg. Kiện K-08 rách bạt khi qua dốc.</Body>
        <LineItem title="Quần áo ấm" detail="520 kg xuất · 505 kg khô" amount="-15 kg" ok={false} />
        <LineItem title="Mì tôm" detail="120 thùng" amount="Đủ" ok />
        <LineItem title="Chăn" detail="85 chiếc" amount="Đủ" ok />
        <Card>
          <Body>Phương án đã thống nhất: ký nhận 97,2% hàng khô. 15 kg ướt lập phụ lục, không tính là đã giao đủ.</Body>
        </Card>
        <Button label="Ký biên bản điều chỉnh" onPress={() => router.push("/distribution/done")} />
      </Screen>
    );
  }
  if (state === "done") {
    return (
      <Screen tab="stations">
        <Eyebrow>Biên bản #BB-2025-HG</Eyebrow>
        <Title>Đợt này đã bàn giao</Title>
        <Body>755 kg áo ấm và chăn, 150 thùng lương thực, 320 hộ. Ông Sùng A Tủa đã ký, không cần tài khoản.</Body>
        <Card>
          <Body muted>Chiến dịch vẫn mở cho đến khi hết cửa sổ nhận đồ và các đợt còn lại được giao. Một biên bản không tự đóng cả chiến dịch.</Body>
        </Card>
        <Button label="Báo cáo công khai" onPress={() => router.push("/report/content")} />
      </Screen>
    );
  }
  return (
    <Screen tab="stations">
      <Eyebrow>Mục bàn giao · Áo ấm Hà Giang</Eyebrow>
      <Title>Điểm trường Nước Min</Title>
      <Body>Đại diện: ông Sùng A Tủa, trưởng thôn. Không tạo tài khoản người nhận.</Body>
      <Card>
        <Body>520 kg quần áo · 120 thùng mì · 85 chăn · 30 thùng thuốc.</Body>
      </Card>
      <Button label="Ký nhận đợt này" onPress={() => router.push("/distribution/done")} />
      <Button label="Xem mọi đợt" tone="ghost" onPress={() => router.push("/distribution/lots")} />
      <Button label="Chưa có đợt nào" tone="ghost" onPress={() => router.push("/distribution/empty")} />
      <Button label="Báo lệch số lượng" tone="ghost" onPress={() => router.push("/distribution/exception")} />
    </Screen>
  );
}
