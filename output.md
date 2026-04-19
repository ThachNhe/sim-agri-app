# AgriSmart - Main Use Cases và Biểu đồ PlantUML

Tài liệu này liệt kê các use case chính đang có trong codebase hiện tại. Biểu đồ hoạt động và biểu đồ tuần tự được giản lược để tập trung vào luồng chính, còn các nhánh phụ được mô tả ngắn trong nội dung.

## Danh sách use case chính

| ID | Use case | Actor chính | Mô tả ngắn |
|---|---|---|---|
| UC01 | Đăng nhập hệ thống | Nông dân, Quản trị viên | Xác thực tài khoản, tạo phiên bằng cookie HttpOnly |
| UC02 | Đăng xuất hệ thống | Nông dân, Quản trị viên | Kết thúc phiên, xóa cookie và trả về màn đăng nhập |
| UC03 | Xem dashboard theo farm | Nông dân, Quản trị viên | Xem thống kê, biểu đồ cảm biến, cảnh báo nhanh; admin chọn farm để xem dữ liệu tương ứng |
| UC04 | Quản lý thiết bị theo farm | Nông dân, Quản trị viên | Xem danh sách thiết bị; farmer có thể thêm/sửa/xóa, admin chỉ xem/sửa/xóa theo farm |
| UC05 | Quản lý cảnh báo theo farm | Nông dân, Quản trị viên | Farmer xem danh sách cảnh báo; admin xem thống kê cảnh báo theo farm |
| UC06 | Đánh dấu cảnh báo đã đọc | Nông dân | Đánh dấu alert là đã đọc và cập nhật giao diện |
| UC07 | Xuất báo cáo CSV cảm biến | Nông dân | Tải báo cáo nhanh từ dữ liệu cảm biến đang xem |
| UC08 | Quản lý farmer | Quản trị viên | Xem danh sách farmer, tạo farmer mới, khóa/mở khóa tài khoản |

## UC01 - Đăng nhập hệ thống

### Bản đồ use case

```plantuml
@startuml UC_DangNhap
left to right direction

actor "Người dùng" as U

usecase "Đăng nhập" as UC1
usecase "Nhập email\nvà mật khẩu" as UC2
usecase "Tạo session\n(cookie HttpOnly)" as UC3
usecase "Xem lỗi xác thực" as UC4

U --> UC1
UC1 ..> UC2 : <<include>>
UC1 ..> UC3 : <<include>>
UC4 ..> UC1 : <<extend>>
@enduml
```

### Biểu đồ hoạt động

```plantuml
@startuml Act_DangNhap
start
:Nhập email và mật khẩu;
if (Dữ liệu hợp lệ?) then (Có)
  :Gửi yêu cầu đăng nhập;
  if (Xác thực thành công?) then (Có)
    :Tạo access/refresh token;
    :Lưu cookie HttpOnly;
    :Điều hướng vào hệ thống;
  else (Không)
    :Hiển thị lỗi xác thực;
  endif
else (Không)
  :Báo lỗi form;
endif
stop
@enduml
```

### Biểu đồ tuần tự

```plantuml
@startuml Seq_DangNhap
actor "Người dùng" as U
participant "Frontend" as FE
participant "Backend /auth" as BE
database "Database" as DB

U -> FE : Nhập email và mật khẩu
FE -> BE : POST /auth/login
BE -> DB : Tìm user theo email
DB --> BE : Thông tin user
BE -> BE : Kiểm tra mật khẩu và trạng thái
BE --> FE : Trả user + set cookies
FE --> U : Điều hướng dashboard
@enduml
```

## UC02 - Đăng xuất hệ thống

### Bản đồ use case

```plantuml
@startuml UC_DangXuat
left to right direction

actor "Người dùng" as U

usecase "Đăng xuất" as UC1
usecase "Xóa cookie phiên" as UC2
usecase "Xóa trạng thái đăng nhập" as UC3
usecase "Điều hướng về\n/màn đăng nhập" as UC4

U --> UC1
UC1 ..> UC2 : <<include>>
UC1 ..> UC3 : <<include>>
UC1 ..> UC4 : <<include>>
@enduml
```

### Biểu đồ hoạt động

```plantuml
@startuml Act_DangXuat
start
:Người dùng bấm nút Đăng xuất;
:Frontend gọi API đăng xuất;
:Backend xóa cookie phiên;
:Xóa thông tin user trong store;
:Chuyển về màn đăng nhập;
stop
@enduml
```

### Biểu đồ tuần tự

```plantuml
@startuml Seq_DangXuat
actor "Người dùng" as U
participant "Frontend" as FE
participant "Backend /auth" as BE

U -> FE : Bấm Đăng xuất
FE -> BE : POST /auth/logout
BE --> FE : Xóa cookies + success
FE -> FE : Clear auth store
FE --> U : Điều hướng /login
@enduml
```

## UC03 - Xem dashboard theo farm

### Bản đồ use case

```plantuml
@startuml UC_Dashboard
left to right direction

actor "Nông dân" as F
actor "Quản trị viên" as A

usecase "Xem dashboard" as UC1
usecase "Chọn farm" as UC2
usecase "Xem thống kê tổng hợp" as UC3
usecase "Xem biểu đồ cảm biến" as UC4
usecase "Xem cảnh báo nhanh" as UC5

F --> UC1
A --> UC1
A --> UC2
UC1 ..> UC3 : <<include>>
UC1 ..> UC4 : <<include>>
UC1 ..> UC5 : <<include>>
UC1 ..> UC2 : <<extend>>
@enduml
```

### Biểu đồ hoạt động

```plantuml
@startuml Act_Dashboard
start
if (Admin?) then (Có)
  :Chọn farm;
endif
:Frontend gọi API summary và devices;
if (Có thiết bị cảm biến?) then (Có)
  :Lấy readings theo thiết bị/ngày;
  :Vẽ biểu đồ cảm biến;
else (Không)
  :Hiển thị trạng thái rỗng;
endif
:Hiển thị số liệu tổng hợp và thẻ cảnh báo;
stop
@enduml
```

### Biểu đồ tuần tự

```plantuml
@startuml Seq_Dashboard
actor "Người dùng" as U
participant "Frontend" as FE
participant "Backend" as BE
database "Database" as DB

U -> FE : Mở dashboard
FE -> BE : GET /dashboard/summary?owner_id=...
BE -> DB : Tổng hợp thiết bị, cảnh báo, readings
DB --> BE : Kết quả tổng hợp
BE --> FE : Dashboard summary
FE -> BE : GET /devices?owner_id=...
BE -> DB : Lấy thiết bị theo farm
DB --> BE : Danh sách thiết bị
BE --> FE : Danh sách thiết bị
FE -> BE : GET /readings?device_id&from_date&to_date
BE -> DB : Lấy dữ liệu cảm biến
DB --> BE : Readings
BE --> FE : Readings
alt Nông dân
  FE -> BE : GET /alerts/summary
  FE -> BE : GET /alerts?limit=3
  BE --> FE : Thống kê + cảnh báo gần đây
else Quản trị viên
  FE -> FE : Hiển thị theo farm đã chọn
end
FE --> U : Hiển thị dashboard
@enduml
```

## UC04 - Quản lý thiết bị theo farm

### Bản đồ use case

```plantuml
@startuml UC_ThietBi
left to right direction

actor "Nông dân" as F
actor "Quản trị viên" as A

usecase "Xem danh sách thiết bị" as UC1
usecase "Chọn farm" as UC2
usecase "Thêm thiết bị" as UC3
usecase "Sửa thiết bị" as UC4
usecase "Xóa thiết bị" as UC5

F --> UC1
F --> UC3
F --> UC4
F --> UC5

A --> UC1
A --> UC2
A --> UC4
A --> UC5

UC1 ..> UC2 : <<extend>>
@enduml
```

### Biểu đồ hoạt động

```plantuml
@startuml Act_ThietBi
start
if (Admin?) then (Có)
  :Chọn farm;
endif
:Hiển thị danh sách thiết bị;
if (Chọn thao tác?) then (Có)
  if (Thêm) then (Farmer)
    :Nhập thông tin thiết bị;
    :Gửi yêu cầu tạo mới;
  else if (Sửa) then (Có)
    :Chỉnh sửa thông tin;
    :Gửi yêu cầu cập nhật;
  else (Xóa)
    :Xác nhận xóa;
    :Gửi yêu cầu xóa;
  endif
endif
stop
@enduml
```

### Biểu đồ tuần tự

```plantuml
@startuml Seq_ThietBi
actor "Người dùng" as U
participant "Frontend" as FE
participant "Backend /devices" as BE
database "Database" as DB

U -> FE : Mở trang thiết bị
FE -> BE : GET /devices?owner_id=...
BE -> DB : Lấy danh sách thiết bị theo farm
DB --> BE : Danh sách thiết bị
BE --> FE : Render danh sách
alt Thêm thiết bị (Farmer)
  FE -> BE : POST /devices
  BE -> DB : Tạo thiết bị mới
  DB --> BE : Thiết bị mới
  BE --> FE : Kết quả thêm mới
else Sửa thiết bị
  FE -> BE : PUT /devices/{device_id}
  BE -> DB : Cập nhật thiết bị
  DB --> BE : Thiết bị đã cập nhật
  BE --> FE : Kết quả cập nhật
else Xóa thiết bị
  FE -> BE : DELETE /devices/{device_id}
  BE -> DB : Xóa thiết bị
  DB --> BE : Xóa thành công
  BE --> FE : Kết quả xóa
end
FE --> U : Cập nhật giao diện
@enduml
```

## UC05 - Quản lý cảnh báo theo farm

### Bản đồ use case

```plantuml
@startuml UC_CanhBao
left to right direction

actor "Nông dân" as F
actor "Quản trị viên" as A

usecase "Xem cảnh báo" as UC1
usecase "Xem thống kê cảnh báo" as UC2
usecase "Chọn farm" as UC3

F --> UC1
A --> UC2
A --> UC3

UC2 ..> UC3 : <<include>>
@enduml
```

### Biểu đồ hoạt động

```plantuml
@startuml Act_CanhBao
start
if (Admin?) then (Có)
  :Chọn farm;
  :Lấy thống kê cảnh báo;
  :Hiển thị tổng / đã đọc / chưa đọc;
else (Không)
  :Lấy danh sách cảnh báo;
  :Hiển thị card cảnh báo gọn;
endif
stop
@enduml
```

### Biểu đồ tuần tự

```plantuml
@startuml Seq_CanhBao
actor "Người dùng" as U
participant "Frontend" as FE
participant "Backend /alerts" as BE
database "Database" as DB

U -> FE : Mở trang cảnh báo
alt Quản trị viên
  FE -> BE : GET /alerts/summary?owner_id=...
  BE -> DB : Đếm cảnh báo theo farm
  DB --> BE : Số liệu thống kê
  BE --> FE : Alert summary
else Nông dân
  FE -> BE : GET /alerts?limit=12
  BE -> DB : Lấy danh sách cảnh báo
  DB --> BE : Danh sách cảnh báo
  BE --> FE : Danh sách cảnh báo
end
FE --> U : Hiển thị dữ liệu cảnh báo
@enduml
```

## UC06 - Đánh dấu cảnh báo đã đọc

### Bản đồ use case

```plantuml
@startuml UC_DanhDauDoc
left to right direction

actor "Nông dân" as F

usecase "Đánh dấu cảnh báo đã đọc" as UC1
usecase "Chọn cảnh báo" as UC2
usecase "Cập nhật trạng thái đọc" as UC3

F --> UC1
UC1 ..> UC2 : <<include>>
UC1 ..> UC3 : <<include>>
@enduml
```

### Biểu đồ hoạt động

```plantuml
@startuml Act_DanhDauDoc
start
:Farmer bấm nút Đã đọc;
:Frontend gửi yêu cầu cập nhật;
:Backend kiểm tra quyền sở hữu cảnh báo;
if (Hợp lệ?) then (Có)
  :Cập nhật is_read = true;
  :Trả kết quả thành công;
else (Không)
  :Thông báo không tồn tại hoặc không có quyền;
endif
stop
@enduml
```

### Biểu đồ tuần tự

```plantuml
@startuml Seq_DanhDauDoc
actor "Nông dân" as F
participant "Frontend" as FE
participant "Backend /alerts" as BE
database "Database" as DB

F -> FE : Bấm Đã đọc
FE -> BE : PATCH /alerts/{alert_id}/read
BE -> DB : Kiểm tra alert thuộc farm của user
DB --> BE : Alert hợp lệ
BE -> DB : Update is_read = true
DB --> BE : Alert đã cập nhật
BE --> FE : Trả alert đã cập nhật
FE --> F : Cập nhật giao diện
@enduml
```

## UC07 - Xuất báo cáo CSV cảm biến

### Bản đồ use case

```plantuml
@startuml UC_ExportCSV
left to right direction

actor "Nông dân" as F

usecase "Xuất báo cáo CSV" as UC1
usecase "Chọn thiết bị" as UC2
usecase "Chọn ngày" as UC3
usecase "Tổng hợp dữ liệu cảm biến" as UC4
usecase "Tải file CSV" as UC5

F --> UC1
UC1 ..> UC2 : <<include>>
UC1 ..> UC3 : <<include>>
UC1 ..> UC4 : <<include>>
UC1 ..> UC5 : <<include>>
@enduml
```

### Biểu đồ hoạt động

```plantuml
@startuml Act_ExportCSV
start
:Chọn thiết bị và ngày;
:Frontend lấy readings;
if (Có dữ liệu?) then (Có)
  :Tính thống kê nhanh;
  :Sinh file CSV;
  :Tải file về máy;
else (Không)
  :Hiển thị không có dữ liệu;
endif
stop
@enduml
```

### Biểu đồ tuần tự

```plantuml
@startuml Seq_ExportCSV
actor "Nông dân" as F
participant "Frontend" as FE
participant "Backend /readings" as BE
database "Database" as DB

F -> FE : Chọn thiết bị và ngày
FE -> BE : GET /readings?device_id&from_date&to_date
BE -> DB : Lấy dữ liệu cảm biến
DB --> BE : Danh sách readings
BE --> FE : Readings
FE -> FE : Tính trung bình / min / max
FE -> FE : Tạo CSV và tải xuống
FE --> F : File CSV được tải về
@enduml
```

## UC08 - Quản lý farmer

### Bản đồ use case

```plantuml
@startuml UC_QuanLyFarmer
left to right direction

actor "Quản trị viên" as A

usecase "Quản lý farmer" as UC0
usecase "Xem danh sách farmer" as UC1
usecase "Tạo farmer mới" as UC2
usecase "Khóa/Mở khóa farmer" as UC3

A --> UC0
UC0 ..> UC1 : <<include>>
UC0 ..> UC2 : <<include>>
UC0 ..> UC3 : <<include>>
@enduml
```

### Biểu đồ hoạt động

```plantuml
@startuml Act_QuanLyFarmer
start
:Admin mở trang người dùng;
:Hệ thống tải danh sách farmer;
if (Tạo mới?) then (Có)
  :Nhập họ tên và email;
  :Gửi yêu cầu tạo farmer;
elseif (Khóa/Mở khóa?) then (Có)
  :Chọn người dùng;
  :Gửi yêu cầu đổi trạng thái;
endif
stop
@enduml
```

### Biểu đồ tuần tự

```plantuml
@startuml Seq_QuanLyFarmer
actor "Quản trị viên" as A
participant "Frontend" as FE
participant "Backend /admin" as BE
database "Database" as DB
participant "MailHog/Email" as M

A -> FE : Mở trang farmer
FE -> BE : GET /admin/users
BE -> DB : Lấy danh sách farmer
DB --> BE : Danh sách farmer
BE --> FE : Danh sách farmer

alt Tạo farmer
  FE -> BE : POST /admin/users
  BE -> DB : Tạo user role=farmer
  DB --> BE : Farmer mới
  BE -> M : Gửi mật khẩu tạm thời
  M --> BE : Email đã gửi
  BE --> FE : Farmer mới
else Khóa/Mở khóa
  FE -> BE : PATCH /admin/users/{id}/status
  BE -> DB : Cập nhật trạng thái
  DB --> BE : User đã cập nhật
  BE --> FE : User đã cập nhật
end
FE --> A : Hiển thị kết quả
@enduml
```

## Ghi chú

- Use case `Chọn farm` là thao tác nền cho admin ở dashboard, devices và alerts; nó không tách riêng thành một use case chính để tránh lặp.
- Các biểu đồ hoạt động và tuần tự ở đây được viết đơn giản hóa để dễ đọc trong báo cáo đồ án.
- `Xuất báo cáo CSV` là chức năng client-side: dữ liệu được lấy từ API đọc cảm biến, sau đó frontend tự tổng hợp và tải file.
