"""用 EasyOCR 读取图片中的文字内容"""
import easyocr
import sys

img_path = r'D:\atmow\sagent\img\知识点学习模版.png'
print("正在初始化 OCR 模型（首次运行需下载模型，请稍候）...")
reader = easyocr.Reader(['ch_sim', 'en'], gpu=False)
print("模型加载完成，开始识别...")

results = reader.readtext(img_path)

# 按位置从上到下、从左到右排序
results.sort(key=lambda x: (x[0][0][1], x[0][0][0]))

print("\n=== 识别结果 ===\n")
for (bbox, text, conf) in results:
    x, y = int(bbox[0][0]), int(bbox[0][1])
    print(f"[{x:4d},{y:4d}] ({conf:.2f}) {text}")

print("\n=== 纯文本（按行）===\n")
for (bbox, text, conf) in results:
    print(text)
