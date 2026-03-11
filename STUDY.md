# 📚 Ghi chú học Node.js

---

## 📬 Điều gì xảy ra khi gọi POST /users/register?

```
Request → Router → Middleware (Validator) → Controller → Service → Database
                                                                       ↓
Response ←←←←←←←←←←←←←←←←←←←←←←←←←←←← Controller ←← tokens ←←←←←
```

---

## Bước 1 — Router (`users.routes.ts`)

```ts
userRouters.post('/register', registerValidator, registerController)
```

Hãy nghĩ **Router** như một cảnh sát giao thông 🚦. Nó nói:
> *"Khi có ai đó gửi POST đến `/register`, hãy chạy `registerValidator` trước, rồi mới chạy `registerController`."*

Thứ tự rất quan trọng — **middleware luôn chạy trước controller**.

---

## Bước 2 — Middleware / Validator (`users.middlewares.ts`)

```ts
export const registerValidator = validate(checkSchema({ ... }))
```

**Middleware** giống như bảo vệ đứng ở cửa 💂. Trước khi request đến được logic thật sự, nó kiểm tra:

- `email` có đúng định dạng email không?
- `password` có đủ mạnh không?
- `confirm_password` có khớp với `password` không?
- Email này đã tồn tại trong DB chưa?

**Nếu validation thất bại** → bảo vệ chặn lại, trả về `400` ngay lập tức. Controller không bao giờ chạy.

**Nếu validation thành công** → bảo vệ gọi `next()`, nghĩa là *"cho request đi qua"*.

---

## Bước 3 — Controller (`users.controllers.ts`)

```ts
export const registerController = async (req, res) => {
  const result = await usersService.register(req.body)
  return res.json({ message: 'Registration successful', result })
}
```

**Controller** giống như một người quản lý 👔. Nó:

1. Nhận request đã được validate
2. Giao việc thật sự cho **Service**
3. Lấy kết quả và gửi lại dưới dạng JSON

Controller **không tự xử lý logic** — nó chỉ gọi service và trả về response.

---

## Bước 4 — Service (`users.services.ts`)

```ts
async register(payload) {
  const result = await databaseService.users.insertOne(
    new User({ ...payload, password: hashPassword(payload.password) })
  )
  const user_id = result.insertedId.toString()
  const [access_token, refresh_token] = await Promise.all([
    this.signAccessToken(user_id),
    this.signRefreshToken(user_id)
  ])
  return { access_token, refresh_token }
}
```

**Service** là nơi công việc thật sự diễn ra 🔧:

1. **Hash mật khẩu** — không bao giờ lưu mật khẩu dạng plain text
2. **Insert user** vào MongoDB
3. **Lấy ID** của user vừa tạo từ kết quả insert
4. **Tạo 2 token** (chạy song song với `Promise.all`) và trả về

---

## Bước 5 — Hai token là gì?

| Token | Hết hạn | Mục đích |
|---|---|---|
| `access_token` | 15 phút | Xác minh danh tính trong mỗi request |
| `refresh_token` | Không hết hạn (trong code của bạn) | Dùng để lấy `access_token` mới khi hết hạn |

Hãy tưởng tượng như đi công viên giải trí 🎢:
- **Access token** = vòng đeo tay có hạn sử dụng trong ngày
- **Refresh token** = hóa đơn cho phép bạn lấy vòng đeo tay mới

---

## Toàn bộ luồng 🗺️

```
POST /users/register
  { email, password, name, ... }
        │
        ▼
  [Router] ──── điều hướng đến registerValidator + registerController
        │
        ▼
  [Validator] ── kiểm tra tất cả các trường
        │  ✅ hợp lệ            ❌ không hợp lệ
        │                         └──► 400 { errors: {...} }
        ▼
  [Controller] ── gọi usersService.register()
        │
        ▼
  [Service]
    1. hashPassword(password)
    2. insertOne(user) ──────────► [MongoDB] lưu user
    3. signAccessToken(user_id)
    4. signRefreshToken(user_id)
    5. return { access_token, refresh_token }
        │
        ▼
  [Controller] ── res.json({ message, result })
        │
        ▼
  200 { message: "Registration successful", access_token, refresh_token }
```

---

## Các khái niệm chính cần nhớ 🧠

| Khái niệm | Giải thích |
|---|---|
| **Router** | Ánh xạ đường dẫn URL đến các handler tương ứng |
| **Middleware** | Code chạy giữa request và handler |
| **Controller** | Nhận request, gọi service, gửi response |
| **Service** | Chứa business logic (không có HTTP ở đây) |
| **`async/await`** | Cách Node.js xử lý tác vụ chậm (DB, v.v.) mà không bị đơ |
| **JWT tokens** | Chuỗi đã ký dùng để xác minh danh tính |
| **`Promise.all`** | Chạy nhiều tác vụ bất đồng bộ cùng một lúc |

Pattern này (Router → Middleware → Controller → Service) được gọi là **Kiến trúc phân lớp (Layered Architecture)** — đây là pattern phổ biến nhất trong các API Node.js/Express. Bạn đang dùng đúng rồi đó! 🎉
