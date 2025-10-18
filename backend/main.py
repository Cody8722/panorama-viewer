import os
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from pymongo import MongoClient
from gridfs import GridFS
from bson import ObjectId
from datetime import datetime
from dotenv import load_dotenv
import io
from PIL import Image
import logging

# 載入環境變數
load_dotenv()

app = Flask(__name__)

# CORS 設定 - 允許前端域名
CORS(app, resources={
    r"/*": {
        "origins": [
            "https://panorama-viewer.zeabur.app",
            "http://localhost:8080",
            "http://127.0.0.1:8080",
            "http://localhost:5500"  # Live Server
        ],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "X-Admin-Secret"],
        "supports_credentials": True
    }
})

# 設定日誌
logging.basicConfig(level=logging.INFO)

# 環境變數
MONGO_URI = os.getenv('MONGO_URI')
ADMIN_SECRET = os.getenv('ADMIN_SECRET')

# MongoDB 連線
client = None
db = None
fs = None
panoramas_collection = None

# 允許的圖片格式
ALLOWED_EXTENSIONS = {'jpg', 'jpeg', 'png', 'webp'}
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB

if MONGO_URI:
    try:
        client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
        client.admin.command('ping')
        logging.info("✅ 成功連線至 MongoDB！")

        db = client['panorama_db']
        fs = GridFS(db)
        panoramas_collection = db['panoramas']
    except Exception as e:
        logging.error(f"❌ MongoDB 連線失敗: {e}")
        logging.warning("⚠️ 應用將在沒有資料庫的情況下啟動")
else:
    logging.warning("⚠️ 未設定 MONGO_URI 環境變數")
    logging.warning("⚠️ 應用將在沒有資料庫的情況下啟動")

# 輔助函式
def allowed_file(filename):
    """檢查檔案格式"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def validate_image(file_data):
    """驗證圖片是否有效"""
    try:
        img = Image.open(io.BytesIO(file_data))
        img.verify()
        return True
    except Exception:
        return False

# API 路由

@app.route('/status', methods=['GET'])
def status():
    """系統狀態檢查"""
    db_connected = client is not None
    panorama_count = 0

    if db_connected and panoramas_collection is not None:
        try:
            panorama_count = panoramas_collection.count_documents({})
        except Exception:
            pass

    return jsonify({
        'status': 'ok',
        'db_status': 'connected' if db_connected else 'disconnected',
        'panorama_count': panorama_count
    }), 200

@app.route('/api/panoramas', methods=['GET'])
def get_panoramas():
    """取得所有全景圖列表"""
    if panoramas_collection is None:
        return jsonify({'error': '資料庫未初始化'}), 500

    try:
        panoramas = list(panoramas_collection.find({}, {
            '_id': 1,
            'title': 1,
            'description': 1,
            'created_at': 1,
            'file_size': 1
        }).sort('created_at', -1))

        # 轉換 ObjectId 為字串
        for p in panoramas:
            p['_id'] = str(p['_id'])
            p['created_at'] = p['created_at'].isoformat()

        return jsonify(panoramas), 200
    except Exception as e:
        logging.error(f"取得全景圖列表失敗: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/panoramas', methods=['POST'])
def upload_panorama():
    """上傳全景圖"""
    if db is None or fs is None or panoramas_collection is None:
        return jsonify({'error': '資料庫未初始化'}), 500

    try:
        # 檢查是否有檔案
        if 'file' not in request.files:
            return jsonify({'error': '沒有上傳檔案'}), 400

        file = request.files['file']

        if file.filename == '':
            return jsonify({'error': '檔案名稱不可為空'}), 400

        if not allowed_file(file.filename):
            return jsonify({'error': f'不支援的檔案格式，請使用: {", ".join(ALLOWED_EXTENSIONS)}'}), 400

        # 讀取檔案資料
        file_data = file.read()

        # 檢查檔案大小
        if len(file_data) > MAX_FILE_SIZE:
            return jsonify({'error': f'檔案過大，最大支援 {MAX_FILE_SIZE // (1024*1024)}MB'}), 400

        # 驗證圖片
        if not validate_image(file_data):
            return jsonify({'error': '無效的圖片檔案'}), 400

        # 取得標題和描述
        title = request.form.get('title', file.filename)
        description = request.form.get('description', '')

        # 儲存圖片到 GridFS
        file_id = fs.put(
            file_data,
            filename=file.filename,
            content_type=file.content_type
        )

        # 建立全景圖記錄
        panorama = {
            'title': title,
            'description': description,
            'filename': file.filename,
            'file_id': file_id,
            'file_size': len(file_data),
            'content_type': file.content_type,
            'created_at': datetime.now()
        }

        result = panoramas_collection.insert_one(panorama)

        return jsonify({
            'message': '全景圖上傳成功',
            'id': str(result.inserted_id),
            'title': title
        }), 201

    except Exception as e:
        logging.error(f"上傳全景圖失敗: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/panoramas/<panorama_id>/image', methods=['GET'])
def get_panorama_image(panorama_id):
    """取得全景圖圖片"""
    if fs is None or panoramas_collection is None:
        return jsonify({'error': '資料庫未初始化'}), 500

    try:
        # 查詢全景圖資訊
        panorama = panoramas_collection.find_one({'_id': ObjectId(panorama_id)})

        if not panorama:
            return jsonify({'error': '找不到全景圖'}), 404

        # 從 GridFS 取得圖片
        grid_out = fs.get(panorama['file_id'])

        # 回傳圖片
        return send_file(
            io.BytesIO(grid_out.read()),
            mimetype=panorama.get('content_type', 'image/jpeg')
        )

    except Exception as e:
        logging.error(f"取得全景圖失敗: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/panoramas/<panorama_id>', methods=['GET'])
def get_panorama(panorama_id):
    """取得全景圖資訊"""
    if panoramas_collection is None:
        return jsonify({'error': '資料庫未初始化'}), 500

    try:
        panorama = panoramas_collection.find_one({'_id': ObjectId(panorama_id)})

        if not panorama:
            return jsonify({'error': '找不到全景圖'}), 404

        # 轉換資料格式
        panorama['_id'] = str(panorama['_id'])
        panorama['file_id'] = str(panorama['file_id'])
        panorama['created_at'] = panorama['created_at'].isoformat()

        return jsonify(panorama), 200

    except Exception as e:
        logging.error(f"取得全景圖資訊失敗: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/panoramas/<panorama_id>', methods=['DELETE'])
def delete_panorama(panorama_id):
    """刪除全景圖"""
    if fs is None or panoramas_collection is None:
        return jsonify({'error': '資料庫未初始化'}), 500

    # 驗證管理員密碼（選填）
    if ADMIN_SECRET:
        secret = request.headers.get('X-Admin-Secret')
        if not secret or secret != ADMIN_SECRET:
            return jsonify({'error': '未授權'}), 403

    try:
        # 查詢全景圖
        panorama = panoramas_collection.find_one({'_id': ObjectId(panorama_id)})

        if not panorama:
            return jsonify({'error': '找不到全景圖'}), 404

        # 刪除 GridFS 檔案
        fs.delete(panorama['file_id'])

        # 刪除記錄
        panoramas_collection.delete_one({'_id': ObjectId(panorama_id)})

        return jsonify({'message': '全景圖已刪除'}), 200

    except Exception as e:
        logging.error(f"刪除全景圖失敗: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/panoramas/<panorama_id>', methods=['PUT'])
def update_panorama(panorama_id):
    """更新全景圖資訊（標題、描述）"""
    if panoramas_collection is None:
        return jsonify({'error': '資料庫未初始化'}), 500

    try:
        data = request.get_json()

        if not data:
            return jsonify({'error': '無效的請求資料'}), 400

        update_data = {}
        if 'title' in data:
            update_data['title'] = data['title']
        if 'description' in data:
            update_data['description'] = data['description']

        if not update_data:
            return jsonify({'error': '沒有要更新的資料'}), 400

        result = panoramas_collection.update_one(
            {'_id': ObjectId(panorama_id)},
            {'$set': update_data}
        )

        if result.matched_count == 0:
            return jsonify({'error': '找不到全景圖'}), 404

        return jsonify({'message': '全景圖資訊已更新'}), 200

    except Exception as e:
        logging.error(f"更新全景圖失敗: {e}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5002))
    app.run(host='0.0.0.0', port=port, debug=True)
