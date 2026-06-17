#!/usr/bin/env python3
"""nailong画廊 - 本地启动脚本（替代start.bat，无编码问题）"""

import os
import sys
import time
import subprocess
import webbrowser
import threading

PROJECT_DIR = os.path.dirname(os.path.abspath(__file__))
PORT = 8000


def run_manifest_scan():
    """运行图片扫描脚本"""
    print("[1/3] 扫描图片文件夹，更新作品清单...")
    py = os.path.join(PROJECT_DIR, "generate_manifest.py")
    if os.path.exists(py):
        result = subprocess.run([sys.executable, py], cwd=PROJECT_DIR, capture_output=True, text=True)
        if result.returncode != 0:
            print("  警告: 扫描脚本执行失败，将使用已有 manifest.js")
    else:
        print("  警告: generate_manifest.py 不存在，跳过扫描")


def start_server():
    """启动自定义HTTP服务器（含API接口）"""
    print(f"[2/3] 启动本地服务器 http://localhost:{PORT} ...")
    server_script = os.path.join(PROJECT_DIR, "server.py")
    os.chdir(PROJECT_DIR)
    proc = subprocess.Popen(
        [sys.executable, server_script],
        cwd=PROJECT_DIR,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    return proc


def open_browser():
    """等待2秒后打开浏览器"""
    print("[3/3] 等待服务器启动...")
    time.sleep(2)
    url = f"http://localhost:{PORT}"
    print(f"正在打开画廊: {url}")
    webbrowser.open(url)


def main():
    print("=" * 40)
    print("  nailong 画廊 - 本地服务器启动器")
    print("=" * 40)
    print()

    # 切换到项目目录
    os.chdir(PROJECT_DIR)

    # 1. 扫描图片
    run_manifest_scan()

    # 2. 启动服务器
    proc = start_server()

    # 3. 打开浏览器
    open_browser()

    print()
    print("画廊已在浏览器中打开！")
    print(f"服务器运行中（进程PID: {proc.pid}）")
    print("关闭此窗口不会停止服务器。")
    print(f"如需停止服务器，请结束 server.py 进程。")
    print()
    input("按 Enter 键退出（服务器继续运行）...")


if __name__ == "__main__":
    main()
