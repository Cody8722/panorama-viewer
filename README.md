# 🌐 全景圖瀏覽器 - Panorama Viewer

使用 Pannellum 技術打造的 360° 全景圖片瀏覽和管理系統，支援圖片上傳、儲存、瀏覽和切換。

## ✨ 功能特色

### 📸 全景圖管理
- **圖片上傳**：支援 JPG、PNG、WEBP 格式，最大 50MB
- **圖片瀏覽**：使用 Pannellum 提供流暢的 360° 全景瀏覽體驗
- **圖片切換**：快速在多張全景圖之間切換
- **圖片儲存**：使用 MongoDB GridFS 永久儲存圖片

### 🎨 查看功能
- **360° 全景瀏覽**：滑鼠拖曳、滾輪縮放
- **全螢幕模式**：支援全螢幕瀏覽
- **指南針導航**：顯示方向指示
- **鍵盤控制**：使用鍵盤方向鍵瀏覽

### 🛠️ 管理功能
- **編輯資訊**：修改全景圖標題和描述
- **刪除圖片**：刪除不需要的全景圖
- **圖片列表**：顯示所有已上傳的全景圖
- **檔案資訊**：顯示上傳日期和檔案大小
- **分享功能**：生成唯讀連結，分享給他人查看（無需登入）

## 🚀 快速開始

### 環境需求

- **後端**：Python 3.8+
- **資料庫**：MongoDB
- **瀏覽器**：現代瀏覽器（Chrome、Firefox、Safari、Edge）

### 後端設定

1. **安裝依賴**

```bash
cd backend
pip install -r requirements.txt
```

2. **設定環境變數**

```bash
# 複製環境變數範例檔案
cp .env.example .env

# 編輯 .env 檔案，填入以下資訊：
# MONGO_URI=mongodb+srv://your_connection_string
# ADMIN_SECRET=your_strong_password (選填，用於刪除功能)
# PORT=5002
```

3. **啟動後端服務**

```bash
python main.py
```

後端預設運行在 `http://localhost:5002`

### 前端設定

1. **修改後端 URL**

編輯 `frontend/index.html`，修改第 40 行的後端 URL：

```javascript
// 本地開發
window.BACKEND_URL = 'http://localhost:5002';

// 生產環境（替換為您的後端網址）
// window.BACKEND_URL = 'https://your-backend.zeabur.app';
```

2. **啟動前端**

直接用瀏覽器開啟 `frontend/index.html` 即可使用。

或使用 Python 簡易 HTTP 伺服器：

```bash
cd frontend
python -m http.server 8080
```

然後訪問 `http://localhost:8080`

## 📦 部署到 Zeabur

### 後端部署

1. 在 Zeabur 建立新服務
2. 選擇從 Git 部署
3. 選擇 `backend` 資料夾
4. 設定環境變數：
   - `MONGO_URI`：MongoDB 連線字串
   - `ADMIN_SECRET`：管理員密碼（選填）
   - `PORT`：5002
5. 部署完成後記下後端 URL

### 前端部署

1. 修改 `frontend/index.html` 的 `BACKEND_URL` 為後端 URL
2. 在 Zeabur 建立新服務
3. 選擇靜態網站部署
4. 選擇 `frontend` 資料夾
5. 部署完成

## 🗄️ 資料庫結構

### panorama_db.panoramas

全景圖記錄集合：

```javascript
{
  _id: ObjectId,
  title: String,              // 標題
  description: String,        // 描述
  filename: String,           // 檔案名稱
  file_id: ObjectId,          // GridFS 檔案 ID
  file_size: Number,          // 檔案大小（bytes）
  content_type: String,       // MIME 類型
  created_at: DateTime        // 建立時間
}
```

### GridFS 儲存

圖片檔案儲存在 GridFS 中：
- `panorama_db.fs.files` - 檔案元資料
- `panorama_db.fs.chunks` - 檔案內容分塊

## 🛠️ API 端點

### 系統狀態

- `GET /status` - 系統狀態檢查

### 全景圖管理

- `GET /api/panoramas` - 取得所有全景圖列表
- `POST /api/panoramas` - 上傳新的全景圖
- `GET /api/panoramas/<id>` - 取得特定全景圖資訊
- `GET /api/panoramas/<id>/image` - 取得全景圖圖片
- `PUT /api/panoramas/<id>` - 更新全景圖資訊（標題、描述）
- `DELETE /api/panoramas/<id>` - 刪除全景圖

### API 使用範例

**上傳全景圖**

```bash
curl -X POST http://localhost:5002/api/panoramas \
  -F "file=@panorama.jpg" \
  -F "title=美麗的風景" \
  -F "description=這是一個美麗的全景圖"
```

**取得全景圖列表**

```bash
curl http://localhost:5002/api/panoramas
```

**刪除全景圖**（需要 ADMIN_SECRET）

```bash
curl -X DELETE http://localhost:5002/api/panoramas/<id> \
  -H "X-Admin-Secret: your_admin_secret"
```

## 📝 使用說明

### 上傳全景圖

1. 點擊「選擇全景圖片」按鈕，選擇一張全景圖片
2. 輸入標題（必填）
3. 輸入描述（選填）
4. 點擊「上傳全景圖」按鈕

### 瀏覽全景圖

1. 在左側的「全景圖列表」中點擊任意全景圖
2. 全景圖會在右側的查看器中顯示
3. 使用滑鼠拖曳來旋轉視角
4. 使用滾輪來縮放
5. 點擊全螢幕按鈕進入全螢幕模式

### 編輯全景圖

1. 選擇要編輯的全景圖
2. 點擊右上角的「編輯」按鈕
3. 修改標題或描述
4. 點擊「儲存」

### 分享全景圖

1. 選擇要分享的全景圖
2. 點擊右上角的「分享」按鈕
3. 複製分享連結
4. 將連結傳送給任何人查看

**分享特點：**
- 獨立的唯讀查看頁面 (`viewer.html`)
- 收到連結的人只能查看，無法編輯或刪除
- 支援全螢幕模式和所有查看功能
- 無需登入或權限即可查看

### 刪除全景圖

1. 選擇要刪除的全景圖
2. 點擊右上角的「刪除」按鈕
3. 確認刪除

## 🎨 技術棧

### 前端
- **Pannellum** 2.5.6 - 全景圖查看庫
- **Tailwind CSS** - UI 框架
- **Vanilla JavaScript** - 無框架依賴
- **Font Awesome** 6.4.0 - 圖標庫

### 後端
- **Flask** 3.0 - Web 框架
- **PyMongo** - MongoDB 驅動
- **Flask-CORS** - 跨域支援
- **GridFS** - 大型檔案儲存
- **Pillow** - 圖片處理
- **Gunicorn** - 生產環境伺服器

### 資料庫
- **MongoDB** - NoSQL 資料庫
- **GridFS** - 檔案儲存系統

## 🔒 安全建議

1. **使用強密碼**：`ADMIN_SECRET` 建議使用 32 字元以上的隨機密碼
2. **HTTPS**：生產環境務必使用 HTTPS
3. **定期備份**：定期備份 MongoDB 資料
4. **環境變數**：不要將 `.env` 檔案提交到版本控制
5. **檔案驗證**：後端已實作圖片格式和大小驗證

## 📊 效能優化

- 使用 GridFS 儲存大型圖片檔案
- Pannellum 自動進行圖片優化和快取
- 支援漸進式載入
- MongoDB 索引優化查詢速度

## 🐛 常見問題

### 無法連線到後端

1. 確認後端服務是否啟動
2. 檢查 `frontend/index.html` 中的 `BACKEND_URL` 是否正確
3. 檢查防火牆設定

### 圖片無法顯示

1. 確認圖片格式是否支援（JPG、PNG、WEBP）
2. 確認檔案大小是否超過 50MB
3. 檢查 MongoDB 連線是否正常
4. 查看瀏覽器控制台的錯誤訊息

### 刪除功能無法使用

1. 確認是否設定了 `ADMIN_SECRET` 環境變數
2. 如果設定了，刪除請求需要在 Header 中包含 `X-Admin-Secret`

## 📄 授權

MIT License

## 🤝 貢獻

歡迎提交 Issue 和 Pull Request！

## 📧 技術支援

如有問題或建議，歡迎聯繫。

---

## 🎯 專案結構

```
panorama-viewer/
├── backend/                    # 後端程式碼
│   ├── main.py                 # Flask 主程式
│   ├── requirements.txt        # Python 依賴
│   ├── .env.example            # 環境變數範例
│   └── Dockerfile              # Docker 配置
├── frontend/                   # 前端程式碼
│   ├── index.html              # 管理界面（上傳、編輯、刪除）
│   └── viewer.html             # 唯讀查看器（分享用）
└── README.md                   # 專案說明
```

## 🌟 未來計劃

- [x] ~~圖片分享連結生成~~ **已完成！**
- [ ] 支援多使用者系統
- [ ] 圖片標籤和分類功能
- [ ] 全景圖熱點標記（Hotspot）
- [ ] 批次上傳功能
- [ ] 圖片壓縮優化
- [ ] 分享連結密碼保護
- [ ] 分享連結過期時間設定
- [ ] 支援影片全景
- [ ] VR 模式支援

## 📸 截圖

（可以在這裡添加應用程式的截圖）

---

**Powered by Pannellum & Flask**
