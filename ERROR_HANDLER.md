# Express.js Error Handling - Cheat Sheet

## 1. Bản chất của Error Middleware

Khác với middleware thông thường, Error Middleware bắt buộc phải có đủ 4 tham số. Express dựa vào số lượng tham số để phân biệt đây là bộ lọc lỗi.

```ts
// ❌ Middleware thường: (req, res, next)
// ✅ Middleware lỗi: (err, req, res, next)
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ status: 'error', message: err.message })
})
```

> NOTE: luôn đặt Error middleware ở cuối cùng ( dưới cả route và middleware khác)

## 2. Bắt lỗi giữa sync và async middleware

Đây là "bẫy" phổ biến nhất khiến App bị crash.

🔄 Đồng bộ (Synchronous)
Express tự động bắt lỗi. Bạn chỉ việc throw.

```ts
app.get('/test', (req, res) => {
  throw new Error('Lỗi đồng bộ!') // Express tự bắt và chuyển đến Error Middleware
})
```

Asynchornous:
Express4 - bắt buộc phải pass tham số err vào trong hàm next() => next(err)
Express5 - nếu như handler trả về một Promise, thì Express tự động catch rejection

```ts
// Cách 1: Sử dụng Try-Catch (Truyền thống)
app.get('/user', async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
    res.send(user)
  } catch (err) {
    next(err) // BẮT BUỘC phải có next(err)
  }
})

// Cách 2: Express 5.0+ hoặc dùng Promise (Gọn hơn)
app.get('/post', (req, res, next) => {
  Promise.resolve()
    .then(() => {
      throw new Error('Lỗi từ Promise')
    })
    .catch(next) // Tự động đẩy error vào middleware
})
```

## 3. Nguyên tắc trigger hành động tiếp theo

- next() : chuyển qua 1 non-error handler kế tiếp
- next(err): skip những non-error middleware và nhảy thẳng tới error-hanlding middleware
- next('route'): skip toàn bộ middleware (dùng trong những trường hợp bypass)

## 4. Quy tắc "Bàn giao" (The Delegation Rule)

- Express có những built-in handler xử lý catch sẵn lỗi

* Mỗi trường dev: viết stack trace cho client
* Môi trường production: chỉ cung cấp HTML code mesage
* Headers check: nếu bắt gặp lỗi sau khi bắt đầu stream response ( header đã được gửi), mình phải ủy quyền cho default handler

```ts
if (res.headersSent) {
  return next(err)
}
```

## 5. Best practice checklist

- Positioning: những handlers xử lý lỗi đã được define ở file index chưa
- Arguments: có nhận vào đầy đủ 4 tham số như 1 error hanlders không
- Async safety: có sử dụng try/catch hay .catch(next) cho async code chưa
- Response Ending: custom hanlder có dùng res.send() chưa, chưa thì request sẽ in charge
- Envionment: như mục 4, mỗi trường ở production không return về stack traces

```ts
// Bước 1: Log lỗi (Ghi vào file hoặc Sentry)
app.use((err, req, res, next) => {
  console.error(`[LOG]: ${err.message}`)
  next(err) // Chuyển sang middleware xử lý tiếp theo
})

// Bước 2: Phản hồi cho Client
app.use((err, req, res, next) => {
  const statusCode = err.status || 500
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
    // Chỉ hiện stack trace khi ở môi trường dev
    stack: process.env.NODE_ENV === 'development' ? err.stack : {}
  })
})
```

### 📊 Bảng Tổng Kết Ôn Bài (Cheat Sheet) - Express Error Handling

| Tình huống (Scenario)       | Cách xử lý (Action)      | Ghi chú (Note)                                                                     |
| :-------------------------- | :----------------------- | :--------------------------------------------------------------------------------- |
| **Hàm đồng bộ (Sync)**      | `throw new Error('...')` | Express tự động bắt và chuyển đến Error Middleware.                                |
| **Hàm bất đồng bộ (Async)** | `next(err)`              | Bắt buộc phải dùng `next(err)` bên trong `catch` để tránh treo App.                |
| **Headers đã được gửi**     | `return next(err)`       | Nếu lỗi xảy ra sau khi `res.send()`, phải nhường quyền cho Express xử lý mặc định. |
| **Middleware xử lý lỗi**    | `(err, req, res, next)`  | Phải có **đủ 4 tham số**, nếu thiếu 1 cái Express sẽ coi là middleware thường.     |
| **Vị trí đặt Code**         | Cuối file `app.js`       | Đặt sau tất cả các route khác để làm "tấm lưới" hứng lỗi cuối cùng.                |
| **Môi trường Live (Prod)**  | `NODE_ENV=production`    | Luôn ẩn `err.stack` để tránh lộ thông tin nhạy cảm của hệ thống.                   |
| **Lỗi 404 (Not Found)**     | Middleware không tên     | Đặt 1 middleware ngay trên Error Handler để bắt các request không khớp route nào.  |

---

### 💡 Mẹo ghi nhớ nhanh:

- **3 tham số** = Middleware làm việc (Logic, Auth, Log...).
- **4 tham số** = Middleware dọn rác (Xử lý lỗi).
- **Sync** = Quăng (throw).
- **Async** = Chuyển tiếp (next).
