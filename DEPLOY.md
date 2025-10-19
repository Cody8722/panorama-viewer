# 🚀 Zeabur 部署指南

## 📋 部署前準備

### 1. 準備 MongoDB 資料庫

前往 [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) 創建免費資料庫：

1. 註冊/登入 MongoDB Atlas
2. 創建新的 Cluster（選擇 Free Tier - M0）
3. 創建資料庫用戶：
   - 點擊 `Database Access`
   - 添加新用戶，記下用戶名和密碼
4. 設定網路存取：
   - 點擊 `Network Access`
   - 添加 IP：`0.0.0.0/0`（允許所有 IP）
5. 取得連線字串：
   - 點擊 `Connect` → `Connect your application`
   - 複製連線字串（類似：`mongodb+srv://username:password@cluster.mongodb.net/`）

---

## 🔧 後端部署

### 步驟 1：在 Zeabur 創建後端服務

1. 前往 [Zeabur Dashboard](https://dash.zeabur.com)
2. 創建新專案或選擇現有專案
3. 點擊「Create Service」→「Git」
4. 連接你的 GitHub/GitLab 倉庫
5. 選擇 `panorama-viewer/backend` 資料夾

### 步驟 2：設定環境變數

在 Zeabur 服務設定中，點擊「Variables」添加以下環境變數：

```bash
# 必填
MONGO_URI=mongodb+srv://你的用戶名:你的密碼@cluster.mongodb.net/

# 選填（用於刪除功能的管理員密碼）
ADMIN_SECRET=your_strong_password_here

# 端口（通常 Zeabur 會自動設定）
PORT=5002
```

### 步驟 3：確認 zbpack.json 配置文件

確保 `backend/zbpack.json` 文件存在，內容如下：

```json
{
  "build_command": "pip install -r requirements.txt",
  "start_command": "gunicorn main:app --bind 0.0.0.0:$PORT --workers 2 --timeout 120"
}
```

**重要：** 這個文件告訴 Zeabur 如何啟動你的 Flask 應用。

### 步驟 4：部署

1. 儲存環境變數
2. 確認 `zbpack.json` 已提交到 Git
3. 點擊「Deploy」或「Redeploy」
4. 等待 1-2 分鐘完成部署

### 步驟 5：取得後端 URL

部署成功後，Zeabur 會給你一個網址，例如：
```
https://panorama-viewe-back.zeabur.app
```

### 步驟 6：測試後端

在瀏覽器訪問：
```
https://你的後端網址.zeabur.app/status
```

**應該看到：**
```json
{
  "status": "ok",
  "db_status": "connected",
  "panorama_count": 0
}
```

如果看到 `"db_status": "disconnected"`，請檢查 `MONGO_URI` 是否正確。

---

## 🎨 前端部署

### 步驟 1：確認後端 URL 已更新

檢查以下兩個檔案的 `BACKEND_URL`：

**frontend/index.html（第 52 行）：**
```javascript
window.BACKEND_URL = 'https://panorama-viewe-back.zeabur.app';
```

**frontend/viewer.html（第 133 行）：**
```javascript
window.BACKEND_URL = 'https://panorama-viewe-back.zeabur.app';
```

### 步驟 2：在 Zeabur 創建前端服務

1. 在同一個專案中點擊「Create Service」
2. 選擇「Static」（靜態網站）
3. 連接同一個 Git 倉庫
4. **重要：**選擇 `panorama-viewer/frontend` 資料夾作為根目錄
5. 設定：
   - **Output Directory**: 留空或 `.`
   - **Index File**: `index.html`

### 步驟 3：部署

1. 點擊「Deploy」
2. 等待部署完成

### 步驟 4：取得前端 URL

部署成功後，你會得到一個網址，例如：
```
https://panorama-viewer.zeabur.app
```

---

## ✅ 部署完成檢查

### 1. 測試後端

訪問：`https://你的後端.zeabur.app/status`

**預期結果：**
```json
{
  "status": "ok",
  "db_status": "connected",
  "panorama_count": 0
}
```

### 2. 測試前端

訪問：`https://你的前端.zeabur.app`

**預期結果：**
- 頁面正常載入
- 沒有 CORS 錯誤
- 可以上傳全景圖

### 3. 測試功能

1. **上傳測試**
   - 選擇一張全景圖片
   - 填寫標題
   - 點擊上傳
   - 應該看到「上傳成功」訊息

2. **查看測試**
   - 點擊左側列表中的全景圖
   - 全景圖應該正常顯示
   - 可以用滑鼠拖曳旋轉

3. **分享測試**
   - 點擊「分享」按鈕
   - 複製連結
   - 在新分頁開啟
   - 應該看到唯讀的全景圖查看器

---

## 🐛 常見問題排查

### 問題 1：502 Bad Gateway / SERVICE_UNAVAILABLE

**原因：**後端服務未啟動或崩潰

**解決方法：**
1. **最重要：確認 `zbpack.json` 文件存在且已提交到 Git**
   - 文件位置：`backend/zbpack.json`
   - 這個文件告訴 Zeabur 如何啟動 Flask 應用
2. 檢查 Zeabur 後端服務的 Logs（日誌）
3. 確認 `MONGO_URI` 環境變數已正確設定
4. 確認 MongoDB 白名單包含 `0.0.0.0/0`
5. 重新部署後端

### 問題 2：CORS 錯誤

**錯誤訊息：**
```
Access to fetch at '...' has been blocked by CORS policy
```

**解決方法：**
1. 確認後端已重新部署（包含最新的 CORS 設定）
2. 檢查後端日誌是否有啟動錯誤
3. 清除瀏覽器快取後重試

### 問題 3：圖片無法上傳

**原因：**檔案過大或格式不支援

**解決方法：**
1. 確認圖片小於 50MB
2. 確認圖片格式為 JPG、PNG 或 WEBP
3. 檢查後端日誌查看具體錯誤

### 問題 4：資料庫連線失敗

**錯誤訊息（在後端日誌中）：**
```
❌ MongoDB 連線失敗
```

**解決方法：**
1. 檢查 `MONGO_URI` 格式：
   ```
   mongodb+srv://username:password@cluster.mongodb.net/
   ```
2. 確認用戶名、密碼正確（注意特殊字元需要 URL 編碼）
3. 確認 MongoDB Atlas 的 IP 白名單包含 `0.0.0.0/0`
4. 確認 MongoDB Cluster 狀態為 Active

---

## 🔒 安全建議

### 1. 限制 CORS 來源（生產環境）

編輯 `backend/main.py`，將：
```python
CORS(app, origins="*")  # 允許所有來源
```

改為：
```python
CORS(app, resources={
    r"/*": {
        "origins": ["https://panorama-viewer.zeabur.app"],
        "methods": ["GET", "POST", "PUT", "DELETE"],
        "allow_headers": ["Content-Type", "X-Admin-Secret"]
    }
})
```

### 2. 設定強管理員密碼

如果使用刪除功能，設定強密碼：
```bash
ADMIN_SECRET=至少32字元的隨機密碼
```

### 3. 定期備份資料庫

在 MongoDB Atlas 設定自動備份（免費版有限制）

---

## 📊 部署架構圖

```
┌─────────────────────────────────────────┐
│  使用者瀏覽器                            │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│  Zeabur 前端（靜態網站）                 │
│  https://panorama-viewer.zeabur.app     │
│  - index.html（管理界面）                │
│  - viewer.html（唯讀查看器）             │
└────────────┬────────────────────────────┘
             │ API 請求
             ▼
┌─────────────────────────────────────────┐
│  Zeabur 後端（Flask API）                │
│  https://panorama-viewe-back.zeabur.app │
│  - 處理上傳/查詢/刪除                    │
│  - CORS 處理                             │
└────────────┬────────────────────────────┘
             │ MongoDB 連線
             ▼
┌─────────────────────────────────────────┐
│  MongoDB Atlas                          │
│  - 儲存全景圖資訊                        │
│  - GridFS 儲存圖片檔案                   │
└─────────────────────────────────────────┘
```

---

## 📝 更新部署

### 更新後端

1. 修改 `backend/` 中的檔案
2. Commit 並 Push 到 Git
3. Zeabur 會自動重新部署

### 更新前端

1. 修改 `frontend/` 中的檔案
2. Commit 並 Push 到 Git
3. Zeabur 會自動重新部署

---

## 💡 優化建議

### 1. 使用自訂域名

在 Zeabur 服務設定中可以綁定自己的域名：
- 前端：`panorama.yourdomain.com`
- 後端：`api.panorama.yourdomain.com`

### 2. 啟用 HTTPS

Zeabur 自動提供免費的 SSL 憑證

### 3. 監控服務狀態

在 Zeabur Dashboard 可以查看：
- 服務運行狀態
- 日誌輸出
- 資源使用情況

---

**部署完成！🎉**

如有問題，請檢查 Zeabur 日誌或參考上方的故障排除指南。
