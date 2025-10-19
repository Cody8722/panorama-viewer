// ========== 全域變數 ==========
let panoramas = [];
let albums = [];
let currentPanoramaId = null;
let currentAlbumId = null;
let viewer = null;
let deleteType = null; // 'panorama' or 'album'
let selectedPanoramaIds = [];

// ========== 初始化 ==========
document.addEventListener('DOMContentLoaded', function() {
    loadPanoramas();
    loadAlbums();

    // 表單處理
    document.getElementById('uploadForm').addEventListener('submit', handleUpload);
    document.getElementById('editForm').addEventListener('submit', handleEdit);
    document.getElementById('deleteForm').addEventListener('submit', handleDelete);
    document.getElementById('albumForm').addEventListener('submit', handleAlbumSubmit);

    // 檔案選擇時自動填入標題
    document.getElementById('fileInput').addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file && !document.getElementById('titleInput').value) {
            const fileName = file.name.replace(/\.[^/.]+$/, "");
            document.getElementById('titleInput').value = fileName;
        }
    });
});

// ========== 標籤切換 ==========
function switchTab(tab) {
    // 更新標籤按鈕狀態
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');

    // 更新標籤內容
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`${tab}-tab`).classList.add('active');

    // 重新載入數據
    if (tab === 'panoramas') {
        loadPanoramas();
    } else if (tab === 'albums') {
        loadAlbums();
    }
}

// ========== 全景圖相關功能 ==========

async function loadPanoramas() {
    try {
        const response = await fetch(`${window.BACKEND_URL}/api/panoramas`);
        if (!response.ok) throw new Error('載入失敗');

        panoramas = await response.json();
        renderPanoramaList();

        if (panoramas.length > 0 && !currentPanoramaId) {
            loadPanoramaViewer(panoramas[0]._id);
        }
    } catch (error) {
        console.error('載入全景圖列表失敗:', error);
        showNotification('載入全景圖列表失敗', 'error');
    }
}

function renderPanoramaList() {
    const container = document.getElementById('panoramaList');

    if (panoramas.length === 0) {
        container.innerHTML = `
            <div class="text-center text-gray-500 py-8">
                <i class="fas fa-image text-4xl mb-2"></i>
                <p>尚無全景圖</p>
                <p class="text-sm">請先上傳圖片</p>
            </div>
        `;
        return;
    }

    container.innerHTML = panoramas.map(p => `
        <div class="panorama-item p-3 rounded-lg border border-gray-200 ${p._id === currentPanoramaId ? 'active' : ''}"
             onclick="loadPanoramaViewer('${p._id}')">
            <div class="font-medium text-gray-800">${escapeHtml(p.title)}</div>
            <div class="text-sm text-gray-500">
                <i class="far fa-calendar"></i> ${formatDate(p.created_at)}
            </div>
            <div class="text-xs text-gray-400">
                <i class="fas fa-hdd"></i> ${formatFileSize(p.file_size)}
            </div>
        </div>
    `).join('');
}

async function loadPanoramaViewer(panoramaId) {
    try {
        const panorama = panoramas.find(p => p._id === panoramaId);
        if (!panorama) throw new Error('找不到全景圖');

        currentPanoramaId = panoramaId;

        document.getElementById('currentTitle').textContent = panorama.title;
        document.getElementById('currentDescription').textContent = panorama.description || '';
        document.getElementById('viewerControls').style.display = 'flex';

        if (viewer) {
            viewer.destroy();
        }

        viewer = pannellum.viewer('panorama', {
            type: 'equirectangular',
            panorama: `${window.BACKEND_URL}/api/panoramas/${panoramaId}/image`,
            autoLoad: true,
            showControls: true,
            showFullscreenCtrl: true,
            showZoomCtrl: true,
            mouseZoom: true,
            doubleClickZoom: true,
            draggable: true,
            keyboardZoom: true,
            disableKeyboardCtrl: false,
            compass: true,
            northOffset: 0,
            hfov: 100,
            minHfov: 50,
            maxHfov: 120,
            pitch: 0,
            yaw: 0
        });

        renderPanoramaList();

    } catch (error) {
        console.error('載入全景圖失敗:', error);
        showNotification('載入全景圖失敗', 'error');
    }
}

async function handleUpload(e) {
    e.preventDefault();

    const fileInput = document.getElementById('fileInput');
    const titleInput = document.getElementById('titleInput');
    const descriptionInput = document.getElementById('descriptionInput');
    const uploadBtn = document.getElementById('uploadBtn');
    const uploadProgress = document.getElementById('uploadProgress');

    const file = fileInput.files[0];
    if (!file) {
        showNotification('請選擇檔案', 'error');
        return;
    }

    uploadBtn.disabled = true;
    uploadProgress.classList.add('active');

    try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('title', titleInput.value);
        formData.append('description', descriptionInput.value);

        const response = await fetch(`${window.BACKEND_URL}/api/panoramas`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || '上傳失敗');
        }

        showNotification('上傳成功！', 'success');

        fileInput.value = '';
        titleInput.value = '';
        descriptionInput.value = '';

        await loadPanoramas();

    } catch (error) {
        console.error('上傳失敗:', error);
        showNotification(error.message || '上傳失敗', 'error');
    } finally {
        uploadBtn.disabled = false;
        uploadProgress.classList.remove('active');
    }
}

function editPanorama() {
    if (!currentPanoramaId) return;

    const panorama = panoramas.find(p => p._id === currentPanoramaId);
    if (!panorama) return;

    document.getElementById('editTitle').value = panorama.title;
    document.getElementById('editDescription').value = panorama.description || '';
    document.getElementById('editModal').classList.remove('hidden');
    document.getElementById('editModal').classList.add('flex');
}

function closeEditModal() {
    document.getElementById('editModal').classList.add('hidden');
    document.getElementById('editModal').classList.remove('flex');
}

async function handleEdit(e) {
    e.preventDefault();

    if (!currentPanoramaId) return;

    try {
        const response = await fetch(`${window.BACKEND_URL}/api/panoramas/${currentPanoramaId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                title: document.getElementById('editTitle').value,
                description: document.getElementById('editDescription').value
            })
        });

        if (!response.ok) throw new Error('更新失敗');

        showNotification('更新成功！', 'success');
        closeEditModal();
        await loadPanoramas();
        loadPanoramaViewer(currentPanoramaId);

    } catch (error) {
        console.error('更新失敗:', error);
        showNotification('更新失敗', 'error');
    }
}

function deletePanorama() {
    if (!currentPanoramaId) return;

    deleteType = 'panorama';
    document.getElementById('deleteModalTitle').textContent = '刪除全景圖';
    document.getElementById('deleteModalDesc').textContent = '確定要刪除這張全景圖嗎？此操作無法復原。';
    document.getElementById('deletePassword').value = '';
    document.getElementById('deleteModal').classList.remove('hidden');
    document.getElementById('deleteModal').classList.add('flex');
}

function sharePanorama() {
    if (!currentPanoramaId) return;

    const baseUrl = window.location.origin;
    const shareUrl = `${baseUrl}/viewer.html?id=${currentPanoramaId}`;

    document.getElementById('shareModalTitle').textContent = '分享全景圖';
    document.getElementById('shareModalDesc').textContent = '使用下方的唯讀連結分享這張全景圖。收到連結的人只能查看，無法編輯或刪除。';
    document.getElementById('shareLink').value = shareUrl;
    document.getElementById('shareModal').classList.remove('hidden');
    document.getElementById('shareModal').classList.add('flex');
}

// ========== 合輯相關功能 ==========

async function loadAlbums() {
    try {
        const response = await fetch(`${window.BACKEND_URL}/api/albums`);
        if (!response.ok) throw new Error('載入失敗');

        albums = await response.json();
        renderAlbumList();

    } catch (error) {
        console.error('載入合輯列表失敗:', error);
        showNotification('載入合輯列表失敗', 'error');
    }
}

function renderAlbumList() {
    const container = document.getElementById('albumList');

    if (albums.length === 0) {
        container.innerHTML = `
            <div class="text-center text-gray-500 py-8">
                <i class="fas fa-layer-group text-4xl mb-2"></i>
                <p>尚無合輯</p>
                <p class="text-sm">點擊上方新增按鈕</p>
            </div>
        `;
        return;
    }

    container.innerHTML = albums.map(album => `
        <div class="album-item p-3 rounded-lg border border-gray-200 ${album._id === currentAlbumId ? 'active' : ''}"
             onclick="loadAlbumDetail('${album._id}')">
            <div class="font-medium text-gray-800">${escapeHtml(album.title)}</div>
            <div class="text-sm text-gray-500">
                <i class="fas fa-images"></i> ${album.panorama_count} 張全景圖
            </div>
            <div class="text-xs text-gray-400">
                <i class="far fa-calendar"></i> ${formatDate(album.created_at)}
            </div>
        </div>
    `).join('');
}

async function loadAlbumDetail(albumId) {
    try {
        const response = await fetch(`${window.BACKEND_URL}/api/albums/${albumId}`);
        if (!response.ok) throw new Error('載入失敗');

        const album = await response.json();
        currentAlbumId = albumId;

        document.getElementById('albumTitle').textContent = album.title;
        document.getElementById('albumDescription').textContent = album.description || '';
        document.getElementById('albumPanoramaCount').textContent = album.panoramas.length;

        const panoramasContainer = document.getElementById('albumPanoramas');
        if (album.panoramas.length === 0) {
            panoramasContainer.innerHTML = `
                <div class="col-span-2 text-center text-gray-500 py-8">
                    <i class="fas fa-image text-3xl mb-2"></i>
                    <p>此合輯還沒有全景圖</p>
                </div>
            `;
        } else {
            panoramasContainer.innerHTML = album.panoramas.map(p => `
                <div class="border rounded-lg p-3 hover:bg-gray-50">
                    <div class="font-medium text-gray-800 text-sm">${escapeHtml(p.title)}</div>
                    <div class="text-xs text-gray-500 mt-1">
                        ${p.description || '無描述'}
                    </div>
                </div>
            `).join('');
        }

        document.getElementById('albumDetail').classList.remove('hidden');
        document.getElementById('albumPlaceholder').classList.add('hidden');

        renderAlbumList();

    } catch (error) {
        console.error('載入合輯失敗:', error);
        showNotification('載入合輯失敗', 'error');
    }
}

async function showCreateAlbumModal() {
    if (panoramas.length === 0) {
        showNotification('請先上傳一些全景圖', 'error');
        return;
    }

    document.getElementById('albumModalTitle').textContent = '創建合輯';
    document.getElementById('albumNameInput').value = '';
    document.getElementById('albumDescInput').value = '';
    selectedPanoramaIds = [];

    await renderPanoramaSelection();

    document.getElementById('albumModal').classList.remove('hidden');
    document.getElementById('albumModal').classList.add('flex');
}

async function renderPanoramaSelection() {
    const container = document.getElementById('panoramaSelection');

    if (panoramas.length === 0) {
        await loadPanoramas();
    }

    container.innerHTML = panoramas.map(p => `
        <div class="flex items-center space-x-2 p-2 border rounded hover:bg-gray-50">
            <input type="checkbox" id="pano-${p._id}" value="${p._id}"
                   class="panorama-checkbox hidden"
                   ${selectedPanoramaIds.includes(p._id) ? 'checked' : ''}
                   onchange="togglePanoramaSelection('${p._id}')">
            <label for="pano-${p._id}" class="flex-1 cursor-pointer border-2 rounded p-2 transition">
                <div class="text-sm font-medium">${escapeHtml(p.title)}</div>
            </label>
        </div>
    `).join('');

    updateSelectedPanoramasList();
}

function togglePanoramaSelection(panoramaId) {
    const index = selectedPanoramaIds.indexOf(panoramaId);
    if (index > -1) {
        selectedPanoramaIds.splice(index, 1);
    } else {
        selectedPanoramaIds.push(panoramaId);
    }

    updateSelectedPanoramasList();
}

function updateSelectedPanoramasList() {
    const container = document.getElementById('selectedPanoramasList');
    const orderSection = document.getElementById('selectedPanoramasOrder');

    if (selectedPanoramaIds.length === 0) {
        orderSection.classList.add('hidden');
        return;
    }

    orderSection.classList.remove('hidden');

    container.innerHTML = selectedPanoramaIds.map((id, index) => {
        const pano = panoramas.find(p => p._id === id);
        if (!pano) return '';

        return `
            <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                <div class="flex items-center space-x-3">
                    <span class="text-gray-500 font-mono">${index + 1}</span>
                    <div>
                        <div class="font-medium">${escapeHtml(pano.title)}</div>
                        <div class="text-xs text-gray-500">${pano.description || '無描述'}</div>
                    </div>
                </div>
                <div class="flex space-x-1">
                    <button type="button" onclick="movePanoramaUp(${index})"
                            ${index === 0 ? 'disabled' : ''}
                            class="p-2 text-blue-500 hover:bg-blue-50 rounded ${index === 0 ? 'opacity-50 cursor-not-allowed' : ''}">
                        <i class="fas fa-chevron-up"></i>
                    </button>
                    <button type="button" onclick="movePanoramaDown(${index})"
                            ${index === selectedPanoramaIds.length - 1 ? 'disabled' : ''}
                            class="p-2 text-blue-500 hover:bg-blue-50 rounded ${index === selectedPanoramaIds.length - 1 ? 'opacity-50 cursor-not-allowed' : ''}">
                        <i class="fas fa-chevron-down"></i>
                    </button>
                    <button type="button" onclick="removePanoramaFromSelection(${index})"
                            class="p-2 text-red-500 hover:bg-red-50 rounded">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function movePanoramaUp(index) {
    if (index === 0) return;
    [selectedPanoramaIds[index], selectedPanoramaIds[index - 1]] =
    [selectedPanoramaIds[index - 1], selectedPanoramaIds[index]];
    updateSelectedPanoramasList();
}

function movePanoramaDown(index) {
    if (index === selectedPanoramaIds.length - 1) return;
    [selectedPanoramaIds[index], selectedPanoramaIds[index + 1]] =
    [selectedPanoramaIds[index + 1], selectedPanoramaIds[index]];
    updateSelectedPanoramasList();
}

function removePanoramaFromSelection(index) {
    const panoramaId = selectedPanoramaIds[index];
    selectedPanoramaIds.splice(index, 1);

    // 更新 checkbox 狀態
    const checkbox = document.getElementById(`pano-${panoramaId}`);
    if (checkbox) {
        checkbox.checked = false;
    }

    updateSelectedPanoramasList();
}

async function handleAlbumSubmit(e) {
    e.preventDefault();

    const title = document.getElementById('albumNameInput').value.trim();
    const description = document.getElementById('albumDescInput').value.trim();

    if (!title) {
        showNotification('請輸入合輯名稱', 'error');
        return;
    }

    try {
        const isEdit = document.getElementById('albumModalTitle').textContent === '編輯合輯';
        const url = isEdit
            ? `${window.BACKEND_URL}/api/albums/${currentAlbumId}`
            : `${window.BACKEND_URL}/api/albums`;
        const method = isEdit ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                title: title,
                description: description,
                panorama_ids: selectedPanoramaIds
            })
        });

        if (!response.ok) throw new Error(isEdit ? '更新失敗' : '創建失敗');

        showNotification(isEdit ? '合輯更新成功！' : '合輯創建成功！', 'success');
        closeAlbumModal();
        await loadAlbums();

        if (isEdit) {
            loadAlbumDetail(currentAlbumId);
        }

    } catch (error) {
        console.error('操作失敗:', error);
        showNotification(error.message, 'error');
    }
}

function closeAlbumModal() {
    document.getElementById('albumModal').classList.add('hidden');
    document.getElementById('albumModal').classList.remove('flex');
    selectedPanoramaIds = [];
}

async function editAlbum() {
    if (!currentAlbumId) return;

    try {
        const response = await fetch(`${window.BACKEND_URL}/api/albums/${currentAlbumId}`);
        if (!response.ok) throw new Error('載入失敗');

        const album = await response.json();

        document.getElementById('albumModalTitle').textContent = '編輯合輯';
        document.getElementById('albumNameInput').value = album.title;
        document.getElementById('albumDescInput').value = album.description || '';
        selectedPanoramaIds = album.panorama_ids || [];

        await renderPanoramaSelection();

        document.getElementById('albumModal').classList.remove('hidden');
        document.getElementById('albumModal').classList.add('flex');

    } catch (error) {
        console.error('載入合輯失敗:', error);
        showNotification('載入合輯失敗', 'error');
    }
}

function deleteAlbum() {
    if (!currentAlbumId) return;

    deleteType = 'album';
    document.getElementById('deleteModalTitle').textContent = '刪除合輯';
    document.getElementById('deleteModalDesc').textContent = '確定要刪除這個合輯嗎？此操作無法復原。（不會刪除合輯中的全景圖）';
    document.getElementById('deletePassword').value = '';
    document.getElementById('deleteModal').classList.remove('hidden');
    document.getElementById('deleteModal').classList.add('flex');
}

function shareAlbum() {
    if (!currentAlbumId) return;

    const baseUrl = window.location.origin;
    const shareUrl = `${baseUrl}/viewer.html?album=${currentAlbumId}`;

    document.getElementById('shareModalTitle').textContent = '分享合輯';
    document.getElementById('shareModalDesc').textContent = '使用下方的唯讀連結分享這個合輯。收到連結的人可以查看並切換合輯中的全景圖。';
    document.getElementById('shareLink').value = shareUrl;
    document.getElementById('shareModal').classList.remove('hidden');
    document.getElementById('shareModal').classList.add('flex');
}

// ========== 刪除功能 ==========

function closeDeleteModal() {
    document.getElementById('deleteModal').classList.add('hidden');
    document.getElementById('deleteModal').classList.remove('flex');
    document.getElementById('deletePassword').value = '';
}

async function handleDelete(e) {
    e.preventDefault();

    const password = document.getElementById('deletePassword').value;

    try {
        let url, successCallback;

        if (deleteType === 'panorama') {
            if (!currentPanoramaId) return;
            url = `${window.BACKEND_URL}/api/panoramas/${currentPanoramaId}`;
            successCallback = async () => {
                if (viewer) {
                    viewer.destroy();
                    viewer = null;
                }
                currentPanoramaId = null;
                document.getElementById('currentTitle').textContent = '全景圖查看器';
                document.getElementById('currentDescription').textContent = '';
                document.getElementById('viewerControls').style.display = 'none';
                await loadPanoramas();
            };
        } else if (deleteType === 'album') {
            if (!currentAlbumId) return;
            url = `${window.BACKEND_URL}/api/albums/${currentAlbumId}`;
            successCallback = async () => {
                currentAlbumId = null;
                document.getElementById('albumDetail').classList.add('hidden');
                document.getElementById('albumPlaceholder').classList.remove('hidden');
                await loadAlbums();
            };
        }

        const response = await fetch(url, {
            method: 'DELETE',
            headers: {
                'X-Admin-Secret': password
            }
        });

        if (!response.ok) {
            if (response.status === 403) {
                throw new Error('管理員密碼錯誤');
            }
            throw new Error('刪除失敗');
        }

        showNotification('刪除成功！', 'success');
        closeDeleteModal();
        await successCallback();

    } catch (error) {
        console.error('刪除失敗:', error);
        showNotification(error.message || '刪除失敗', 'error');
    }
}

// ========== 分享功能 ==========

function closeShareModal() {
    document.getElementById('shareModal').classList.add('hidden');
    document.getElementById('shareModal').classList.remove('flex');
}

function copyShareLink() {
    const shareLinkInput = document.getElementById('shareLink');
    shareLinkInput.select();
    shareLinkInput.setSelectionRange(0, 99999);

    try {
        document.execCommand('copy');
        showNotification('連結已複製到剪貼簿！', 'success');
    } catch (err) {
        navigator.clipboard.writeText(shareLinkInput.value).then(() => {
            showNotification('連結已複製到剪貼簿！', 'success');
        }).catch(() => {
            showNotification('複製失敗，請手動複製', 'error');
        });
    }
}

function openShareLink() {
    const shareUrl = document.getElementById('shareLink').value;
    window.open(shareUrl, '_blank');
}

// ========== 工具函式 ==========

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-TW', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showNotification(message, type = 'info') {
    const colors = {
        success: 'bg-green-500',
        error: 'bg-red-500',
        info: 'bg-blue-500'
    };

    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 ${colors[type]} text-white px-6 py-3 rounded-lg shadow-lg z-50`;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 3000);
}
