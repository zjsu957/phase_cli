# SVG Editor · 第四版 完整验收与架构检查

TypeScript 面向对象实现的 Lab1 Phase 1 SVG 编辑器。
支持从 CLI 编辑、保存 SVG、在浏览器预览，再读回继续编辑。
第四版增加真实 CLI 进程验收和可执行架构检查，修复 XML 文本往返与命令实例复用问题。

## 启动与检查

要求 Node.js 24+。以下命令在项目目录运行；Windows PowerShell 使用 npm.cmd。

    npm.cmd ci
    npm.cmd run cli
    npm.cmd run typecheck
    npm.cmd test
    npm.cmd run build
    npm.cmd run check
    node dist/main.js

交互模式显示 svg>，Ctrl+C 或 EOF 退出；脚本模式不输出提示符。
升级代码后先退出旧 CLI，再执行 npm.cmd run cli，确保加载新版本代码。
npm.cmd run check 会依次执行类型检查、架构检查、测试和构建，任一步失败就停止。

单独运行第四版的验收与架构检查：

    npm.cmd run test:acceptance
    npm.cmd run check:architecture

当前验证结果为 11 个测试文件、182 项测试通过，43 个生产源码文件通过架构检查。
编译入口已回放流程图，导出的 SVG 已经 Edge 渲染并检查中文文字、节点和连线。
完整的 19 条命令验收矩阵、修复说明及渲染截图见 [第四轮验收记录](doc/acceptance.md)。

## 第四版的改进

- 在真实 Node 子进程中回放 lab 会话，检查输出、错误后继续执行和实际保存的 SVG。
- 验证复杂嵌套编辑序列逐步 undo/redo，拒绝重复执行已成功的同一命令实例，保护已有历史。
- 修复字符引用回车、NEL 和 Unicode 行分隔符在导入导出过程中的文本变化。
- 自动检查模块依赖、运行时依赖环、一类一文件、字段封装及常见 tag 分派写法。
  检查脚本只用于开发；不进入编辑器运行时。

    Get-Content -LiteralPath .\examples\flowchart.txt -Encoding UTF8 | npm.cmd run cli

脚本中 save 后的 undo 预期报错，用于演示文档命令的撤销屏障。

## 第三版的输入规则

- 数值使用十进制或科学计数法，例如 -1.5、+.5、1e2；拒绝 0x10、
  0b10、NaN、Infinity。SVG 导入时还允许 px 单位。
- 带空格的参数使用完整双引号，前后与其他参数用空白分隔；
  "hello"suffix 这类拼接写法会报错。引号内支持转义引号和反斜线。
- create 的 in 子句必须给出容器名；文字内容恰好为 in 时写为 "in"。
- 文字、id、样式中的非法 XML 控制字符会在编辑或导入时拒绝，
  避免等到 save 时才发现文档无法导出。中文、emoji 和合法特殊字符仍然支持。
- 参数缺失或过多时显示 usage；图形类型的具体语法与 help 共用定义。
- 失败命令保留文档和撤销重做历史。

可回放以下脚本观察这些规则；其中四条 error 是预期结果：

    Get-Content -LiteralPath .\examples\round3-validation.txt -Encoding UTF8 | npm.cmd run cli

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
- 前三版已核实上传至 [GitHub](https://github.com/zjsu957/phase_cli)；
  后续迭代各自独立提交，是否已同步以 git push 的实际输出为准。

## 后续迭代

当前为第 4 轮，完整需求验收与架构检查已执行。第 5 轮进行干净环境验证、
使用文档整理和交付；如验收发现需要单独修正的问题，再增加第 6 轮。
每轮均记录实际改动与验证结果，最终验收完成后再创建 final tag。

架构方案、实现约定、协作记录及质量保证见 [doc/README.md](doc/README.md)。
