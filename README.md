# SVG Editor · 第一版 CLI 与领域模型

TypeScript 面向对象实现的 Lab1 Phase 1 SVG 编辑器。当前版本完成内存编辑闭环；
SVG 文件读写是下一轮工作，本版本还不能作为整个 lab 的最终交付。

## 启动与检查

要求 Node.js 24+。以下命令在项目目录运行；Windows PowerShell 使用 npm.cmd。

    npm.cmd ci
    npm.cmd run cli
    npm.cmd run typecheck
    npm.cmd test
    npm.cmd run build
    node dist/main.js

交互模式显示 svg>，Ctrl+C 或 EOF 退出；脚本模式不输出提示符。

    Get-Content -LiteralPath .\examples\flowchart.txt -Encoding UTF8 | npm.cmd run cli

## 尝试一次编辑

    init 800 600
    create g scene
    create rect r1 10 20 100 50 #4a90d9 in scene
    create text label 20 50 "开始" in scene
    move scene 30 0
    tree
    undo
    redo
    help

## 当前范围

- 已实现：init、canvas、六种图形的 create（含 in）、delete、move、scale、
  set、group、ungroup、addto、front、back、tree、show、help、undo、redo。
- read/save 仅保留命令入口并明确报未实现，不操作文件、不改变历史。
- 后续完成：SVG 解析与序列化、导入补 id、文件路径管理、读写错误与历史屏障、
  SVG 往返验证和浏览器预览。
- box 和插件机制属于后续阶段，不在本阶段范围内。

架构方案、实现约定、协作记录及质量保证见 [doc/README.md](doc/README.md)。
