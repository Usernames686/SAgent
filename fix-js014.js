const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'apps', 'api', 'src', 'modules', 'vibe-learning', 'lecture-content.data.ts');
let content = fs.readFileSync(filePath, 'utf-8');

// JS-014 content
const js014 = `  'JS-014': {
    nodeId: 'JS-014',
    motivation: '生成器和迭代器是 JavaScript 的高级特性 — 它们让你能"暂停"和"恢复"函数执行，实现惰性求值和自定义遍历。掌握它们，你就能处理无限序列、流式数据等复杂场景。',
    concepts: [
      { title: 'Generator 生成器', content: 'function* 声明生成器函数：\n\nfunction* range(start, end) {\n  for (let i = start; i <= end; i++) {\n    yield i; // 暂停并返回值\n  }\n}\n\nconst gen = range(1, 5);\ngen.next(); // { value: 1, done: false }\ngen.next(); // { value: 2, done: false }\n...\ngen.next(); // { value: undefined, done: true }\n\n💡 yield 暂停执行，next() 恢复执行' },
      { title: '可迭代协议与 for...of', content: '可迭代对象：实现 [Symbol.iterator]() 方法\n\n自定义可迭代：\nconst myIterable = {\n  items: ["a", "b", "c"],\n  *[Symbol.iterator]() {\n    for (const item of this.items) yield item;\n  }\n};\n\nfor (const x of myIterable) console.log(x);\n\n💡 生成器天然是可迭代对象' },
    ],
    codeExamples: [
      {
        title: '生成器实战',
        code: `// 无限序列
function* fibonacci() {
  let a = 0, b = 1;
  while (true) {
    yield a;
    [a, b] = [b, a + b];
  }
}

// 只取前10个
const fib = fibonacci();
for (let i = 0; i < 10; i++) {
  console.log(fib.next().value);
}

// 分页数据懒加载
function* paginate(fetcher) {
  let page = 1;
  while (true) {
    const data = fetcher(page);
    if (data.length === 0) return;
    yield data;
    page++;
  }
}`,
        explanation: '生成器最大的价值是"惰性求值" — 值在需要时才计算。无限序列不会死循环，因为每次只取一个值。',
      },
    ],
    summary: '1. function* 声明生成器，yield 暂停并返回值\n2. next() 恢复执行，返回 { value, done }\n3. [Symbol.iterator] 让对象可被 for...of 遍历\n4. 生成器天然是可迭代对象',
    tips: [
      '💡 yield* 可以委托给另一个生成器',
      '⚠️ 生成器是一次性的 — 遍历完不能重用',
      '✅ 惰性求值适合大数据和无限序列',
    ],
    thinkQuestions: [
      '生成器如何实现"惰性求值"？和数组的 map/filter 有什么区别？',
      '为什么 for...of 可以遍历生成器？',
    ],
  },
`;

// Find JS-013 end position
const js13Key = content.indexOf("'JS-013'");
let brace = 0, found = false, js13End = -1;
for (let i = js13Key; i < content.length; i++) {
  if (content[i] === '{') { brace++; found = true; }
  else if (content[i] === '}') {
    brace--;
    if (found && brace === 0) { js13End = i + 1; break; }
  }
}

console.log('JS-013 ends at:', js13End);

// Insert JS-014 after JS-013
const newContent = content.substring(0, js13End) + ',\n\n' + js014 + content.substring(js13End);

fs.writeFileSync(filePath, newContent, 'utf-8');
console.log('JS-014 已插入');
console.log('新文件大小:', newContent.length);
