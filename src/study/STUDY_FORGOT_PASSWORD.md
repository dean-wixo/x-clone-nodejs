# Flow: Forgot Password

## Tổng quan (nhìn từ phía User)

1. User click "Quên mật khẩu"
2. User được redirect đến trang `/forgot-password`
3. User nhập email và gửi lên `POST /forgot-password`
4. BE tìm user theo email trong DB, nếu tồn tại → gửi email chứa link reset về cho user:
   ```
   https://yourapp.com/reset-password?token=eyJhbGci...
   ```
5. User click link → được redirect đến trang `/reset-password` trên FE, token nằm sẵn trên URL
6. User điền mật khẩu mới + xác nhận, bấm Submit
7. FE gửi `POST /reset-password` với `{ forgot_password_token, password, confirm_password }`

---

## Chi tiết BE — 2 giai đoạn, 2 API

### Giai đoạn 1: `POST /forgot-password`

- FE gửi `email` lên BE*/reset-password*
- BE kiểm tra email có tồn tại trong DB không
  - Không tìm thấy → trả lỗi `404`
  - Tìm thấy → ký JWT `signForgotPasswordToken`, lưu token vào field `forgot_password_token` của user trong DB
- BE gửi email chứa link reset kèm token đến user

### Giai đoạn 2: `POST /reset-password`

- User click link trong email → FE đọc token từ URL
- User điền mật khẩu mới và xác nhận
- FE gửi lên: `{ forgot_password_token, password, confirm_password }`
- BE xử lý theo thứ tự:
  1. Verify JWT của `forgot_password_token` (còn hạn không?)
  2. Decode token → lấy `user_id`
  3. Tìm user trong DB, kiểm tra `forgot_password_token` trong DB có khớp với token FE gửi lên không
  4. Hash mật khẩu mới → ghi đè `password` cũ trong DB
  5. Xóa `forgot_password_token` (set về `""`) — token chỉ dùng được một lần
