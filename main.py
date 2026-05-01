import sys
import os
import re
import urllib.request
import urllib.parse
import subprocess
import uuid
import tempfile
from datetime import datetime

from PyQt6.QtWidgets import (QApplication, QMainWindow, QWidget, QVBoxLayout, 
                             QHBoxLayout, QPushButton, QLineEdit, QProgressBar, 
                             QLabel, QMessageBox, QTableWidget, QTableWidgetItem, 
                             QHeaderView, QTextEdit, QGroupBox, QSpinBox, 
                             QCheckBox, QFileDialog, QComboBox, QStyle,
                             QDoubleSpinBox, QTimeEdit, QStyledItemDelegate, QStyleOptionProgressBar,
                             QMenu, QSplitter, QSystemTrayIcon, QDialog, QListWidget)
from PyQt6.QtCore import QThread, pyqtSignal, Qt, QTimer, QTime, QSize, QUrl
from PyQt6.QtGui import QClipboard, QIcon, QPixmap, QAction

import yt_dlp

# ==========================================
# 1. UI HELPERS & DELEGATES
# ==========================================
def format_size(bytes_val):
    if not bytes_val: return "0 B"
    for unit in ['B', 'KB', 'MB', 'GB']:
        if bytes_val < 1024.0:
            return f"{bytes_val:.1f} {unit}"
        bytes_val /= 1024.0
    return f"{bytes_val:.1f} TB"

class NumericItem(QTableWidgetItem):
    def __lt__(self, other):
        return (self.data(Qt.ItemDataRole.UserRole) or 0) < (other.data(Qt.ItemDataRole.UserRole) or 0)

class ProgressBarDelegate(QStyledItemDelegate):
    def paint(self, painter, option, index):
        progress = index.data(Qt.ItemDataRole.UserRole)
        custom_text = index.data(Qt.ItemDataRole.ToolTipRole) 
        
        if progress is not None:
            opt = QStyleOptionProgressBar()
            opt.rect = option.rect
            opt.minimum = 0
            opt.maximum = 100
            opt.progress = int(progress)
            opt.text = custom_text if custom_text else f"{opt.progress}%"
            opt.textVisible = True
            QApplication.style().drawControl(QStyle.ControlElement.CE_ProgressBar, opt, painter)
        else:
            super().paint(painter, option, index)

# ==========================================
# 2. DIALOGS (HỘP THOẠI POPUP)
# ==========================================
class SubscriptionDialog(QDialog):
    """Hộp thoại Quản lý danh sách Kênh Theo dõi tự động"""
    def __init__(self, channels, parent=None):
        super().__init__(parent)
        self.setWindowTitle("Quản lý Kênh theo dõi (Auto-Subscribe)")
        self.resize(500, 350)
        self.channels = channels
        self.setup_ui()

    def setup_ui(self):
        layout = QVBoxLayout(self)
        
        lbl_info = QLabel("Danh sách các Kênh / Playlist đang được quét ngầm:")
        layout.addWidget(lbl_info)

        self.list_widget = QListWidget()
        self.list_widget.addItems(self.channels)
        layout.addWidget(self.list_widget)
        
        input_layout = QHBoxLayout()
        self.txt_new_channel = QLineEdit()
        self.txt_new_channel.setPlaceholderText("Dán link Kênh / Playlist vào đây...")
        self.btn_add = QPushButton("Thêm")
        self.btn_add.setStyleSheet("background-color: #a6e3a1; color: #11111b;")
        self.btn_add.clicked.connect(self.add_channel)
        input_layout.addWidget(self.txt_new_channel)
        input_layout.addWidget(self.btn_add)
        layout.addLayout(input_layout)
        
        btn_layout = QHBoxLayout()
        self.btn_remove = QPushButton("Xóa kênh đã chọn")
        self.btn_remove.setStyleSheet("background-color: #f38ba8; color: #11111b;")
        self.btn_remove.clicked.connect(self.remove_channel)
        self.btn_close = QPushButton("Đóng")
        self.btn_close.clicked.connect(self.accept)
        btn_layout.addWidget(self.btn_remove)
        btn_layout.addStretch()
        btn_layout.addWidget(self.btn_close)
        layout.addLayout(btn_layout)

    def add_channel(self):
        url = self.txt_new_channel.text().strip()
        if url and url.startswith("http") and url not in self.channels:
            self.channels.append(url)
            self.list_widget.addItem(url)
            self.txt_new_channel.clear()

    def remove_channel(self):
        for item in self.list_widget.selectedItems():
            self.channels.remove(item.text())
            self.list_widget.takeItem(self.list_widget.row(item))

class SmartInfoDialog(QDialog):
    """Hộp thoại Thông tin Thông minh & Chọn Độ phân giải"""
    def __init__(self, info, parent=None):
        super().__init__(parent)
        self.setWindowTitle("Thông tin Video (Smart Info)")
        self.resize(500, 200)
        self.info = info
        self.selected_format = None
        self.setup_ui()

    def setup_ui(self):
        layout = QVBoxLayout(self)
        info_layout = QHBoxLayout()
        
        self.lbl_thumb = QLabel()
        self.lbl_thumb.setFixedSize(180, 100)
        self.lbl_thumb.setScaledContents(True)
        self.lbl_thumb.setStyleSheet("border: 1px solid #45475a; border-radius: 4px;")
        if self.info.get('thumb') and os.path.exists(self.info['thumb']):
            self.lbl_thumb.setPixmap(QPixmap(self.info['thumb']))
        info_layout.addWidget(self.lbl_thumb)
        
        details_layout = QVBoxLayout()
        title_lbl = QLabel(f"<b>{self.info.get('title', 'Unknown')}</b>")
        title_lbl.setWordWrap(True)
        dur_lbl = QLabel(f"Thời lượng: {self.info.get('duration', 'N/A')}")
        dur_lbl.setStyleSheet("color: #a6adc8;")
        
        self.combo_formats = QComboBox()
        self.combo_formats.addItem("Tốt nhất (Mặc định)", None)
        for h in self.info.get('resolutions', []):
            self.combo_formats.addItem(f"Video {h}p", f"bestvideo[height<={h}]+bestaudio/best")
        self.combo_formats.addItem("Chỉ tải Âm thanh (MP3)", "audio")
        
        details_layout.addWidget(title_lbl)
        details_layout.addWidget(dur_lbl)
        details_layout.addWidget(QLabel("Chọn định dạng tải:"))
        details_layout.addWidget(self.combo_formats)
        details_layout.addStretch()
        
        info_layout.addLayout(details_layout)
        layout.addLayout(info_layout)
        
        btn_layout = QHBoxLayout()
        self.btn_add = QPushButton("Thêm vào Hàng đợi")
        self.btn_add.setStyleSheet("background-color: #a6e3a1; color: #11111b; font-weight: bold; padding: 6px 15px;")
        self.btn_add.clicked.connect(self.on_add)
        self.btn_cancel = QPushButton("Hủy")
        self.btn_cancel.clicked.connect(self.reject)
        
        btn_layout.addStretch()
        btn_layout.addWidget(self.btn_cancel)
        btn_layout.addWidget(self.btn_add)
        layout.addLayout(btn_layout)

    def on_add(self):
        self.selected_format = self.combo_formats.currentData()
        self.accept()

# ==========================================
# 3. WORKER THREADS
# ==========================================
class MediaInfoTask(QThread):
    """Tiến trình lấy cấu trúc Metadata để nuôi Smart Info Dialog"""
    finished_signal = pyqtSignal(dict)
    error_signal = pyqtSignal(str)
    log_signal = pyqtSignal(str)

    def __init__(self, url):
        super().__init__()
        self.url = url

    def run(self):
        self.log_signal.emit(f"🔍 Đang phân tích Smart Info: {self.url}")
        ydl_opts = {'quiet': True, 'noplaylist': True}
        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(self.url, download=False)
                title = info.get('title', 'Unknown')
                thumb_url = info.get('thumbnail', '')
                
                duration = info.get('duration')
                dur_str = f"{int(duration // 60)} phút {int(duration % 60)} giây" if duration else "N/A"

                formats = info.get('formats', [])
                heights = set()
                for f in formats:
                    h = f.get('height')
                    if h and isinstance(h, int) and h >= 360:
                        heights.add(h)
                sorted_heights = sorted(list(heights), reverse=True)

                thumb_path = ""
                if thumb_url:
                    try:
                        req = urllib.request.Request(thumb_url, headers={'User-Agent': 'Mozilla/5.0'})
                        data = urllib.request.urlopen(req, timeout=3).read()
                        thumb_path = os.path.join(tempfile.gettempdir(), f"smart_{uuid.uuid4().hex[:8]}.jpg")
                        with open(thumb_path, 'wb') as f: f.write(data)
                    except: pass

                result = {
                    'url': self.url,
                    'title': title,
                    'thumb': thumb_path,
                    'duration': dur_str,
                    'resolutions': sorted_heights
                }
                self.finished_signal.emit(result)
        except Exception as e:
            self.error_signal.emit(str(e))

class PlaylistExtractorTask(QThread):
    finished_signal = pyqtSignal(list)
    error_signal = pyqtSignal(str)
    log_signal = pyqtSignal(str)

    def __init__(self, url):
        super().__init__()
        self.url = url

    def run(self):
        ydl_opts = {'extract_flat': True, 'quiet': True}
        self.log_signal.emit(f"🔍 Đang phân tích Playlist/Kênh: {self.url}")
        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(self.url, download=False)
                if 'entries' in info:
                    urls = [entry.get('url') for entry in info['entries'] if entry.get('url')]
                    self.log_signal.emit(f"✅ Đã bóc tách thành công {len(urls)} video.")
                    self.finished_signal.emit(urls)
                else:
                    self.finished_signal.emit([self.url])
        except Exception as e:
            self.log_signal.emit(f"❌ Lỗi phân tích: {str(e)}")
            self.error_signal.emit(str(e))

class AutoSubscribeTask(QThread):
    finished_signal = pyqtSignal(list)
    def __init__(self, urls):
        super().__init__()
        self.urls = urls
    def run(self):
        ydl_opts = {'extract_flat': True, 'quiet': True, 'playlistend': 5} 
        all_urls = []
        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                for url in self.urls:
                    info = ydl.extract_info(url, download=False)
                    if 'entries' in info:
                        urls = [entry.get('url') for entry in info['entries'] if entry.get('url')]
                        all_urls.extend(urls)
        except: pass
        self.finished_signal.emit(all_urls)

class VideoDownloadTask(QThread):
    progress_signal = pyqtSignal(str, int, str) 
    speed_signal = pyqtSignal(str, str)       
    status_signal = pyqtSignal(str, str)      
    finished_signal = pyqtSignal(str, bool)
    info_signal = pyqtSignal(str, dict)
    log_signal = pyqtSignal(str)

    def __init__(self, task_id, url, save_path, audio_only, quality, smart_folder, download_subs, bandwidth_limit, use_archive, connections, custom_format=None):
        super().__init__()
        self.task_id = task_id
        self.url = url
        self.save_path = save_path
        self.audio_only = audio_only
        self.quality = quality
        self.smart_folder = smart_folder
        self.download_subs = download_subs
        self.bandwidth_limit = bandwidth_limit
        self.use_archive = use_archive
        self.connections = connections 
        self.custom_format = custom_format 
        self.info_emitted = False
        self.is_cancelled = False 

    def progress_hook(self, d):
        if self.is_cancelled:
            raise Exception("CANCELLED_BY_USER")

        if not self.info_emitted and 'info_dict' in d:
            info = d['info_dict']
            title = info.get('title', 'Unknown')
            thumb_url = info.get('thumbnail')
            size = info.get('filesize') or info.get('filesize_approx') or 0
            
            thumb_path = ""
            if thumb_url:
                try:
                    req = urllib.request.Request(thumb_url, headers={'User-Agent': 'Mozilla/5.0'})
                    data = urllib.request.urlopen(req, timeout=3).read()
                    thumb_path = os.path.join(tempfile.gettempdir(), f"{self.task_id}.jpg")
                    with open(thumb_path, 'wb') as f: f.write(data)
                except: pass
            
            self.info_signal.emit(self.task_id, {"title": title, "thumb": thumb_path, "size": size})
            self.info_emitted = True
            self.log_signal.emit(f"🎬 Bắt đầu tải: {title}")

        if d['status'] == 'downloading':
            percent_clean = re.sub(r'\x1b\[[0-9;]*m', '', d.get('_percent_str', '0%')).replace('%', '')
            dl_bytes = d.get('downloaded_bytes', 0)
            total_bytes = d.get('total_bytes') or d.get('total_bytes_estimate', 0)
            
            prog_text = f"{format_size(dl_bytes)} / {format_size(total_bytes)}" if total_bytes > 0 else format_size(dl_bytes)
                
            try:
                self.progress_signal.emit(self.task_id, int(float(percent_clean)), prog_text)
            except ValueError: pass
            
            speed_clean = re.sub(r'\x1b\[[0-9;]*m', '', d.get('_speed_str', 'N/A'))
            self.speed_signal.emit(self.task_id, speed_clean)
            self.status_signal.emit(self.task_id, "Đang tải...")

        elif d['status'] == 'finished':
            self.status_signal.emit(self.task_id, "Đang xử lý (FFmpeg)...")

    def run(self):
        self.status_signal.emit(self.task_id, "Đang khởi tạo...")
        
        base_template = '%(extractor_key)s/%(uploader)s/%(title).200s.%(ext)s' if self.smart_folder else '%(title).200s.%(ext)s'
        outtmpl = os.path.join(self.save_path, base_template)

        ydl_opts = {
            'outtmpl': outtmpl,
            'progress_hooks': [self.progress_hook],
            'quiet': True, 'no_warnings': True, 'nocheckcertificate': True,
            'ignoreerrors': True, 
            'merge_output_format': 'mp4',
            # 'restrictfilenames': False,  <-- Đã loại bỏ để cho phép lưu tên tiếng Việt có dấu đầy đủ
            'concurrent_fragment_downloads': self.connections,
            'nocheckcertificate': True,
            'extractor_args': {'youtube': {'player_client': ['tv', 'web'], 'player_skip': ['webpage', 'configs']}},
        }

        # Check for cookies.txt in common locations
        cookies_candidates = [
            'cookies.txt', 
            '../cookies.txt', 
            'backend/cookies.txt',
            os.path.join(os.path.dirname(__file__), 'cookies.txt'),
            os.path.join(os.path.dirname(__file__), 'backend', 'cookies.txt')
        ]
        for cp in cookies_candidates:
            if os.path.exists(cp):
                ydl_opts['cookiefile'] = cp
                self.log_signal.emit(f"🍪 Sử dụng cookies từ file: {cp}")
                break

        if self.use_archive:
            ydl_opts['download_archive'] = os.path.join(self.save_path, 'downloaded_archive.txt')
        if self.bandwidth_limit > 0:
            ydl_opts['ratelimit'] = int(self.bandwidth_limit * 1024 * 1024)
        if self.download_subs:
            ydl_opts['writesubtitles'] = True
            ydl_opts['subtitleslangs'] = ['en', 'vi', 'all']

        if self.custom_format == 'audio' or (not self.custom_format and self.audio_only):
            ydl_opts['format'] = 'bestaudio/best'
            ydl_opts['postprocessors'] = [{'key': 'FFmpegExtractAudio', 'preferredcodec': 'mp3', 'preferredquality': '192'}]
        elif self.custom_format:
            ydl_opts['format'] = self.custom_format
        else:
            formats = {"1080p": 'bestvideo[height<=1080]+bestaudio/best', "720p": 'bestvideo[height<=720]+bestaudio/best', "480p": 'bestvideo[height<=480]+bestaudio/best'}
            ydl_opts['format'] = formats.get(self.quality, 'bestvideo+bestaudio/best')

        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                ydl.download([self.url])
                
            if self.is_cancelled: return
            
            self.progress_signal.emit(self.task_id, 100, "Hoàn tất")
            self.status_signal.emit(self.task_id, "Hoàn thành")
            self.finished_signal.emit(self.task_id, True)
            
        except Exception as e:
            if "CANCELLED_BY_USER" in str(e):
                self.status_signal.emit(self.task_id, "Đã hủy")
            else:
                self.status_signal.emit(self.task_id, "Lỗi tải xuống")
                self.log_signal.emit(f"❌ Lỗi: {str(e)}")
            self.finished_signal.emit(self.task_id, False)

# ==========================================
# 4. GIAO DIỆN CHÍNH (MAIN WINDOW)
# ==========================================
class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("Auto Video Downloader - Mindz")
        self.resize(1200, 780)
        self.setWindowIcon(self.style().standardIcon(QStyle.StandardPixmap.SP_ArrowDown))
        self.setAcceptDrops(True)

        self.active_threads = []
        self.queue_tasks = [] 
        self.task_formats = {} 
        
        self.subscribed_channels = []
        self.seen_urls = set() 
        
        self.sort_orders = {1: Qt.SortOrder.AscendingOrder, 2: Qt.SortOrder.AscendingOrder, 
                            3: Qt.SortOrder.AscendingOrder, 5: Qt.SortOrder.AscendingOrder}
        
        self.schedule_timer = QTimer()
        self.schedule_timer.timeout.connect(self.check_schedule)
        self.auto_sub_timer = QTimer()
        self.auto_sub_timer.timeout.connect(self.run_auto_subscribe)
        
        self.setup_ui()
        self.setup_system_tray()
        self.apply_dark_theme()
        
        self.clipboard = QApplication.clipboard()
        self.clipboard.dataChanged.connect(self.on_clipboard_change)
        self.last_clipboard_text = ""

        self.log_message("✅ Hệ thống đã sẵn sàng! Bạn có thể kéo thả file .txt hoặc hyperlink vào phần mềm.")

    def setup_system_tray(self):
        self.tray_icon = QSystemTrayIcon(self)
        self.tray_icon.setIcon(self.style().standardIcon(QStyle.StandardPixmap.SP_ArrowDown))
        tray_menu = QMenu()
        tray_menu.addAction("Mở ứng dụng").triggered.connect(self.show)
        tray_menu.addAction("Thoát").triggered.connect(QApplication.instance().quit)
        self.tray_icon.setContextMenu(tray_menu)
        self.tray_icon.show()

    def show_notification(self, title, message):
        self.tray_icon.showMessage(title, message, QSystemTrayIcon.MessageIcon.Information, 5000)

    def dragEnterEvent(self, event):
        if event.mimeData().hasUrls() or event.mimeData().hasText():
            event.accept()
        else:
            event.ignore()

    def dropEvent(self, event):
        mime_data = event.mimeData()
        if mime_data.hasUrls():
            for url in mime_data.urls():
                if url.isLocalFile():
                    file_path = url.toLocalFile()
                    if file_path.endswith('.txt'):
                        try:
                            with open(file_path, 'r', encoding='utf-8') as f:
                                content = f.read()
                                self.txt_links.append(content)
                                self.add_to_queue()
                                self.log_message(f"📂 Đã nạp link từ file: {os.path.basename(file_path)}")
                        except Exception as e:
                            self.log_message(f"❌ Lỗi đọc file txt: {e}")
                else:
                    # Kéo thả hyperlink trực tiếp từ trình duyệt web
                    web_url = url.toString()
                    self.txt_links.append(web_url)
                    self.add_to_queue()
        elif mime_data.hasText():
            self.txt_links.append(mime_data.text())
            self.add_to_queue()

    def setup_ui(self):
        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        main_layout = QVBoxLayout(central_widget)

        main_splitter = QSplitter(Qt.Orientation.Vertical)
        
        top_widget = QWidget()
        top_layout = QHBoxLayout(top_widget)
        top_layout.setContentsMargins(0,0,0,0)

        left_panel = QVBoxLayout()
        left_panel.setContentsMargins(0, 0, 10, 0)

        input_group = QGroupBox("Danh sách Link (Hỗ trợ Kéo Thả trực tiếp)")
        input_layout = QVBoxLayout()
        self.txt_links = QTextEdit()
        self.txt_links.setPlaceholderText("Dán link Youtube, Tiktok... vào đây.\nHỗ trợ kéo thả trực tiếp Hyperlink hoặc file .txt vào ứng dụng.")
        input_layout.addWidget(self.txt_links)
        
        btn_layout = QHBoxLayout()
        
        self.btn_smart_info = QPushButton("💡 Smart Info")
        self.btn_smart_info.setToolTip("Hiển thị Menu chọn chất lượng của riêng Video này")
        self.btn_smart_info.setStyleSheet("background-color: #f9e2af; color: #11111b;")
        self.btn_smart_info.clicked.connect(self.open_smart_info)
        
        self.btn_extract_playlist = QPushButton("Phân tích Playlist")
        self.btn_extract_playlist.setStyleSheet("background-color: #89b4fa; color: #11111b;")
        self.btn_extract_playlist.clicked.connect(self.extract_playlist)
        
        self.btn_subscribe = QPushButton("📌 Quản lý Kênh theo dõi")
        self.btn_subscribe.setStyleSheet("background-color: #cba6f7; color: #11111b;")
        self.btn_subscribe.clicked.connect(self.manage_subscriptions)
        
        self.btn_add_queue = QPushButton("Thêm vào Hàng đợi ➔")
        self.btn_add_queue.setStyleSheet("background-color: #a6e3a1; color: #11111b;")
        self.btn_add_queue.clicked.connect(self.add_to_queue)
        
        btn_layout.addWidget(self.btn_smart_info)
        btn_layout.addWidget(self.btn_extract_playlist)
        btn_layout.addWidget(self.btn_subscribe)
        btn_layout.addWidget(self.btn_add_queue)
        input_layout.addLayout(btn_layout)
        input_group.setLayout(input_layout)
        left_panel.addWidget(input_group)

        settings_group = QGroupBox("Cài đặt Thư mục & Dữ liệu")
        settings_layout = QVBoxLayout()
        
        folder_layout = QHBoxLayout()
        self.txt_folder = QLineEdit(os.path.join(os.path.expanduser("~"), "Downloads"))
        self.txt_folder.setReadOnly(True)
        btn_browse = QPushButton("Chọn Thư mục")
        btn_browse.clicked.connect(self.choose_folder)
        folder_layout.addWidget(self.txt_folder)
        folder_layout.addWidget(btn_browse)
        settings_layout.addLayout(folder_layout)
        
        opt_layout1 = QHBoxLayout()
        self.chk_audio_only = QCheckBox("Chỉ tải Âm thanh (MP3)")
        self.chk_clipboard = QCheckBox("Bật Giám sát Clipboard")
        self.chk_always_on_top = QCheckBox("Luôn ở trên cùng")
        self.chk_always_on_top.stateChanged.connect(self.toggle_always_on_top)
        
        opt_layout1.addWidget(self.chk_audio_only)
        opt_layout1.addWidget(self.chk_clipboard)
        opt_layout1.addWidget(self.chk_always_on_top)
        settings_layout.addLayout(opt_layout1)

        opt_layout2 = QHBoxLayout()
        self.chk_smart_folder = QCheckBox("Tạo Thư mục con")
        self.chk_smart_folder.setChecked(True)
        self.chk_subtitles = QCheckBox("Tải Phụ đề")
        self.chk_archive = QCheckBox("Chống trùng lặp")
        self.chk_archive.setChecked(True)
        opt_layout2.addWidget(self.chk_smart_folder)
        opt_layout2.addWidget(self.chk_subtitles)
        opt_layout2.addWidget(self.chk_archive)
        settings_layout.addLayout(opt_layout2)

        settings_group.setLayout(settings_layout)
        left_panel.addWidget(settings_group)
        
        auto_group = QGroupBox("Quản lý Tài nguyên & Tự động hóa")
        auto_layout = QVBoxLayout()
        
        res_layout = QHBoxLayout()
        res_layout.addWidget(QLabel("Số Video tải song song:"))
        self.spin_threads = QSpinBox()
        self.spin_threads.setRange(1, 10)
        self.spin_threads.setValue(3)
        res_layout.addWidget(self.spin_threads)
        res_layout.addStretch()
        res_layout.addWidget(QLabel("Luồng/Video (Tăng tốc):"))
        self.spin_connections = QSpinBox()
        self.spin_connections.setRange(1, 32)
        self.spin_connections.setValue(4)
        res_layout.addWidget(self.spin_connections)
        auto_layout.addLayout(res_layout)
        
        sched_layout = QHBoxLayout()
        self.chk_schedule = QCheckBox("Lập lịch lúc:")
        self.time_schedule = QTimeEdit()
        self.time_schedule.setDisplayFormat("HH:mm")
        self.time_schedule.setTime(QTime.currentTime())
        sched_layout.addWidget(self.chk_schedule)
        sched_layout.addWidget(self.time_schedule)
        sched_layout.addStretch()
        self.chk_shutdown = QCheckBox("Tự động tắt PC khi xong")
        sched_layout.addWidget(self.chk_shutdown)
        auto_layout.addLayout(sched_layout)

        auto_sub_layout = QHBoxLayout()
        self.chk_auto_sub = QCheckBox("Tự động quét Kênh theo dõi định kỳ mỗi:")
        self.chk_auto_sub.stateChanged.connect(self.toggle_auto_subscribe)
        self.spin_auto_sub = QSpinBox()
        self.spin_auto_sub.setRange(1, 1440)
        self.spin_auto_sub.setValue(60)
        self.spin_auto_sub.setSuffix(" phút")
        auto_sub_layout.addWidget(self.chk_auto_sub)
        auto_sub_layout.addWidget(self.spin_auto_sub)
        auto_sub_layout.addStretch()
        
        qual_layout = QHBoxLayout()
        qual_layout.addWidget(QLabel("Chất lượng:"))
        self.combo_quality = QComboBox()
        self.combo_quality.addItems(["Tốt nhất", "1080p", "720p", "480p"])
        qual_layout.addWidget(self.combo_quality)
        qual_layout.addStretch()
        qual_layout.addWidget(QLabel("Giới hạn mạng (MB/s):"))
        self.spin_bandwidth = QDoubleSpinBox()
        self.spin_bandwidth.setRange(0, 1000)
        qual_layout.addWidget(self.spin_bandwidth)
        
        auto_layout.addLayout(auto_sub_layout)
        auto_layout.addLayout(qual_layout)
        auto_group.setLayout(auto_layout)
        left_panel.addWidget(auto_group)

        action_layout = QHBoxLayout()
        self.btn_start_batch = QPushButton("▶ BẮT ĐẦU TẢI")
        self.btn_start_batch.setObjectName("btnStart")
        self.btn_start_batch.setMinimumHeight(40)
        self.btn_start_batch.clicked.connect(self.start_batch)
        
        self.btn_stop_batch = QPushButton("⏹ DỪNG TẢI")
        self.btn_stop_batch.setObjectName("btnStop")
        self.btn_stop_batch.setMinimumHeight(40)
        self.btn_stop_batch.setEnabled(False)
        self.btn_stop_batch.clicked.connect(self.stop_batch)
        
        self.btn_clear = QPushButton("Xóa danh sách")
        self.btn_clear.setMinimumHeight(40)
        self.btn_clear.clicked.connect(self.clear_table)
        
        action_layout.addWidget(self.btn_start_batch, stretch=2)
        action_layout.addWidget(self.btn_stop_batch, stretch=1)
        action_layout.addWidget(self.btn_clear, stretch=1)
        left_panel.addLayout(action_layout)

        top_layout.addLayout(left_panel, stretch=1)

        self.table = QTableWidget(0, 8)
        self.table.setIconSize(QSize(90, 50))
        self.table.setHorizontalHeaderLabels(["Thumb", "Tên Video", "Dung lượng", "Ngày thêm", "URL", "Trạng thái", "Tiến độ", "Tốc độ"])
        self.table.horizontalHeader().setSectionResizeMode(QHeaderView.ResizeMode.Interactive)
        self.table.setSortingEnabled(False)
        self.table.horizontalHeader().setSortIndicatorShown(True)
        self.table.horizontalHeader().setSectionsClickable(True)
        self.table.horizontalHeader().sectionClicked.connect(self.on_header_clicked)
        self.table.setItemDelegateForColumn(6, ProgressBarDelegate(self.table))
        
        default_widths = [90, 220, 80, 130, 150, 120, 150, 80]
        for i, w in enumerate(default_widths):
            self.table.setColumnWidth(i, w)
            
        self.table.setContextMenuPolicy(Qt.ContextMenuPolicy.CustomContextMenu)
        self.table.customContextMenuRequested.connect(self.show_context_menu)
        
        top_layout.addWidget(self.table, stretch=2)
        main_splitter.addWidget(top_widget)

        log_group = QGroupBox("📝 Nhật ký hoạt động")
        log_layout = QVBoxLayout()
        self.log_console = QTextEdit()
        self.log_console.setReadOnly(True)
        self.log_console.setStyleSheet("background-color: #1e1e2e; border: none; font-family: Consolas; color: #a6adc8; font-size: 9pt;")
        log_layout.addWidget(self.log_console)
        log_layout.setContentsMargins(5, 10, 5, 5)
        log_group.setLayout(log_layout)
        
        main_splitter.addWidget(log_group)
        main_splitter.setSizes([600, 150])
        main_layout.addWidget(main_splitter)

    def apply_dark_theme(self):
        dark_stylesheet = """
        * { color: #f8f8f2; }
        QMainWindow, QWidget, QDialog { background-color: #1e1e2e; }
        QGroupBox { border: 1px solid #45475a; border-radius: 6px; margin-top: 15px; font-weight: bold; color: #89b4fa; }
        QGroupBox::title { subcontrol-origin: margin; left: 10px; padding: 0 5px; background-color: #1e1e2e;}
        QTextEdit, QLineEdit, QSpinBox, QDoubleSpinBox, QComboBox, QTimeEdit {
            background-color: #282a36; border: 1px solid #45475a; border-radius: 4px; padding: 5px; color: #f8f8f2;
        }
        QPushButton { background-color: #45475a; border: none; border-radius: 4px; padding: 8px 15px; font-weight: bold; color: #f8f8f2; }
        QPushButton:hover { background-color: #585b70; }
        QPushButton#btnStart { background-color: #a6e3a1; color: #11111b; font-size: 11pt;}
        QPushButton#btnStart:hover { background-color: #94e2d5; }
        QPushButton#btnStop { background-color: #f38ba8; color: #11111b; font-size: 11pt;}
        QPushButton#btnStop:hover { background-color: #eba0ac; }
        QPushButton#btnStop:disabled { background-color: #585b70; color: #a6adc8; }
        QTableWidget, QListWidget { background-color: #282a36; alternate-background-color: #1e1e2e; gridline-color: #44475a; border: 1px solid #45475a; border-radius: 4px; color: #f8f8f2;}
        QListWidget::item { padding: 5px; }
        QListWidget::item:selected { background-color: #44475a; color: #a6e3a1; }
        QHeaderView::section { background-color: #44475a; padding: 5px; border: 1px solid #282a36; font-weight: bold; color: #f8f8f2; }
        QProgressBar { border: 1px solid #45475a; border-radius: 4px; text-align: center; color: white; background-color: #282a36;}
        QProgressBar::chunk { background-color: #89b4fa; width: 10px; }
        QCheckBox { spacing: 8px; font-weight: bold; }
        QCheckBox::indicator { width: 16px; height: 16px; background-color: #313244; border: 2px solid #585b70; border-radius: 4px; }
        QCheckBox::indicator:hover { border: 2px solid #89b4fa; }
        QCheckBox::indicator:checked { background-color: #a6e3a1; border: 2px solid #a6e3a1; }
        """
        self.setStyleSheet(dark_stylesheet)

    def log_message(self, message):
        timestamp = datetime.now().strftime("[%H:%M:%S]")
        self.log_console.append(f"<span style='color: #cdd6f4;'>{timestamp}</span> {message}")
        scrollbar = self.log_console.verticalScrollBar()
        scrollbar.setValue(scrollbar.maximum())

    def toggle_always_on_top(self):
        if self.chk_always_on_top.isChecked():
            self.setWindowFlags(self.windowFlags() | Qt.WindowType.WindowStaysOnTopHint)
        else:
            self.setWindowFlags(self.windowFlags() & ~Qt.WindowType.WindowStaysOnTopHint)
        self.show()

    def on_clipboard_change(self):
        if not self.chk_clipboard.isChecked(): return
        text = self.clipboard.text().strip()
        if text == self.last_clipboard_text or not text.startswith("http"): return
        self.last_clipboard_text = text
        
        valid_domains = ["youtube", "tiktok", "douyin", "facebook", "vimeo", "dailymotion", "m3u8"]
        if any(domain in text.lower() for domain in valid_domains):
            self.txt_links.setText(text)
            self.add_to_queue()

    def on_header_clicked(self, logicalIndex):
        if logicalIndex in self.sort_orders:
            order = self.sort_orders[logicalIndex]
            self.table.sortItems(logicalIndex, order)
            self.table.horizontalHeader().setSortIndicator(logicalIndex, order)
            self.sort_orders[logicalIndex] = Qt.SortOrder.DescendingOrder if order == Qt.SortOrder.AscendingOrder else Qt.SortOrder.AscendingOrder

    def show_context_menu(self, position):
        menu = QMenu()
        menu.setStyleSheet("QMenu { background-color: #282a36; color: #f8f8f2; border: 1px solid #44475a; } QMenu::item { padding: 8px 25px; } QMenu::item:selected { background-color: #44475a; color: #a6e3a1; }")
        
        open_action = menu.addAction("📁 Mở thư mục lưu")
        retry_action = menu.addAction("🔄 Thử lại link này")
        delete_action = menu.addAction("✖ Xóa dòng đã chọn")
        
        action = menu.exec(self.table.viewport().mapToGlobal(position))
        
        if action == open_action: self.handle_open_folder()
        elif action == retry_action: self.handle_retry_rows()
        elif action == delete_action: self.handle_delete_rows()

    def handle_open_folder(self):
        path = self.txt_folder.text()
        if os.path.exists(path):
            if sys.platform == "win32": os.startfile(path)
            elif sys.platform == "darwin": subprocess.Popen(["open", path])
            else: subprocess.Popen(["xdg-open", path])

    def handle_retry_rows(self):
        selected_rows = set(item.row() for item in self.table.selectedItems())
        count = 0
        for row in sorted(selected_rows):
            status = self.table.item(row, 5).text()
            if status in ["Lỗi tải xuống", "Đã hủy", "Hoàn thành"]:
                task_id = self.table.item(row, 4).data(Qt.ItemDataRole.UserRole)
                
                item = self.table.item(row, 5)
                item.setText("Đang chờ")
                item.setForeground(Qt.GlobalColor.yellow)
                self.table.item(row, 6).setData(Qt.ItemDataRole.UserRole, 0)
                self.table.item(row, 6).setData(Qt.ItemDataRole.ToolTipRole, "")
                self.table.item(row, 7).setText("--")
                
                if task_id not in self.queue_tasks:
                    self.queue_tasks.append(task_id)
                count += 1
                
        if count > 0:
            self.log_message(f"🔄 Đã đưa {count} link trở lại hàng đợi.")
            if not self.btn_stop_batch.isEnabled():
                self.start_batch()

    def handle_delete_rows(self):
        selected_rows = set(item.row() for item in self.table.selectedItems())
        for row in sorted(selected_rows, reverse=True):
            task_id = self.table.item(row, 4).data(Qt.ItemDataRole.UserRole)
            status = self.table.item(row, 5).text()
            if task_id in self.queue_tasks or status in ["Hoàn thành", "Lỗi tải xuống", "Đã hủy"]:
                self.table.removeRow(row)
                if task_id in self.queue_tasks:
                    self.queue_tasks.remove(task_id)

    def get_row_by_task_id(self, task_id):
        for row in range(self.table.rowCount()):
            item = self.table.item(row, 4) 
            if item and item.data(Qt.ItemDataRole.UserRole) == task_id: return row
        return -1

    def choose_folder(self):
        folder = QFileDialog.getExistingDirectory(self, "Chọn thư mục")
        if folder: self.txt_folder.setText(folder)

    def insert_link_to_table(self, url, custom_format=None):
        task_id = str(uuid.uuid4())
        row = self.table.rowCount()
        self.table.insertRow(row)

        self.table.setItem(row, 0, QTableWidgetItem())
        self.table.setItem(row, 1, QTableWidgetItem("---"))
        
        size_item = NumericItem("0 B")
        size_item.setData(Qt.ItemDataRole.UserRole, 0)
        self.table.setItem(row, 2, size_item)
        
        self.table.setItem(row, 3, QTableWidgetItem(datetime.now().strftime("%Y-%m-%d %H:%M:%S")))
        
        url_item = QTableWidgetItem(url)
        url_item.setData(Qt.ItemDataRole.UserRole, task_id) 
        self.table.setItem(row, 4, url_item)
        
        status_item = QTableWidgetItem("Đang chờ")
        status_item.setForeground(Qt.GlobalColor.yellow)
        self.table.setItem(row, 5, status_item)
        
        prog_item = QTableWidgetItem()
        prog_item.setData(Qt.ItemDataRole.UserRole, 0) 
        self.table.setItem(row, 6, prog_item)
        self.table.setItem(row, 7, QTableWidgetItem("--"))
        
        self.queue_tasks.append(task_id)
        if custom_format:
            self.task_formats[task_id] = custom_format

    def add_to_queue(self):
        links = self.txt_links.toPlainText().strip().split('\n')
        count = 0
        for link in links:
            url = link.strip()
            if url.startswith("http") and url not in self.seen_urls:
                self.seen_urls.add(url)
                self.insert_link_to_table(url)
                count += 1
                
        self.txt_links.clear()
        if count > 0: self.log_message(f"🔗 Đã thêm {count} link mới vào hàng đợi.")

    def clear_table(self):
        if self.active_threads and self.btn_stop_batch.isEnabled():
            QMessageBox.warning(self, "Cảnh báo", "Vui lòng ấn 'Dừng tải' trước khi xóa danh sách!")
            return
        self.table.setRowCount(0)
        self.queue_tasks.clear()
        self.log_message("🧹 Đã dọn dẹp sạch danh sách tải.")

    # --- CHỨC NĂNG SMART INFO ---
    def open_smart_info(self):
        text = self.txt_links.toPlainText().strip()
        links = [l.strip() for l in text.split('\n') if l.strip().startswith('http')]
        if not links:
            QMessageBox.warning(self, "Lỗi", "Vui lòng dán ít nhất 1 link hợp lệ vào ô nhập liệu để tra cứu!")
            return
        
        url = links[0] 
        self.log_message(f"💡 Đang tra cứu cấu trúc Smart Info cho: {url}")
        self.btn_smart_info.setEnabled(False)
        self.btn_smart_info.setText("⏳ Đang tra cứu...")
        
        self.smart_extractor = MediaInfoTask(url)
        self.smart_extractor.log_signal.connect(self.log_message)
        self.smart_extractor.finished_signal.connect(self.on_smart_info_ready)
        self.smart_extractor.error_signal.connect(self.on_smart_info_error)
        self.smart_extractor.start()

    def on_smart_info_ready(self, info):
        self.btn_smart_info.setEnabled(True)
        self.btn_smart_info.setText("💡 Smart Info")
        dialog = SmartInfoDialog(info, self)
        if dialog.exec():
            custom_format = dialog.selected_format
            url = info['url']
            self.txt_links.clear()
            self.insert_link_to_table(url, custom_format=custom_format)
            self.log_message(f"✅ Đã chọn định dạng chuyên biệt và nạp vào hàng đợi.")
            
    def on_smart_info_error(self, err):
        self.btn_smart_info.setEnabled(True)
        self.btn_smart_info.setText("💡 Smart Info")
        QMessageBox.critical(self, "Lỗi", f"Không thể lấy thông tin video:\n{err}")

    # --- CHỨC NĂNG QUẢN LÝ KÊNH (MANUAL SUBSCRIPTION) ---
    def manage_subscriptions(self):
        dialog = SubscriptionDialog(self.subscribed_channels, self)
        dialog.exec()
        if self.subscribed_channels and not self.chk_auto_sub.isChecked():
            self.chk_auto_sub.setChecked(True)

    def toggle_auto_subscribe(self):
        if self.chk_auto_sub.isChecked():
            minutes = self.spin_auto_sub.value()
            self.auto_sub_timer.start(minutes * 60 * 1000)
            self.log_message(f"📡 Đã BẬT Auto-Subscribe. Sẽ quét lại Kênh mỗi {minutes} phút.")
            self.run_auto_subscribe()
        else:
            self.auto_sub_timer.stop()
            self.log_message("📡 Đã TẮT Auto-Subscribe.")

    def run_auto_subscribe(self):
        if not self.subscribed_channels: return
        self.log_message("📡 Đang quét ngầm tìm video mới từ các Kênh đã theo dõi...")
        self.sub_extractor = AutoSubscribeTask(self.subscribed_channels)
        self.sub_extractor.finished_signal.connect(self.on_auto_sub_extracted)
        self.sub_extractor.start()

    def on_auto_sub_extracted(self, urls):
        new_urls = [u for u in urls if u not in self.seen_urls]
        if new_urls:
            self.log_message(f"🆕 Phát hiện {len(new_urls)} video mới từ Kênh! Đang tự động nạp...")
            for url in new_urls:
                self.seen_urls.add(url)
                self.insert_link_to_table(url)
            if not self.btn_stop_batch.isEnabled():
                self.start_batch()
        else:
            self.log_message("✅ Quét xong. Chưa có video nào mới từ Kênh.")

    def extract_playlist(self):
        links = self.txt_links.toPlainText().strip().split('\n')
        if not links or not links[0]: return
        self.btn_extract_playlist.setEnabled(False)
        self.extractor = PlaylistExtractorTask(links[0])
        self.extractor.log_signal.connect(self.log_message)
        self.extractor.finished_signal.connect(self.on_playlist_extracted)
        self.extractor.start()

    def on_playlist_extracted(self, urls):
        self.btn_extract_playlist.setEnabled(True)
        self.txt_links.clear()
        self.txt_links.setText('\n'.join(urls))
        self.add_to_queue()

    def stop_batch(self):
        self.log_message("⚠️ Lệnh dừng khẩn cấp được kích hoạt. Đang đóng băng luồng tải...")
        self.queue_tasks.clear() 
        
        for worker in self.active_threads:
            worker.is_cancelled = True 
            worker.terminate() 
            worker.wait()      
            
        self.active_threads.clear()
        
        for row in range(self.table.rowCount()):
            status = self.table.item(row, 5).text()
            if status in ["Đang chờ", "Đang tải...", "Đang phân tích...", "Đang xử lý..."]:
                item = self.table.item(row, 5)
                item.setText("Đã hủy")
                item.setForeground(Qt.GlobalColor.red)
        
        self.btn_start_batch.setEnabled(True)
        self.btn_stop_batch.setEnabled(False)
        self.chk_schedule.setEnabled(True)
        self.schedule_timer.stop()
        self.btn_start_batch.setText("▶ BẮT ĐẦU TẢI")

    def start_batch(self):
        if not self.queue_tasks: return
        self.log_message("🚀 Khởi động luồng tải hàng loạt...")
        self.btn_stop_batch.setEnabled(True) 
        
        if self.chk_schedule.isChecked():
            self.schedule_timer.start(1000)
            target = self.time_schedule.time().toString('HH:mm')
            self.btn_start_batch.setText(f"⏳ ĐỢI {target}")
            self.log_message(f"⏰ Đã lập lịch tải tự động vào lúc: {target}")
            self.btn_start_batch.setEnabled(False)
            self.chk_schedule.setEnabled(False)
        else:
            self.execute_start_batch()

    def check_schedule(self):
        if QTime.currentTime().minute() == self.time_schedule.time().minute() and QTime.currentTime().hour() == self.time_schedule.time().hour():
            self.schedule_timer.stop()
            self.chk_schedule.setEnabled(True)
            self.execute_start_batch()

    def execute_start_batch(self):
        self.btn_start_batch.setEnabled(False)
        self.btn_start_batch.setText("ĐANG TẢI...")
        self.check_queue_and_start()

    def check_queue_and_start(self):
        max_threads = self.spin_threads.value()
        self.active_threads = [t for t in self.active_threads if t.isRunning()]

        while self.queue_tasks and len(self.active_threads) < max_threads:
            task_id = self.queue_tasks.pop(0)
            row = self.get_row_by_task_id(task_id)
            if row == -1: continue 
            
            url = self.table.item(row, 4).text()
            save_path = self.txt_folder.text()
            custom_format = self.task_formats.get(task_id)

            worker = VideoDownloadTask(task_id, url, save_path, 
                                        self.chk_audio_only.isChecked(), 
                                        self.combo_quality.currentText(), 
                                        self.chk_smart_folder.isChecked(), 
                                        self.chk_subtitles.isChecked(), 
                                        self.spin_bandwidth.value(), 
                                        self.chk_archive.isChecked(),
                                        self.spin_connections.value(),
                                        custom_format)
            
            worker.log_signal.connect(self.log_message)
            worker.progress_signal.connect(self.update_progress)
            worker.speed_signal.connect(self.update_speed)
            worker.status_signal.connect(self.update_status)
            worker.info_signal.connect(self.update_info)
            worker.finished_signal.connect(self.on_task_finished)
            
            self.active_threads.append(worker)
            worker.start()

        if not self.queue_tasks and len(self.active_threads) == 0:
            self.btn_start_batch.setEnabled(True)
            self.btn_stop_batch.setEnabled(False)
            self.btn_start_batch.setText("▶ BẮT ĐẦU TẢI")
            
            self.show_notification("Hoàn thành", "Tất cả các video trong danh sách đã được tải xong!")
            self.log_message("🎉 Đã tải xong toàn bộ danh sách.")
            
            if self.chk_shutdown.isChecked() and os.name == 'nt':
                os.system("shutdown /s /t 60")
                self.log_message("⚠️ Hệ thống sẽ TẮT sau 60 giây!")
                QMessageBox.warning(self, "Auto Shutdown", "PC sẽ tắt sau 60 giây.\nGõ 'shutdown /a' vào CMD để hủy bỏ.")

    def update_info(self, task_id, info):
        row = self.get_row_by_task_id(task_id)
        if row == -1: return
        
        if info.get('thumb') and os.path.exists(info['thumb']):
            pixmap = QPixmap(info['thumb']).scaled(80, 45, Qt.AspectRatioMode.KeepAspectRatioByExpanding, Qt.TransformationMode.SmoothTransformation)
            self.table.item(row, 0).setData(Qt.ItemDataRole.DecorationRole, QIcon(pixmap))
            
        if info.get('title'):
            self.table.item(row, 1).setText(info['title'])
            
        if info.get('size'):
            size_item = self.table.item(row, 2)
            size_item.setData(Qt.ItemDataRole.UserRole, info['size'])
            size_item.setText(format_size(info['size']))

    def update_progress(self, task_id, percent, text=""):
        row = self.get_row_by_task_id(task_id)
        if row != -1:
            item = self.table.item(row, 6)
            item.setData(Qt.ItemDataRole.UserRole, percent)
            item.setData(Qt.ItemDataRole.ToolTipRole, text)

    def update_speed(self, task_id, speed):
        row = self.get_row_by_task_id(task_id)
        if row != -1: self.table.item(row, 7).setText(speed)

    def update_status(self, task_id, status):
        row = self.get_row_by_task_id(task_id)
        if row != -1:
            item = self.table.item(row, 5)
            item.setText(status)
            if "Hoàn thành" in status: item.setForeground(Qt.GlobalColor.green)
            elif "Lỗi" in status or "hủy" in status.lower(): item.setForeground(Qt.GlobalColor.red)
            else: item.setForeground(Qt.GlobalColor.cyan)

    def on_task_finished(self, task_id, success):
        QTimer.singleShot(0, self.check_queue_and_start)

if __name__ == "__main__":
    app = QApplication(sys.argv)
    app.setStyle("Fusion")
    window = MainWindow()
    window.show()
    sys.exit(app.exec())