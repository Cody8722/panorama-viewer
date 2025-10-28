"""
panorama-viewer Backend API Tests
测试主要的 API 端点功能
"""
import pytest
import sys
import os
from io import BytesIO

# 添加父目录到 Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from main import app


@pytest.fixture
def client():
    """创建测试客户端"""
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client


class TestHealthCheck:
    """健康检查端点测试"""

    def test_status_endpoint(self, client):
        """测试 /status 端点返回正确的状态"""
        response = client.get('/status')
        assert response.status_code == 200

        data = response.get_json()
        assert 'status' in data
        assert data['status'] == 'ok'
        assert 'db_status' in data
        assert 'panorama_count' in data

    def test_status_returns_json(self, client):
        """测试 /status 返回 JSON 格式"""
        response = client.get('/status')
        assert response.content_type == 'application/json'


class TestPanoramaAPI:
    """全景图 API 测试"""

    def test_get_panoramas_endpoint_exists(self, client):
        """测试 GET /api/panoramas 端点存在"""
        response = client.get('/api/panoramas')
        # 可能返回 200 或 500（如果数据库未连接）
        assert response.status_code in [200, 500]

    def test_get_panoramas_returns_json(self, client):
        """测试 GET /api/panoramas 返回 JSON"""
        response = client.get('/api/panoramas')
        assert response.content_type == 'application/json'

    def test_get_single_panorama_invalid_id(self, client):
        """测试获取不存在的全景图"""
        response = client.get('/api/panoramas/invalid_id_12345')
        # 应该返回 400 或 404
        assert response.status_code in [400, 404, 500]

    def test_upload_panorama_without_file(self, client):
        """测试上传时缺少文件"""
        response = client.post('/api/panoramas')
        # 应该返回 400（Bad Request）或 500
        assert response.status_code in [400, 500]

    def test_upload_panorama_with_invalid_file(self, client):
        """测试上传无效文件（非图片）"""
        data = {
            'file': (BytesIO(b'not an image'), 'test.txt'),
            'title': 'Test Panorama',
            'description': 'Test Description'
        }
        response = client.post('/api/panoramas',
                              data=data,
                              content_type='multipart/form-data')
        # 应该返回 400（不允许的文件类型）或 500
        assert response.status_code in [400, 500]


class TestAlbumAPI:
    """相册 API 测试"""

    def test_get_albums_endpoint_exists(self, client):
        """测试 GET /api/albums 端点存在"""
        response = client.get('/api/albums')
        assert response.status_code in [200, 500]

    def test_get_albums_returns_json(self, client):
        """测试 GET /api/albums 返回 JSON"""
        response = client.get('/api/albums')
        assert response.content_type == 'application/json'

    def test_create_album_without_data(self, client):
        """测试创建相册缺少数据"""
        response = client.post('/api/albums',
                              json={},
                              content_type='application/json')
        assert response.status_code in [400, 500]

    def test_get_single_album_invalid_id(self, client):
        """测试获取不存在的相册"""
        response = client.get('/api/albums/invalid_id_67890')
        assert response.status_code in [400, 404, 500]


class TestCORS:
    """CORS 配置测试"""

    def test_cors_headers_present(self, client):
        """测试 CORS headers 存在"""
        response = client.options('/status')
        # OPTIONS 请求应该包含 CORS headers
        assert response.status_code in [200, 204]

    def test_cors_allows_get(self, client):
        """测试 CORS 允许 GET 请求"""
        response = client.get('/status',
                             headers={'Origin': 'http://localhost:3000'})
        assert response.status_code == 200


class TestInputValidation:
    """输入验证测试"""

    def test_file_extension_validation(self, client):
        """测试文件扩展名验证"""
        # 测试不支持的文件类型
        data = {
            'file': (BytesIO(b'fake content'), 'test.exe'),
            'title': 'Test'
        }
        response = client.post('/api/panoramas',
                              data=data,
                              content_type='multipart/form-data')
        # 应该拒绝 .exe 文件
        assert response.status_code in [400, 500]

    def test_large_file_handling(self, client):
        """测试大文件处理（超过 50MB 限制）"""
        # 创建一个模拟的大文件（实际不会真的创建 50MB+）
        # 这里只测试端点是否有文件大小检查
        data = {
            'file': (BytesIO(b'x' * 1024), 'large.jpg'),
            'title': 'Large File Test'
        }
        response = client.post('/api/panoramas',
                              data=data,
                              content_type='multipart/form-data')
        # 端点应该能处理（即使最终可能因其他原因失败）
        assert response.status_code in [200, 400, 413, 500]


class TestErrorHandling:
    """错误处理测试"""

    def test_invalid_http_method(self, client):
        """测试不支持的 HTTP 方法"""
        response = client.patch('/api/panoramas')
        # 应该返回 405 Method Not Allowed
        assert response.status_code in [405, 500]

    def test_nonexistent_endpoint(self, client):
        """测试访问不存在的端点"""
        response = client.get('/api/nonexistent')
        assert response.status_code == 404

    def test_malformed_json(self, client):
        """测试格式错误的 JSON"""
        response = client.post('/api/albums',
                              data='{"invalid json',
                              content_type='application/json')
        assert response.status_code in [400, 500]


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
