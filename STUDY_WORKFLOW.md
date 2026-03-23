# Backend Development Workflow - Hướng dẫn cho người mới

## 📌 Tổng Quan

Khi nhận một task backend, bạn sẽ làm theo trình tự: **Database → Service → Validation → Controller → Route → Test**

**Tại sao theo thứ tự này?**

- Database là nền tảng (data structure)
- Service chứa logic nghiệp vụ (não bộ)
- Validation kiểm tra input (bảo vệ)
- Controller điều phối (người quản lý)
- Route là cổng vào (endpoint)

---

## 🎯 Ví dụ Thực Tế: "User Update Profile"

**Task từ Product Manager:**

> "Cho phép user cập nhật tên, bio, và avatar của họ"

---

## Bước 1️⃣: Hiểu Requirements (10-15 phút)

### Checklist câu hỏi cần trả lời:

```
□ Security: User chỉ update profile của chính mình?
□ Validation:
  - Tên có độ dài tối đa/tối thiểu?
  - Bio có giới hạn ký tự?
  - Avatar là URL hay upload file?
□ Business Logic:
  - Email có được phép đổi không?
  - Có field nào required?
□ Response: Trả về cái gì sau khi update thành công?
```

**Kết luận:**

- User chỉ update profile của mình (cần JWT token)
- Name: 1-100 ký tự
- Bio: tối đa 500 ký tự, optional
- Avatar: URL link, optional
- Response: `{ message, result }`

---

## Bước 2️⃣: Design Database Schema

**File đầu tiên viết:** `src/models/schemas/User.schema.ts`

### Code:

```typescript
import { ObjectId } from 'mongodb'

interface UserType {
  _id?: ObjectId
  name: string
  email: string
  password: string
  date_of_birth?: Date
  bio?: string // ← Field mới
  avatar?: string // ← Field mới
  created_at?: Date
  updated_at?: Date
}

export default class User {
  _id?: ObjectId
  name: string
  email: string
  password: string
  date_of_birth: Date
  bio: string
  avatar: string
  created_at: Date
  updated_at: Date

  constructor(user: UserType) {
    this._id = user._id
    this.name = user.name
    this.email = user.email
    this.password = user.password
    this.date_of_birth = user.date_of_birth || new Date()
    this.bio = user.bio || ''
    this.avatar = user.avatar || ''
    this.created_at = user.created_at || new Date()
    this.updated_at = user.updated_at || new Date()
  }
}
```

### 📝 Giải thích:

- **Interface UserType**: Định nghĩa structure khi tạo/update user
- **Class User**: Chuyển đổi data từ client thành format lưu database
- **Default values**: `bio = ''`, `avatar = ''` nếu không có

---

## Bước 3️⃣: Define Request Types

**File:** `src/models/requests/User.requests.ts`

### Code:

```typescript
export interface UpdateProfileRequestBody {
  name?: string
  bio?: string
  avatar?: string
}
```

### 📝 Giải thích:

- Định nghĩa **chính xác** client sẽ gửi gì lên
- Tất cả field đều `optional` (?) vì user có thể chỉ update 1 field
- TypeScript sẽ autocomplete khi code controller

---

## Bước 4️⃣: Write Service Layer (Logic nghiệp vụ)

**File:** `src/services/users.services.ts`

### Code:

```typescript
import { ObjectId } from 'mongodb'
import databaseService from './database.services'
import { UpdateProfileRequestBody } from '../models/requests/User.requests'

class UsersService {
  async updateProfile(user_id: string, payload: UpdateProfileRequestBody) {
    // Logic: Chỉ update những field có giá trị
    const updateData: any = {
      updated_at: new Date()
    }

    if (payload.name !== undefined) {
      updateData.name = payload.name
    }
    if (payload.bio !== undefined) {
      updateData.bio = payload.bio
    }
    if (payload.avatar !== undefined) {
      updateData.avatar = payload.avatar
    }

    // Update trong database
    const result = await databaseService.users.findOneAndUpdate(
      { _id: new ObjectId(user_id) },
      {
        $set: updateData
      },
      {
        returnDocument: 'after', // Trả về document sau khi update
        projection: {
          password: 0 // Không trả về password
        }
      }
    )

    return result
  }
}

const usersService = new UsersService()
export default usersService
```

### 📝 Giải thích:

**Tại sao viết Service trước Controller?**

- Service = nơi chứa logic thật
- Controller chỉ là cầu nối giữa HTTP request và Service
- Service có thể được tái sử dụng (gọi từ nhiều nơi)

**Logic trong code:**

1. Tạo object `updateData` chỉ chứa field có giá trị
2. Gọi MongoDB `findOneAndUpdate`
3. Trả về user đã update (không bao gồm password)

---

## Bước 5️⃣: Create Validation Middleware

**File:** `src/middlewares/users.middlewares.ts`

### Code:

```typescript
import { checkSchema } from 'express-validator'
import { validate } from '../utils/validation'

export const updateProfileValidator = validate(
  checkSchema(
    {
      name: {
        optional: true,
        isString: {
          errorMessage: 'Name must be a string'
        },
        trim: true,
        isLength: {
          options: { min: 1, max: 100 },
          errorMessage: 'Name length must be from 1 to 100 characters'
        }
      },
      bio: {
        optional: true,
        isString: {
          errorMessage: 'Bio must be a string'
        },
        trim: true,
        isLength: {
          options: { max: 500 },
          errorMessage: 'Bio length must not exceed 500 characters'
        }
      },
      avatar: {
        optional: true,
        isString: {
          errorMessage: 'Avatar must be a string'
        },
        trim: true,
        isURL: {
          errorMessage: 'Avatar must be a valid URL'
        }
      }
    },
    ['body'] // Validate từ req.body
  )
)
```

### 📝 Giải thích:

**Tại sao cần Validation?**

- Bảo vệ database khỏi dữ liệu rác
- Trả lỗi cho client TRƯỚC KHI vào logic
- Dễ maintain (tập trung tất cả rules ở 1 chỗ)

**Cách hoạt động:**

1. `checkSchema` kiểm tra từng field theo rules
2. Nếu có lỗi → `validate` util sẽ throw `EntityError`
3. Error middleware sẽ bắt và trả về cho client

---

## Bước 6️⃣: Write Controller

**File:** `src/controllers/users.controllers.ts`

### Code:

```typescript
import { Request, Response } from 'express'
import { ParamsDictionary } from 'express-serve-static-core'
import { UpdateProfileRequestBody } from '../models/requests/User.requests'
import usersService from '../services/users.services'
import { TokenPayload } from '../models/requests/User.requests'

export const updateProfileController = async (
  req: Request<ParamsDictionary, any, UpdateProfileRequestBody>,
  res: Response
) => {
  // Lấy user_id từ JWT token (đã được decode bởi accessTokenValidator)
  const { user_id } = req.decoded_authorization as TokenPayload

  // Gọi service để xử lý logic
  const result = await usersService.updateProfile(user_id, req.body)

  // Trả response về client
  return res.json({
    message: 'Update profile successfully',
    result
  })
}
```

### 📝 Giải thích:

**Controller KHÔNG chứa logic**. Nó chỉ:

1. Lấy data từ `req` (body, params, headers)
2. Gọi service tương ứng
3. Format response trả về client

**Lưu ý:**

- `req.decoded_authorization` được thêm bởi `accessTokenValidator` middleware
- Controller không biết MongoDB, không biết validation
- Chỉ lo **"điều phối"** giữa HTTP và Service

---

## Bước 7️⃣: Define Route

**File:** `src/routers/users.routes.ts`

### Code:

```typescript
import { Router } from 'express'
import { updateProfileController } from '../controllers/users.controllers'
import { accessTokenValidator } from '../middlewares/users.middlewares'
import { updateProfileValidator } from '../middlewares/users.middlewares'
import wrapRequestHandler from '../utils/handlers'

const userRouters = Router()

/**
 * Description: Update user profile
 * Path: /users/me
 * Method: PATCH
 * Headers: { Authorization: Bearer <access_token> }
 * Body: { name?: string, bio?: string, avatar?: string }
 */
userRouters.patch(
  '/me',
  accessTokenValidator, // 1. Check JWT token
  updateProfileValidator, // 2. Validate input
  wrapRequestHandler(updateProfileController) // 3. Execute controller
)

export default userRouters
```

### 📝 Giải thích:

**Thứ tự middleware QUAN TRỌNG:**

```
Request → accessTokenValidator → updateProfileValidator → Controller → Response
           ↓ (Check đã login?)    ↓ (Data hợp lệ?)       ↓ (Xử lý logic)
```

**Tại sao dùng `wrapRequestHandler`?**

- Bắt lỗi async trong controller
- Nếu controller throw error → chuyển đến error middleware
- Không cần viết try/catch trong mỗi controller

---

## Bước 8️⃣: Testing

### Test bằng Thunder Client / Postman:

#### ✅ **Test Case 1: Success**

```http
PATCH http://localhost:4000/users/me
Authorization: Bearer eyJhbGc...
Content-Type: application/json

{
  "name": "John Updated",
  "bio": "I love coding!"
}
```

**Expected Response:**

```json
{
  "message": "Update profile successfully",
  "result": {
    "_id": "...",
    "name": "John Updated",
    "bio": "I love coding!",
    "email": "john@example.com",
    ...
  }
}
```

---

#### ❌ **Test Case 2: Validation Error**

```http
PATCH http://localhost:4000/users/me
Authorization: Bearer eyJhbGc...
Content-Type: application/json

{
  "name": "",
  "avatar": "not-a-url"
}
```

**Expected Response:**

```json
{
  "message": "Validation error",
  "errors": {
    "name": {
      "msg": "Name length must be from 1 to 100 characters"
    },
    "avatar": {
      "msg": "Avatar must be a valid URL"
    }
  }
}
```

---

#### ❌ **Test Case 3: Unauthorized**

```http
PATCH http://localhost:4000/users/me
Content-Type: application/json

{
  "name": "Hacker"
}
```

**Expected Response:**

```json
{
  "message": "Access token is required"
}
```

---

## 📚 Workflow Tổng Kết

```
Task: "Implement feature X"

Phase 1: Planning (15 phút)
  └─ Hiểu requirements
  └─ Xác định security, validation, business rules

Phase 2: Data Layer (30 phút)
  └─ Update User.schema.ts (thêm fields)
  └─ Define User.requests.ts (types)

Phase 3: Logic Layer (1-2 giờ)
  └─ Write users.services.ts (business logic)
  └─ Write users.middlewares.ts (validation)

Phase 4: API Layer (30 phút)
  └─ Write users.controllers.ts (request handler)
  └─ Update users.routes.ts (endpoint definition)

Phase 5: Testing (30 phút)
  └─ Test happy path (success cases)
  └─ Test validation errors
  └─ Test unauthorized access
```

---

## 🎓 Nguyên Tắc Vàng

### 1. **Bottom-Up Development**

```
Database Schema → Service → Controller → Route
(Từ low-level lên high-level)
```

### 2. **Separation of Concerns**

```
Routes     → Định nghĩa endpoints
Controller → Điều phối request/response
Service    → Business logic
Middleware → Validation, authentication
Schema     → Data structure
```

### 3. **Always Wrap Async Controllers**

```typescript
// ❌ Không wrap → Lỗi async crash app
router.post('/register', registerController)

// ✅ Có wrap → Lỗi được bắt và xử lý
router.post('/register', wrapRequestHandler(registerController))
```

### 4. **Error Handling First**

- Setup error middleware TRƯỚC KHI viết features
- Throw errors với status codes rõ ràng
- Environment-aware (dev: show stack, production: hide)

---

## 💡 Tips cho Người Mới

### Khi bắt đầu feature mới:

1. **Copy từ feature tương tự**

   ```
   registerController → updateProfileController
   loginValidator → updateProfileValidator
   ```

2. **Follow checklist:**

   ```
   □ Schema updated?
   □ Request types defined?
   □ Service method written?
   □ Validation added?
   □ Controller created?
   □ Route registered?
   □ Tested?
   ```

3. **Test ngay từng bước**
   - Viết xong Service → test bằng console.log
   - Viết xong Route → test bằng Thunder Client
   - Đừng viết hết rồi mới test!

4. **Đọc code cũ trước khi viết**
   - Xem cách team format response
   - Theo convention (camelCase, snake_case?)
   - Reuse existing utilities

5. **Commit nhỏ, thường xuyên**
   ```bash
   git commit -m "Add update profile schema"
   git commit -m "Add update profile service"
   git commit -m "Add update profile validation"
   git commit -m "Add update profile controller & route"
   ```

---

## 🔗 Liên Kết

- [ERROR_HANDLER.md](./ERROR_HANDLER.md) - Hiểu về error handling
- [STUDY.md](./STUDY.md) - Ghi chú học tập
- Thunder Client Extension - Test APIs trong VS Code

---

**Last Updated:** March 23, 2026
**Author:** Backend Study Notes
