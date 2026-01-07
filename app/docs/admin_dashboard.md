# Hướng dẫn tích hợp Firebase cho Alpha Competitions

Để quản lý các giải đấu (Competitions) cho các Token Alpha, việc sử dụng **Firebase Firestore** (NoSQL) là lựa chọn tối ưu nhất cho cá nhân quản lý. Dưới đây là kiến trúc đề xuất:

## 1. Cấu trúc Database (Firestore)

Tôi đề xuất tạo một Collection tên là `competitions`. Mỗi tài liệu (document) sẽ dùng chính `alphaId` của token làm ID để dễ dàng truy vấn và đồng bộ.

### Collection: `competitions`
| Trường (Field) | Kiểu dữ liệu | Mô tả |
| :--- | :--- | :--- |
| `alphaId` | String | ID duy nhất từ Binance (Dùng làm Doc ID) |
| `symbol` | String | Ký hiệu token (VD: SOL) |
| `name` | String | Tên token |
| `iconUrl` | String | Link ảnh token |
| `startTime` | Timestamp | Thời gian bắt đầu giải đấu |
| `endTime` | Timestamp | Thời gian kết thúc giải đấu |
| `createdAt` | Timestamp | Thời gian tạo bản ghi |
| `updatedAt` | Timestamp | Thời gian cập nhật cuối |
| `isLive` | Boolean | Trạng thái thủ công hoặc logic check |

---

## 2. Quy trình Save Data (Action Flow)

1.  **Click Token:** Mở Modal lấy thông tin từ dòng đã chọn.
2.  **Input:** Người dùng chọn Ngày/Giờ Bắt đầu và Ngày/Giờ Kết thúc (Sử dụng `<input type="datetime-local" />`).
3.  **Validate:** Kiểm tra `endTime` phải lớn hơn `startTime`.
4.  **Confirm:** Khi nhấn Save, gọi hàm `setDoc` của Firestore:
    ```javascript
    await setDoc(doc(db, "competitions", token.alphaId), {
      ...tokenData,
      startTime: Timestamp.fromDate(new Date(selectedStart)),
      endTime: Timestamp.fromDate(new Date(selectedEnd)),
      updatedAt: serverTimestamp()
    });
    ```

---

## 3. Cách hiển thị Status Competition

Chúng ta cần so sánh thời gian hiện tại (`now`) với `startTime` và `endTime` để hiển thị trạng thái động:

*   **Sắp diễn ra (Upcoming):** `now < startTime`
*   **Đang diễn ra (Live):** `startTime <= now <= endTime`
*   **Đã kết thúc (Ended):** `now > endTime`
*   **Không có giải:** Nếu Token không tồn tại trong Firestore.

---

## 4. Cách Load dữ liệu hiệu quả

Để tránh việc mỗi dòng trong bảng phải gọi API riêng (gây tốn tài nguyên), chúng ta nên:
1.  Load toàn bộ Collection `competitions` một lần duy nhất khi vào trang Admin.
2.  Lưu vào một Object/Map trong State: `{ "alphaId_123": { data }, ... }`.
3.  Khi render bảng Token từ Binance, chỉ cần check nhanh: `competitionData[token.alphaId]`.

---

# Kế hoạch thực hiện tiếp theo:
1.  **UI Popup:** Tạo giao diện Modal "Check-in Competition" với các trường chọn thời gian.
2.  **Firebase Setup:** Hướng dẫn bạn lấy mã config từ Firebase Console để dán vào project.
3.  **Integration:** Viết logic Map dữ liệu từ Firebase vào bảng danh sách Token.
