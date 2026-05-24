# Automation Rules

Tài liệu này ghi lại cơ sở đặt rule điều khiển thiết bị để có thể giải thích khi demo hoặc bảo vệ.

## Nguyên tắc triển khai

Hệ thống dùng `rule-based control`:

- Ngưỡng môi trường lấy từ `PlantProfile` của từng cây trồng.
- Mỗi `Device` được liên kết với một sensor và một hướng trigger:
  - `below_min`: chỉ chạy khi số đo thấp hơn ngưỡng tối thiểu.
  - `above_max`: chỉ chạy khi số đo vượt ngưỡng tối đa.
  - `both`: chạy ở cả hai hướng.
- Thiết bị auto chỉ bật trong `timeout_seconds`, sau đó task nền tự tắt để tránh thiết bị chạy mãi.

## Rule khuyến nghị

| Sensor | Điều kiện | Thiết bị nên liên kết | Cơ sở |
| --- | --- | --- | --- |
| Nhiệt độ | `above_max` | Quạt thông gió / quạt hút | Thông gió cơ học bằng quạt là cách phổ biến để kiểm soát nhiệt độ cao trong nhà kính. |
| Nhiệt độ | `below_min` | Máy sưởi | Bộ điều khiển nhiệt độ nhà kính thường dùng ngưỡng thấp để kích hoạt hệ thống sưởi. |
| Độ ẩm đất | `below_min` | Bơm tưới / van tưới | Mô hình WSAN trong nông nghiệp dùng cảm biến độ ẩm đất và actuator/valve để điều tiết tưới. |
| Ánh sáng | `below_min` | Đèn bổ sung | Điều khiển môi trường nhà kính có thể phối hợp thêm thiết bị chiếu sáng theo điều kiện cây trồng. |
| CO2 | `below_min` | Bộ bổ sung CO2 | Hệ thống điều khiển nhà kính có thể phối hợp CO2 theo nồng độ khí trong khu vực trồng. |

## Về thời gian bật/tắt

Không nên coi một con số cố định là đúng cho mọi farm. Thời gian chạy phụ thuộc vào diện tích nhà kính, công suất quạt/bơm/máy sưởi, loại cây trồng và độ lệch ngưỡng.

Trong hệ thống này, `timeout_seconds` là thời gian chạy một chu kỳ auto. Người vận hành cấu hình giá trị này khi thêm thiết bị. Sau mỗi chu kỳ, cảm biến tiếp tục sinh số đo; nếu điều kiện vẫn còn vi phạm, rule engine có thể kích hoạt lại ở vòng kiểm tra sau.

## Nguồn tham khảo

- Soussi, A. et al. (2024), "Smart Sensors and Smart Data for Precision Agriculture: A Review", Sensors 24(8):2647. https://www.mdpi.com/1424-8220/24/8/2647
- UF/IFAS Extension, "Greenhouse Ventilation". https://ask.ifas.ufl.edu/publication/AE030
- University of Alaska Fairbanks Cooperative Extension, "Controlling the Greenhouse Environment". https://www.uaf.edu/ces/publications/database/gardening/controlling-greenhouse-environment.php
