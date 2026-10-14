# Luồng dữ liệu Pass Đồ

Server trong `PassThingsCharity-server` giữ luồng nghiệp vụ. App ở `PassThingsCharity-mobile` gọi API tại `http://localhost:8080`. Chi tiết cho AI đọc nằm trong `AGENTS.md`.

```mermaid
flowchart TD
  mo[Mở app] --> ds["GET /campaigns"]
  ds --> chu[Trang chủ]
  chu --> ct["GET /campaigns/id"]
  ct --> ts["GET /campaigns/id/stations"]
  ts --> man[Chi tiết chiến dịch]
  chu --> dang{Cần hồ sơ hoặc danh sách trạm}
  dang --> login["POST /auth/login"]
  login --> token[Lưu token 1 giờ]
  token --> list["GET /stations"]
  token --> ho["GET điểm, thành tích, chứng nhận"]
  token --> desk["/desk gọi mọi route còn lại"]
```

Đăng ký là `POST /auth/register` rồi login. Sửa hồ sơ, đổi mật khẩu, xóa tài khoản nằm ở `/account`.

```mermaid
flowchart LR
  ve[Bản vẽ app, server chưa có nghiệp vụ] --> nhan[Tiếp nhận và biên lai]
  ve --> so[Sổ ba cột]
  ve --> chuyen[Điều chuyển]
  ve --> giao[Phân phối]
  ve --> ca[Tình nguyện, QR, ca]
  ve --> khac[OTP, hộp thư, phiếu nhận]
```

Sơ đồ dưới là các màn app tự vẽ. Server chưa có các nghiệp vụ đó, nên không sửa API cho khớp màn.
