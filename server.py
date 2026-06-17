"""nailong画廊 - 自定义HTTP服务器，含 /api/ima2 动态扫描接口"""
import os
import json
import http.server
import socketserver
import urllib.parse

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
IMA2_DIR = os.path.join(BASE_DIR, 'ima2')
PORT = 8000

VALID_EXT = {'.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp'}


def scan_ima2():
    """扫描 ima2/ 文件夹，返回图片文件名列表（按名称排序）"""
    if not os.path.isdir(IMA2_DIR):
        return []
    files = []
    for f in os.listdir(IMA2_DIR):
        full = os.path.join(IMA2_DIR, f)
        if os.path.isfile(full) and os.path.splitext(f)[1].lower() in VALID_EXT:
            files.append(f)
    return sorted(files)


class GalleryHandler(http.server.SimpleHTTPRequestHandler):
    """自定义请求处理器"""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=BASE_DIR, **kwargs)

    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        super().end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)

        # /api/ima2 — 返回 ima2 文件夹中所有图片文件列表
        if parsed.path == '/api/ima2':
            images = scan_ima2()
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps(
                {'images': images, 'count': len(images)},
                ensure_ascii=False
            ).encode('utf-8'))
            return

        # /api/gallery — 返回 images/ 文件夹的分级图片列表
        if parsed.path == '/api/gallery':
            from generate_manifest import scan_tier, scan_flat, IMAGES_DIR, TIER_ORDER
            tiers = []
            for name in TIER_ORDER:
                sub = os.path.join(IMAGES_DIR, name)
                files = scan_tier(sub)
                if files:
                    tiers.append({'folder': name, 'label': name.split('-', 1)[0], 'images': files})
            loose = scan_flat(IMAGES_DIR)
            if loose:
                tiers.append({'folder': '', 'label': '未分类', 'images': loose})
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps({'tiers': tiers}, ensure_ascii=False).encode('utf-8'))
            return

        # 默认：静态文件服务
        super().do_GET()


def main():
    with socketserver.TCPServer(("", PORT), GalleryHandler) as httpd:
        print(f"nailong Gallery server running at http://localhost:{PORT}")
        print(f"API: http://localhost:{PORT}/api/ima2")
        print("Press Ctrl+C to stop")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped.")


if __name__ == '__main__':
    main()
