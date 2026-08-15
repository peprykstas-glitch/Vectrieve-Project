import numpy as np
from PIL import Image, ImageDraw, ImageFont

def create_perfect_transparent_assets():
    # 1. Clean icon:
    icon_raw = Image.open(r"c:\Projects\Project X\Vectrieve\vectrieve-frontend\public\logo-icon.jpg").convert("RGBA")
    data = np.array(icon_raw)
    r, g, b, a = data[:, :, 0], data[:, :, 1], data[:, :, 2], data[:, :, 3]
    
    # Background is white / near white
    brightness = (r.astype(int) + g.astype(int) + b.astype(int)) / 3.0
    diff_rg = np.abs(r.astype(int) - g.astype(int))
    diff_gb = np.abs(g.astype(int) - b.astype(int))
    diff_rb = np.abs(r.astype(int) - b.astype(int))
    is_gray = (diff_rg < 20) & (diff_gb < 20) & (diff_rb < 20)
    
    # Flood fill from borders
    from collections import deque
    h, w, _ = data.shape
    visited = np.zeros((h, w), dtype=bool)
    bg_mask = np.zeros((h, w), dtype=bool)
    queue = deque()
    
    for x in range(w):
        for y in [0, h - 1]:
            if brightness[y, x] > 200 and is_gray[y, x]:
                queue.append((y, x))
                visited[y, x] = True
                bg_mask[y, x] = True
    for y in range(h):
        for x in [0, w - 1]:
            if not visited[y, x] and brightness[y, x] > 200 and is_gray[y, x]:
                queue.append((y, x))
                visited[y, x] = True
                bg_mask[y, x] = True
                
    while queue:
        cy, cx = queue.popleft()
        for dy, dx in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
            ny, nx = cy + dy, cx + dx
            if 0 <= ny < h and 0 <= nx < w and not visited[ny, nx]:
                if brightness[ny, nx] > 210 and is_gray[ny, nx]:
                    visited[ny, nx] = True
                    bg_mask[ny, nx] = True
                    queue.append((ny, nx))
                elif brightness[ny, nx] > 175 and is_gray[ny, nx]:
                    visited[ny, nx] = True
                    bg_mask[ny, nx] = True
                    queue.append((ny, nx))
                    
    alpha = np.full((h, w), 255, dtype=np.uint8)
    for y in range(h):
        for x in range(w):
            if bg_mask[y, x]:
                if brightness[y, x] >= 240:
                    alpha[y, x] = 0
                else:
                    alpha[y, x] = int(np.clip((240 - brightness[y, x]) / 50.0 * 255, 0, 255))
                    
    data[:, :, 3] = alpha
    icon_img = Image.fromarray(data)
    bbox = icon_img.getbbox()
    if bbox:
        icon_img = icon_img.crop(bbox)
        
    icon_out_path = r"c:\Projects\Project X\Vectrieve\vectrieve-frontend\public\logo-icon.png"
    icon_img.save(icon_out_path, "PNG")
    print(f"Saved {icon_out_path}, size: {icon_img.size}")
    
    # 2. Also build a high-res wide logo.png with the clean icon + crisp typography
    # Target height 120px for high DPI
    target_h = 120
    ratio = target_h / icon_img.height
    target_w = int(icon_img.width * ratio)
    icon_resized = icon_img.resize((target_w, target_h), Image.Resampling.LANCZOS)
    
    # Try finding system bold sans font
    font_paths = [
        "C:/Windows/Fonts/segoeuib.ttf",
        "C:/Windows/Fonts/arialbd.ttf",
        "C:/Windows/Fonts/calibrib.ttf",
    ]
    font_main = None
    for fp in font_paths:
        try:
            font_main = ImageFont.truetype(fp, 78)
            font_ai = ImageFont.truetype(fp, 36)
            break
        except Exception:
            continue
            
    if font_main is None:
        font_main = ImageFont.load_default()
        font_ai = ImageFont.load_default()
        
    # Measure text
    dummy_img = Image.new("RGBA", (1, 1))
    draw_dummy = ImageDraw.Draw(dummy_img)
    text_bbox = draw_dummy.textbbox((0, 0), "Vectrieve", font=font_main)
    ai_bbox = draw_dummy.textbbox((0, 0), "AI", font=font_ai)
    
    text_w = text_bbox[2] - text_bbox[0]
    ai_w = ai_bbox[2] - ai_bbox[0]
    
    gap = 28
    total_w = target_w + gap + text_w + 14 + ai_w + 20
    total_h = target_h
    
    canvas = Image.new("RGBA", (total_w, total_h), (0, 0, 0, 0))
    canvas.paste(icon_resized, (0, 0), icon_resized)
    
    draw = ImageDraw.Draw(canvas)
    text_y = (target_h - (text_bbox[3] - text_bbox[1])) // 2 - 4
    draw.text((target_w + gap, text_y), "Vectrieve", font=font_main, fill=(255, 255, 255, 255))
    
    # Draw gradient or bright cyan "AI"
    ai_x = target_w + gap + text_w + 14
    ai_y = text_y + 8
    draw.text((ai_x, ai_y), "AI", font=font_ai, fill=(0, 212, 255, 255))
    
    logo_out_path = r"c:\Projects\Project X\Vectrieve\vectrieve-frontend\public\logo.png"
    canvas.save(logo_out_path, "PNG")
    print(f"Saved {logo_out_path}, size: {canvas.size}")

if __name__ == "__main__":
    create_perfect_transparent_assets()
