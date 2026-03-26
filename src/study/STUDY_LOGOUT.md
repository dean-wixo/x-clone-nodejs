# Logout Feature - Hướng Dẫn Chi Tiết

## 📌 Mục Đích của Logout

Khi user logout, chúng ta cần:

- ✅ **Vô hiệu hóa refresh_token** → User không thể dùng nó để tạo access_token mới
- ✅ **Xóa refresh_token khỏi database** → Blacklist token đó
- ⚠️ **Access_token vẫn valid** cho đến khi hết hạn (không thể thu hồi được)

---

## 🎯 Logout vs Login - So Sánh

| Aspect                 | Login                             | Logout                                           |
| ---------------------- | --------------------------------- | ------------------------------------------------ |
| **Mục đích**           | Tạo tokens cho user               | Xóa tokens của user                              |
| **Authentication**     | Email + Password                  | Access Token (header)                            |
| **Database Operation** | INSERT refresh_token              | DELETE refresh_token                             |
| **Response**           | `{ access_token, refresh_token }` | `{ message: "success" }`                         |
| **Middleware**         | `loginValidator`                  | `accessTokenValidator` + `refreshTokenValidator` |

---

## 🔄 Logout Workflow - 6 Bước

```
Client Request
  ↓
1. Route Definition
  ↓
2. accessTokenValidator (Middleware)
  ↓
3. refreshTokenValidator (Middleware)
  ↓
4. logoutController (Controller)
  ↓
5. usersService.logout() (Service)
  ↓
6. Response to Client
```

---

## Bước 1️⃣: Client Gửi Request

### HTTP Request:

```http
POST http://localhost:4000/users/logout
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 📝 Giải Thích:

**Tại sao cần CẢ HAI tokens?**

1. **access_token (Header)** → Xác thực user đang logout
   - Prove bạn là chủ account
   - Lấy `user_id` từ token

2. **refresh_token (Body)** → Token cần xóa khỏi database
   - Xác định token nào cần xóa
   - Có thể logout từng device riêng lẻ

**❌ Sai lầm phổ biến:**

```http
# ❌ Chỉ gửi refresh_token
POST /logout
Body: { refresh_token: "..." }

Vấn đề: Bất kỳ ai có refresh_token đều logout được
        → Hacker ăn cắp refresh_token → logout user thật
```

---

## Bước 2️⃣: Route Definition

**File:** `src/routers/users.routes.ts`

```typescript
/**
 * Description: Handles user logout
 * Path: /logout
 * Method: POST
 * Headers: { Authorization: Bearer <access_token> }
 * Body: { refresh_token: string }
 */
userRouters.post(
  '/logout',
  accessTokenValidator, // Middleware 1: Verify access token
  refreshTokenValidator, // Middleware 2: Verify refresh token
  wrapRequestHandler(logoutController)
)
```

### 📝 Giải Thích:

**Thứ tự middleware QUAN TRỌNG:**

```
Request
  → accessTokenValidator (Check đã login chưa?)
  → refreshTokenValidator (Token có hợp lệ không?)
  → logoutController (Xử lý logic)
```

**Tại sao cần wrapRequestHandler?**

- Bắt lỗi async trong controller
- Nếu controller throw error → chuyển đến error middleware
- Không cần viết try/catch trong controller

---

## Bước 3️⃣: accessTokenValidator (Middleware)

**File:** `src/middlewares/users.middlewares.ts`

```typescript
export const accessTokenValidator = validate(
  checkSchema(
    {
      authorization: {
        notEmpty: {
          errorMessage: 'Authorization header is required'
        },
        isString: true,
        custom: {
          options: async (value, { req }) => {
            // Bước 1: Lấy token từ header "Bearer eyJhbGc..."
            const access_token = value.split('Bearer ')[1]

            if (!access_token) {
              throw new ErrorWithStatus({
                message: 'Access token is required',
                status: 401
              })
            }

            // Bước 2: Verify token (signature + expiration)
            const decoded_authorization = await verifyToken({
              token: access_token
            })

            // Bước 3: Gắn decoded data vào req
            (req as Request).decoded_authorization = decoded_authorization
            // decoded_authorization = { user_id: "123", token_type: "access", exp: ... }

            return true
          }
        }
      }
    },
    ['headers']
  )
)
```

### 📝 Giải Thích:

**Middleware này làm gì?**

1. **Lấy token từ header:**
   - Header: `Authorization: Bearer eyJhbGc...`
   - Split để lấy phần sau "Bearer "

2. **Verify token:**
   - Check signature (token có bị giả mạo không?)
   - Check expiration (token còn hạn không?)
   - Nếu lỗi → throw 401 Unauthorized

3. **Decode và lưu:**
   - Decode payload: `{ user_id, token_type, exp }`
   - Gắn vào `req.decoded_authorization`
   - Controller sẽ dùng để biết ai đang logout

**Lỗi thường gặp:**

| Lỗi                                | Nguyên Nhân               | Response |
| ---------------------------------- | ------------------------- | -------- |
| "Authorization header is required" | Không gửi header          | 401      |
| "Access token is required"         | Header không có "Bearer " | 401      |
| "jwt expired"                      | Token hết hạn             | 401      |
| "invalid signature"                | Token bị sửa đổi          | 401      |

---

## Bước 4️⃣: refreshTokenValidator (Middleware)

**File:** `src/middlewares/users.middlewares.ts`

```typescript
export const refreshTokenValidator = validate(
  checkSchema(
    {
      refresh_token: {
        notEmpty: {
          errorMessage: 'Refresh token is required'
        },
        custom: {
          options: async (value, { req }) => {
            try {
              // Bước 1: Verify token VÀ tìm trong database ĐỒNG THỜI
              const [decoded_refresh_token, refresh_token] = await Promise.all([
                verifyToken({ token: value }),
                databaseService.refreshTokens.findOne({ token: value })
              ])

              // Bước 2: Kiểm tra token có trong database không
              if (refresh_token === null) {
                throw new ErrorWithStatus({
                  message: 'Refresh token is invalid',
                  status: 401
                })
              }

              // Bước 3: Gắn decoded token vào req
              ;(req as Request).decoded_refresh_token = decoded_refresh_token
            } catch (error) {
              if (error instanceof JsonWebTokenError) {
                throw new ErrorWithStatus({
                  message: error.message,
                  status: 401
                })
              }
              throw error
            }
            return true
          }
        }
      }
    },
    ['body']
  )
)
```

### 📝 Giải Thích:

**Middleware này làm gì?**

1. **Verify signature:**
   - Check token có hợp lệ không
   - Tương tự access_token

2. **Check trong database:** ⭐ **QUAN TRỌNG**
   - Tìm token trong collection `refresh_tokens`
   - Nếu KHÔNG tìm thấy → Token đã bị logout
   - Prevent double-logout

3. **Parallel execution:**

   ```typescript
   // ✅ Tốt: Chạy song song (nhanh hơn)
   Promise.all([verifyToken({ token: value }), databaseService.refreshTokens.findOne({ token: value })])

   // ❌ Chậm: Chạy tuần tự
   await verifyToken({ token: value })
   await databaseService.refreshTokens.findOne({ token: value })
   ```

**Scenarios:**

| Scenario                     | Result                                      |
| ---------------------------- | ------------------------------------------- |
| Token hợp lệ, có trong DB    | ✅ Pass → Controller                        |
| Token hợp lệ, KHÔNG trong DB | ❌ 401: "Refresh token is invalid"          |
| Token không hợp lệ           | ❌ 401: "jwt expired" / "invalid signature" |
| Token bị thiếu               | ❌ "Refresh token is required"              |

**Double Logout Protection:**

```
Lần 1: Logout
  → Token "abc" được xóa khỏi DB
  → Response: 200 OK

Lần 2: Logout lại với cùng token "abc"
  → refreshTokenValidator tìm "abc" trong DB
  → Không tìm thấy
  → Response: 401 "Refresh token is invalid"
```

---

## Bước 5️⃣: logoutController (Controller)

**File:** `src/controllers/users.controllers.ts`

```typescript
export const logoutController = async (req: Request<ParamsDictionary, any, LogoutReqBody>, res: Response) => {
  // Bước 1: Lấy refresh_token từ body (đã được validate)
  const { refresh_token } = req.body

  // Bước 2: Gọi service để xóa token khỏi database
  const result = await usersService.logout(refresh_token)

  // Bước 3: Trả response cho client
  return res.json({
    message: 'Logout successful',
    result
  })
}
```

### 📝 Giải Thích:

**Controller KHÔNG chứa logic!**

Controller chỉ:

1. Lấy data từ `req` (body, params, headers)
2. Gọi service tương ứng
3. Format response trả về client

**Tại sao không dùng req.decoded_authorization?**

- Refresh_token trong `req.body` đã đủ
- Validator đã verify token hợp lệ
- Service chỉ cần token string để xóa

**Type Safety:**

```typescript
// Define interface cho request body
export interface LogoutReqBody {
  refresh_token: string
}

// Use trong controller
Request<ParamsDictionary, any, LogoutReqBody>
```

---

## Bước 6️⃣: usersService.logout() (Service)

**File:** `src/services/users.services.ts`

```typescript
async logout(refresh_token: string) {
  // Xóa refresh_token khỏi database
  const result = await databaseService.refreshTokens.deleteOne({
    token: refresh_token
  })

  return result
  // result = { acknowledged: true, deletedCount: 1 }
}
```

### 📝 Giải Thích:

**Service làm gì?**

1. **Xóa token khỏi database:**

   ```javascript
   db.refreshTokens.deleteOne({ token: 'abc...' })
   ```

2. **Return result:**
   ```json
   {
     "acknowledged": true, // MongoDB đã nhận lệnh
     "deletedCount": 1 // Số document bị xóa
   }
   ```

**MongoDB Operations:**

| Method         | Mục Đích                              |
| -------------- | ------------------------------------- |
| `insertOne()`  | Thêm token (login/register)           |
| `findOne()`    | Tìm token (validate)                  |
| `deleteOne()`  | Xóa 1 token (logout)                  |
| `deleteMany()` | Xóa nhiều tokens (logout all devices) |

**Logout All Devices (Advanced):**

```typescript
async logoutAllDevices(user_id: string) {
  // Xóa TẤT CẢ refresh_tokens của user
  const result = await databaseService.refreshTokens.deleteMany({
    user_id: new ObjectId(user_id)
  })

  return result
  // result = { acknowledged: true, deletedCount: 3 }
}
```

---

## 📊 Complete Data Flow

```
Client
  Headers: { Authorization: "Bearer <access_token>" }
  Body: { refresh_token: "<refresh_token>" }
        ↓
┌─────────────────────────────────────────────────────────┐
│ accessTokenValidator                                    │
│   1. Split "Bearer " → access_token                     │
│   2. verifyToken(access_token)                          │
│   3. decoded = { user_id: "123", token_type, exp }      │
│   4. req.decoded_authorization = decoded                │
└─────────────────────────────────────────────────────────┘
        ↓ (req có .decoded_authorization)
┌─────────────────────────────────────────────────────────┐
│ refreshTokenValidator                                   │
│   1. verifyToken(refresh_token)                         │
│   2. db.findOne({ token: refresh_token })               │
│   3. if (not found) → throw 401                         │
│   4. req.decoded_refresh_token = decoded                │
└─────────────────────────────────────────────────────────┘
        ↓ (req có .decoded_refresh_token)
┌─────────────────────────────────────────────────────────┐
│ logoutController                                        │
│   1. const { refresh_token } = req.body                 │
│   2. result = await usersService.logout(refresh_token)  │
│   3. res.json({ message, result })                      │
└─────────────────────────────────────────────────────────┘
        ↓
┌─────────────────────────────────────────────────────────┐
│ usersService.logout()                                   │
│   1. db.refreshTokens.deleteOne({ token })              │
│   2. return { acknowledged: true, deletedCount: 1 }     │
└─────────────────────────────────────────────────────────┘
        ↓
Response
{
  "message": "Logout successful",
  "result": {
    "acknowledged": true,
    "deletedCount": 1
  }
}
```

---

## 🧪 Test Cases

### ✅ **Test 1: Success - Logout thành công**

```http
POST http://localhost:4000/users/logout
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Expected Response (200):**

```json
{
  "message": "Logout successful",
  "result": {
    "acknowledged": true,
    "deletedCount": 1
  }
}
```

---

### ❌ **Test 2: Missing Access Token**

```http
POST http://localhost:4000/users/logout
Content-Type: application/json

{
  "refresh_token": "..."
}
```

**Expected Response (401):**

```json
{
  "message": "Authorization header is required"
}
```

---

### ❌ **Test 3: Missing Refresh Token**

```http
POST http://localhost:4000/users/logout
Authorization: Bearer valid_access_token
Content-Type: application/json

{}
```

**Expected Response (422):**

```json
{
  "message": "Validation error",
  "errors": {
    "refresh_token": {
      "msg": "Refresh token is required"
    }
  }
}
```

---

### ❌ **Test 4: Expired Access Token**

```http
POST http://localhost:4000/users/logout
Authorization: Bearer expired_access_token
Content-Type: application/json

{
  "refresh_token": "..."
}
```

**Expected Response (401):**

```json
{
  "message": "jwt expired"
}
```

---

### ❌ **Test 5: Invalid Refresh Token (Đã logout rồi)**

```http
POST http://localhost:4000/users/logout
Authorization: Bearer valid_access_token
Content-Type: application/json

{
  "refresh_token": "already_logged_out_token"
}
```

**Expected Response (401):**

```json
{
  "message": "Refresh token is invalid"
}
```

---

### ❌ **Test 6: Double Logout**

```http
# Lần 1: Logout thành công
POST /logout
Body: { refresh_token: "abc" }
→ 200 OK

# Lần 2: Logout lại
POST /logout
Body: { refresh_token: "abc" }
→ 401 "Refresh token is invalid"
```

---

## 🔐 Security Concepts

### **1. Tại sao không xóa access_token?**

**Access Token = Stateless JWT**

```
Access Token:
  ✅ Short-lived (15 phút)
  ✅ Self-contained (chứa data trong token)
  ❌ KHÔNG lưu trong database
  ❌ KHÔNG thể thu hồi được

  → Khi user logout, access_token VẪN valid cho đến khi hết hạn!
```

**Refresh Token = Stateful**

```
Refresh Token:
  ✅ Long-lived (100 ngày)
  ✅ LƯU trong database
  ✅ Có thể thu hồi (xóa khỏi DB)

  → Khi logout, xóa khỏi DB → không dùng được nữa
```

**Security Model:**

```
User logout lúc 10:00 AM
Access token expires lúc 10:15 AM

10:00 - 10:15: Access token VẪN hoạt động! ⚠️
10:15+: Access token hết hạn ✅

→ Giải pháp: Giữ access_token lifetime ngắn (15 phút)
```

---

### **2. Token Blacklist (Advanced)**

Nếu muốn vô hiệu hóa access_token ngay lập tức:

```typescript
// Lưu access_token vào blacklist khi logout
async logout(access_token: string, refresh_token: string) {
  await Promise.all([
    // Xóa refresh token
    databaseService.refreshTokens.deleteOne({ token: refresh_token }),

    // Thêm access token vào blacklist
    databaseService.blacklist.insertOne({
      token: access_token,
      expired_at: new Date(Date.now() + 15 * 60 * 1000) // 15 phút
    })
  ])
}

// Check token có trong blacklist không
async isTokenBlacklisted(token: string) {
  const blacklisted = await databaseService.blacklist.findOne({ token })
  return !!blacklisted
}
```

**Trade-offs:**

- ✅ Access token bị vô hiệu hóa ngay lập tức
- ❌ Phải check database mỗi request (chậm hơn)
- ❌ Database phình to (phải cleanup định kỳ)

---

### **3. Refresh Token Rotation (Best Practice)**

Mỗi lần refresh → tạo refresh_token mới:

```typescript
async refreshAccessToken(old_refresh_token: string) {
  // 1. Verify old token
  const decoded = await verifyToken({ token: old_refresh_token })

  // 2. Tạo tokens mới
  const [new_access_token, new_refresh_token] = await Promise.all([
    this.signAccessToken(decoded.user_id),
    this.signRefreshToken(decoded.user_id)
  ])

  // 3. Xóa token cũ, lưu token mới
  await Promise.all([
    databaseService.refreshTokens.deleteOne({ token: old_refresh_token }),
    databaseService.refreshTokens.insertOne({
      token: new_refresh_token,
      user_id: new ObjectId(decoded.user_id)
    })
  ])

  return { new_access_token, new_refresh_token }
}
```

**Lợi ích:**

- Giảm thiểu rủi ro nếu refresh_token bị đánh cắp
- Token cũ không dùng được sau khi refresh

---

## 💡 Best Practices

### **1. Client-side Cleanup**

Sau khi logout thành công, client phải:

```javascript
// ✅ Xóa tokens khỏi storage
localStorage.removeItem('access_token')
localStorage.removeItem('refresh_token')

// ✅ Clear user state (Redux/Context)
dispatch(clearUser())

// ✅ Redirect về login page
window.location.href = '/login'

// ✅ (Optional) Notify other tabs
window.postMessage({ type: 'LOGOUT' }, '*')
```

---

### **2. Error Handling**

```typescript
// Controller với proper error handling
export const logoutController = async (req: Request, res: Response) => {
  const { refresh_token } = req.body

  // Service đã được wrap bởi wrapRequestHandler
  // Không cần try/catch ở đây
  const result = await usersService.logout(refresh_token)

  return res.json({
    message: 'Logout successful',
    result
  })
}
```

**wrapRequestHandler tự động:**

- Catch errors
- Pass vào error middleware
- Format error response

---

### **3. Logging**

```typescript
async logout(refresh_token: string) {
  console.log(`[LOGOUT] Removing token: ${refresh_token.substring(0, 20)}...`)

  const result = await databaseService.refreshTokens.deleteOne({
    token: refresh_token
  })

  if (result.deletedCount === 0) {
    console.warn('[LOGOUT] Token not found in database')
  } else {
    console.log('[LOGOUT] Token successfully removed')
  }

  return result
}
```

---

### **4. Database Indexes**

Tối ưu performance:

```javascript
// Tạo index cho token field
db.refreshTokens.createIndex({ token: 1 })

// Tạo index cho user_id (để logout all devices)
db.refreshTokens.createIndex({ user_id: 1 })

// Tạo TTL index (tự động xóa expired tokens)
db.refreshTokens.createIndex(
  { created_at: 1 },
  { expireAfterSeconds: 8640000 } // 100 ngày
)
```

---

## 🐛 Common Mistakes

### **❌ Mistake 1: Không check token trong database**

```typescript
// ❌ SAI: Chỉ verify signature
custom: {
  options: async (value) => {
    await verifyToken({ token: value })
    return true
  }
}

// ✅ ĐÚNG: Verify + check database
custom: {
  options: async (value) => {
    const [decoded, token_in_db] = await Promise.all([
      verifyToken({ token: value }),
      databaseService.refreshTokens.findOne({ token: value })
    ])

    if (!token_in_db) {
      throw new ErrorWithStatus({ message: 'Token invalid', status: 401 })
    }
    return true
  }
}
```

**Hậu quả:** User có thể logout nhưng vẫn dùng refresh_token

---

### **❌ Mistake 2: Không wrap async controller**

```typescript
// ❌ SAI: Không wrap → lỗi async crash app
userRouters.post('/logout', logoutController)

// ✅ ĐÚNG: Wrap → lỗi được bắt
userRouters.post('/logout', wrapRequestHandler(logoutController))
```

---

### **❌ Mistake 3: Xóa sai token**

```typescript
// ❌ SAI: Xóa theo user_id (xóa tất cả devices)
await databaseService.refreshTokens.deleteMany({ user_id })

// ✅ ĐÚNG: Xóa token cụ thể (logout device hiện tại)
await databaseService.refreshTokens.deleteOne({ token: refresh_token })
```

---

### **❌ Mistake 4: Không import Request type**

```typescript
// ❌ SAI: TypeScript không nhận type augmentation
;(req as Request).decoded_authorization = decoded

// ✅ ĐÚNG: Import Request từ express
import { Request } from 'express'
;(req as Request).decoded_authorization = decoded
```

---

## 📚 Checklist Khi Implement Logout

```
□ 1. Define LogoutReqBody interface
     - refresh_token: string

□ 2. Create refreshTokenValidator middleware
     - Verify token signature
     - Check token trong database
     - Gắn decoded_refresh_token vào req

□ 3. Create logoutController
     - Lấy refresh_token từ body
     - Gọi usersService.logout()
     - Trả response

□ 4. Create usersService.logout() method
     - deleteOne({ token })
     - Return result

□ 5. Define route
     - POST /logout
     - Middlewares: accessTokenValidator, refreshTokenValidator
     - Wrap controller với wrapRequestHandler

□ 6. Update type.d.ts
     - Extend Request với decoded_refresh_token

□ 7. Test cases
     - Success logout
     - Missing access token
     - Missing refresh token
     - Invalid refresh token
     - Double logout
     - Expired tokens
```

---

## 🔗 Liên Kết Files

```
src/
├── routers/
│   └── users.routes.ts           → Define route /logout
├── middlewares/
│   └── users.middlewares.ts      → accessTokenValidator, refreshTokenValidator
├── controllers/
│   └── users.controllers.ts      → logoutController
├── services/
│   └── users.services.ts         → logout method
├── models/
│   └── requests/
│       └── User.requests.ts      → LogoutReqBody interface
└── type.d.ts                     → Extend Request type
```

---

## 📖 Tóm Tắt

### **Logout Flow:**

```
1. Client gửi access_token (header) + refresh_token (body)
2. accessTokenValidator verify access_token
3. refreshTokenValidator verify refresh_token + check DB
4. logoutController lấy refresh_token từ body
5. usersService.logout() xóa token khỏi DB
6. Response: { message: "Logout successful", result }
```

### **Key Points:**

- ✅ Cần CẢ HAI tokens: access (header) + refresh (body)
- ✅ Refresh token PHẢI check trong database
- ✅ Access token vẫn valid sau khi logout (cho đến khi hết hạn)
- ✅ Double logout protection tự động (token không tồn tại trong DB)
- ✅ Wrap controller với wrapRequestHandler

### **Security:**

- Access token = Stateless (không thể thu hồi)
- Refresh token = Stateful (có thể thu hồi bằng cách xóa DB)
- Giữ access_token lifetime ngắn (15 phút)
- Implement token rotation khi refresh

---

**Last Updated:** March 23, 2026  
**Next Topics:** Refresh Token, Email Verification, Password Reset

---

## 💬 Questions to Ask Yourself

Trước khi implement feature mới, hỏi:

1. ✅ Middleware nào cần chạy trước controller?
2. ✅ Data nào cần validate?
3. ✅ Data nào cần lưu trong database?
4. ✅ Controller có chứa logic không? (KHÔNG được!)
5. ✅ Service có return gì không?
6. ✅ Test cases nào cần cover?
7. ✅ Error messages có clear không?

**Remember:** Controller orchestrates, Service executes! 🎯
