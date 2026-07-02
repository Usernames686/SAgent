import json

data = json.load(open(r'D:\atmow\sagent\_all_kp.json', 'r', encoding='utf-8'))

# Find all knowledge points related to operators
print("=== 运算符与表达式相关知识点 ===")
for k in data:
    domain = k.get('domain', '')
    name = k.get('name', '')
    nodeId = k.get('nodeId', '')
    if '运算' in domain or '运算' in name or 'operator' in domain.lower() or 'expression' in domain.lower():
        print(f"  nodeId={nodeId}  name={name}  domain={domain}")

print()
print("=== 所有域(domain)列表 ===")
domains = set(k.get('domain','') for k in data)
for d in sorted(domains):
    count = sum(1 for k in data if k.get('domain','') == d)
    print(f"  {d} ({count}个)")

print()
print("=== 总数 ===")
print(f"  共 {len(data)} 个知识点")
