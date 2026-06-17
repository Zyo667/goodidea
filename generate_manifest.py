"""扫描 images/ 子目录（等级分类）和 ima2/，生成 manifest.js"""
import os, json

BASE = os.path.dirname(os.path.abspath(__file__))
IMAGES_DIR = os.path.join(BASE, 'images')
IMA2_DIR = os.path.join(BASE, 'ima2')

TIER_ORDER = [
    '幻章-限定臻藏',
    '逸境-典藏档',
    '灵构-稀有档',
    '臻描-精良档',
    '浅绘-普通档',
    '初叙-基础档',
]

VALID_EXT = {'.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp'}

def scan_tier(folder):
    if not os.path.isdir(folder):
        return []
    files = sorted([f for f in os.listdir(folder)
                    if os.path.splitext(f)[1].lower() in VALID_EXT])
    return files

def scan_flat(folder):
    if not os.path.isdir(folder):
        return []
    files = sorted([f for f in os.listdir(folder)
                    if os.path.isfile(os.path.join(folder, f))
                    and os.path.splitext(f)[1].lower() in VALID_EXT])
    return files

# Scan tiered folders
tiers = []
for name in TIER_ORDER:
    sub = os.path.join(IMAGES_DIR, name)
    files = scan_tier(sub)
    if files:
        tiers.append({'folder': name, 'label': name.split('-', 1)[0], 'images': files})

# Scan loose images in images/ root as fallback
loose = scan_flat(IMAGES_DIR)
if loose:
    tiers.append({'folder': '', 'label': '未分类', 'images': loose})

# Scan carousel
carousel = scan_flat(IMA2_DIR)

out = os.path.join(BASE, 'manifest.js')
with open(out, 'w', encoding='utf-8') as f:
    f.write('// Auto-generated — 添加/移动图片后运行 python generate_manifest.py\n')
    f.write(f'var GALLERY_TIERS = {json.dumps(tiers, indent=2, ensure_ascii=False)};\n')
    f.write(f'var CAROUSEL_IMAGES = {json.dumps(carousel, indent=2, ensure_ascii=False)};\n')

print(f'[OK] manifest.js 已更新')
for t in tiers:
    print(f'     [{t["label"]}] {len(t["images"])} 张')
print(f'     CAROUSEL_IMAGES: {len(carousel)} 张')
