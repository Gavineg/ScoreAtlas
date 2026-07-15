# 📊 ScoreAtlas

 
**成绩对比分析工具**

![Vanilla JS](https://img.shields.io/badge/vanilla-JS-f7df1e)
![SheetJS](https://img.shields.io/badge/sheetjs-0.20-blue)
![Chart.js](https://img.shields.io/badge/chart.js-4.4-ff6384)
![License](https://img.shields.io/badge/license-MIT-green)

---

## 这是什么

**ScoreAtlas** 是一个纯静态的成绩对比分析工具。拖入多次考试的成绩 Excel 文件，自动按姓名关联同一学生，横向对比各科进退步，生成走势图和导出表格。

班主任、年级组长、家长、学生自己 —— 都适用。

## 核心能力

- **多文件 Excel 解析** — 支持 `.xlsx` / `.xls`，自动探测表头行，智能匹配科目列（语文/英语/物理等）、总分列、排名列（班级/年级/校级），列顺序和表头名称差异全自动处理
- **跨文件学生匹配** — 姓名去空格后精确关联，缺考学生保留并醒目标红
- **拖拽排序考试顺序** — 卡片拖拽调整对比列序，实时刷新结果
- **对比结果表格** — 每科两列（成绩序列 + 进退值），进退红绿标记，排名 ↑↓ 标识，姓名列 sticky 固定，横向滚动
- **展开式个人走势图** — 点击任意学生行展开 Chart.js 走势面板：单科折线图、总分柱状图、排名反转折线图，缺考段虚线断开
- **导出** — 导出 `.xlsx`（多列对比格式）或 `.csv`（UTF-8 BOM）
- **新手指引** — 首次访问 4 步分阶段引导，localStorage 记忆完成状态

## 快速开始

```bash
git clone https://github.com/你的用户名/score-atlas.git
cd score-atlas
python -m http.server 8080
# 打开 http://localhost:8080
```

也可以直接部署到 GitHub Pages：push 到仓库，Settings → Pages → Source 选 `main` 分支根目录即可。

## 项目结构

```
score-atlas/
├── index.html          # 页面骨架
├── README.md
├── css/
│   └── style.css       # 样式 / 动画 / 响应式
└── js/
    ├── config.js       # 关键词映射：科目 / 排名 / 总分 / 姓名
    ├── parser.js       # Excel 解析：表头探测 / 列类型识别
    ├── matcher.js      # 跨文件学生姓名匹配
    ├── analyzer.js     # 成绩进退计算 / 排名变化 / 格式化
    ├── exporter.js     # XLSX 导出 + CSV（UTF-8 BOM）
    ├── charts.js       # Chart.js 走势图：单科 / 总分 / 排名
    ├── ui.js           # UI 渲染：卡片拖拽 / 表格 / 走势面板 / 新手指引
    └── app.js          # 主入口，全局状态管理，模块串联
```

## 技术栈

| 依赖 | 用途 | 加载方式 |
|------|------|----------|
| [SheetJS](https://sheetjs.com/) | Excel 解析与生成 | CDN |
| [Chart.js](https://www.chartjs.org/) | 走势图表 | CDN |
| 零构建工具 | 原生 ES Module | — |

无需 npm install、无需打包。所有 JS 模块通过原生 `import` 加载，两个外部库走 CDN。

## 使用说明

1. **准备 Excel 文件** — 每次考试的成绩单一个文件，表头需包含姓名列和各科成绩列（列名支持常见变体，详见 `config.js`）
2. **拖入文件** — 将 2 个及以上的 Excel 文件拖到上传区
3. **调整排序** — 拖拽考试卡片调整对比列序
4. **查看对比结果** — 表格展示每人的成绩序列和进退值
5. **点击行展开走势图** — 查看单科 / 总分 / 排名趋势
6. **导出** — 点击导出 Excel 或 CSV

## 科目 / 排名关键词映射

修改 `js/config.js` 即可适配不同学校的表头命名习惯：

```js
export const SUBJECT_MAP = {
  '\'u82f1\'u8bed': '\'u82f1\'u8bed', '\'u82f1\'u6587': '\'u82f1\'u8bed', '\'u5916\'u8bed': '\'u82f1\'u8bed',
  '\'u7269\'u7406': '\'u7269\'u7406', '\'u5316\'u5b66': '\'u5316\'u5b66',
  '\'u653f\'u6cbb': '\'u653f\'u6cbb', '\'u9053\'u6cd5': '\'u653f\'u6cbb', '\'u601d\'u653f': '\'u653f\'u6cbb',
  // ...
};
```

总分列、排名列的关键词同样在 `config.js` 中集中配置。

## FAQ

1. **AI规范** - 本Readme.md文件为*DeepSeek-v4-pro*模型生成，本应用前端动画为*DeepSeek-v4-pro*模型生成，计算模块不涉及AI模型生成（纯手敲）
2. **AI相关问题** - 本项目不涉及 AI 模型训练或生成，仅使用 Chart.js 绘制统计图表。

## License

MIT © 2025
