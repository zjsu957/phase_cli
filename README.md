# SVG Editor · 第二版 SVG 文件读写

TypeScript 面向对象实现的 Lab1 Phase 1 SVG 编辑器。
第二版已支持从 CLI 编辑、保存 SVG、在浏览器预览，再读回继续编辑。

## 启动与检查

要求 Node.js 24+。以下命令在项目目录运行；Windows PowerShell 使用 npm.cmd。

    npm.cmd ci
    npm.cmd run cli
    npm.cmd run typecheck
    npm.cmd test
    npm.cmd run build
    node dist/main.js

交互模式显示 svg>，Ctrl+C 或 EOF 退出；脚本模式不输出提示符。
升级代码后先退出旧 CLI，再执行 npm.cmd run cli，确保加载第二版代码。

    Get-Content -LiteralPath .\examples\flowchart.txt -Encoding UTF8 | npm.cmd run cli

脚本中 save 后的 undo 预期报错，用于演示文档命令的撤销屏障。

## 尝试一次编辑

    init 800 600
    create g scene
    create rect r1 10 20 100 50 #4a90d9 in scene
    create text label 20 50 "开始" in scene
    move scene 30 0
    tree
    undo
    redo
    save demo.svg
    help

## 预览生成的 SVG

执行 save demo.svg 后，文件位于启动 CLI 时的当前目录。
将 demo.svg 拖入 Edge/Chrome，或通过文件资源管理器选择“打开方式”。
VS Code 也可以安装 SVG Preview 扩展进行预览。

CLI 编辑不会自动刷新磁盘上的文件。修改后再次执行 save，再刷新浏览器页面。
成功保存会建立新的撤销历史基线：紧接着 undo/redo 报错，下一条编辑后重新允许撤销。

    move scene 10 0
    save

save 不带路径时使用最近一次成功 read/save 的路径。
init 会清空路径；新文档第一次保存必须显式给出文件名。
文件名含空格时使用双引号，例如 save "my diagram.svg"。
命令提示符 svg> 内只能输入编辑器命令，PowerShell 命令应在退出 CLI 后运行。

## 导入 SVG

    read examples/other.svg
    tree
    set c1 fill red
    save imported.svg

示例会为无 id 的矩形分配 rect1 并打印 warning。
缺 id 按类型计数，提前避开整个文件已经使用的 id；重复的显式 id 报错。
保存成功会原子替换目标文件，读取或保存失败保留当前文档、路径和撤销重做历史。

支持本 lab 的六种元素、嵌套、数值/px 几何属性和常用展示属性。
导入时保留 viewBox、transform、字体属性和 data-* 元数据；
CLI 的 set 白名单仍遵循 lab，不额外开放 transform/font-size 等属性。
带 transform 的图形按 SVG 本地坐标编辑，不把矩阵展开为画布坐标。
外部 SVG 的 path、CSS style、tspan、百分比几何值等当前不支持，
会明确报错，避免悄悄丢失内容。DOCTYPE 也不支持。

## 当前范围

- 已实现：init、read、save、canvas、六种图形的 create（含 in）、delete、move、scale、
  set、group、ungroup、addto、front、back、tree、show、help、undo、redo。
- box 和插件机制属于后续阶段，不在本阶段范围内。
- Git 提交保存在本地；远程地址已关联 GitHub，
  是否成功上传应以 git push 的实际输出为准。

架构方案、实现约定、协作记录及质量保证见 [doc/README.md](doc/README.md)。
