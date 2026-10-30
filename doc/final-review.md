# 第五轮：Lab Phase 1 最终复核

复核对象为 phase_cli_1.md，交付版本 0.5.0。
结论：Phase 1 的功能、实现范式和文档要求已覆盖并通过下面列出的验证。
box/ShapeProvider 为原文明确排除的后续阶段。

## 按原文章节核对

| Lab 章节 | 要求 | 核对结论与证据 |
|---|---|---|
| 0.1 / 0.2 | 生成普通 SVG，可由浏览器预览 | SvgSerializer 输出 XML、命名空间与子文本；第四轮实际 Edge 截图保存在 qa/ |
| 1.1 | Git、远程、分步开发 | 五轮分别提交；前四轮提交见开发文档；本轮在验收后独立提交和推送 |
| 1.1 | 最终提交的 final 标签 | 交付约束：final 指向第五轮提交；推送后用文末命令核验 |
| 1.1 | 在截止时间前打标签 | 原文未提供具体日期，须结合课程通知自行核对 Git 标签时间 |
| 1.2 | doc/README.md、模块职责、PlantUML、模式、依赖、变化点 | doc/README.md 四个规定章节齐全，architecture.puml 对应当前实现 |
| 1.2 | 真实迭代记录、一致性自查、质量依据 | 开发文档保留五轮决策、失败验证、修正过程和测试结果 |
| 2 | REPL 提示符、逐行、注释 | Repl/Tokenizer；流输入测试、真实子进程及本轮编译入口终端验收 |
| 2 | 全局唯一且大小写敏感的 id、命令用 id 定位 | SvgDocument、Shape；Editor/Composite/SvgCodec 测试 |
| 2 | create/group 显式 id；读入自动命名并警告 | 参数定义与两遍 id 分配；后出现的显式 id、根 id 和警告文本已验证 |
| 2 | 浮点、双引号、单行错误、失败不改变状态、成功摘要 | NumericValue、Tokenizer、Router；命令、历史和文件失败验证 |
| 2.1 | TypeScript、OOP、多态、封装、一类一文件 | Shape 类层次，字段 private/protected；类型检查和 43 个源码文件的 AST 检查 |
| 2.1 | 限制按名字分派并记录待重构 | 仅 Router 命令表、Factory 类型表；开发文档列出 Provider/注册表重构方向 |
| 2.1 | Command 必选、容器/叶子统一 | EditCommand/CommandHistory/SnapshotCommand；Group Composite；长历史序列逐步往返 |
| 2.1 | 与 AI 智能体协作 | 本项目五轮协作记录保存在开发文档，包含发现和纠正生成内容的实例 |
| 3 | 文档命令 4 条 | init/read/save/canvas 已实现；成功文档修改和 IO 建立历史屏障 |
| 3 | 编辑命令 10 条 | create/delete/move/scale/set/group/ungroup/addto/front/back 已实现且可撤销 |
| 3 | 显示命令 3 条及 undo/redo | tree/show/help 跳过历史；undo/redo 原子恢复，新成功编辑清除 redo |
| 4.1 | 六种图形、默认样式、属性白名单、所有类型支持 in | 工厂定义共用 CLI/SVG；无样式时不写默认属性；未知属性报错；六类型验收 |
| 4.2 | 规定的错误文本 | Router/领域/存储错误与测试对照；box 复合图形专用错误不属于本阶段 |
| 4.3 | 一条编辑一个撤销单元；文档屏障；显示跳过 | Editor/Composite/Persistence/HistorySequence 测试及流程图回放 |
| 4.4 | box 与插件阶段边界 | 未提前实现 box；create box 明确报 unknown shape type，符合原文边界 |
| 5.1 / 5.2 | tree 内联几何、子树、show 属性和父级 | DocumentPresenter Visitor；树形分支、关键几何、样式及文字检查 |
| 6 | 典型会话、外部 other.svg | CliProcess.test.ts 真实子进程回放，保存结果与两条预期错误核对 |
| 6.1 A | 两节点、容器移动/撤销、改文字和保存 | examples/flowchart.txt；源码进程、编译入口和 Edge 图像证据 |
| 6.1 B | box 版本 | 原文明确非本阶段要求，不作为缺失项 |

19 条命令的逐条测试位置见 [第四轮验收矩阵](acceptance.md)。
显示列宽和反馈摘要不逐字模仿示例，但保留规定的命令、数据、错误与历史语义。

## 第五轮发现并修正的问题

1. canvas [w] [h] 的帮助允许可选尺寸，但旧版只接受 0 或 2 个参数。
   增加单宽度修改，保留原高度，并验证历史屏障、失败原子性。
   先添加两项回归测试，旧实现两项均失败，修正后通过。
2. README 曾写 Node.js 24+，但 @babel/parser 8 的开发路径要求 24.11.0+。
   同步更新 package.json engines、锁文件和使用说明，避免使用 24.0 时安装不兼容。
3. 之前自动进程测试主要运行 tsx 源码入口；增加可重复运行的 smoke:dist，
   专门检查真正的 dist/main.js。脚本依赖 Node 自带的类型擦除，
   不引入 tsx，因此可在只有生产依赖的目录里执行。

canvas 参数缺省约定：无参数查询；只有宽度时保留当前高度；宽高齐全时同时修改。
init 仍为新建文档：无参数 800×600，只有宽度时高度使用默认 600。

## 实际环境与执行结果

验证时间：2026-10-30；操作系统 Windows 11；Node.js v24.18.0。
安装过程使用 npm 8.19.4；检查命令运行环境为 npm 11.16.0。
本轮没有在 Linux/macOS 上实际运行，不将跨平台实现推断为跨平台实测。

| 环境 | 初始状态与执行 | 结果 |
|---|---|---|
| 当前开发目录 | npm.cmd run check；npm.cmd run smoke:dist | 11 个测试文件、184 项测试、43 文件架构检查、类型检查、构建和编译入口检查通过 |
| 独立源码副本 | 只复制 Git 管理的文件和本轮新增文件；没有 node_modules/dist；npm.cmd ci 后执行 check 和 smoke:dist | 重新安装 47 个包，184 项测试与全部检查通过；未复用原目录的依赖或编译产物 |
| 独立运行目录 | 只复制 dist、package/lock、示例及检查脚本；npm.cmd ci --omit=dev | 只安装 @xmldom/xmldom@0.9.12；没有 src、tsx、TypeScript、Vitest；smoke:dist 和 npm start 通过 |
| 真实交互终端 | node dist/main.js，输入 init/canvas/create/show，Ctrl+C | 0.5 横幅、svg> 提示符、中文及单宽度修改正常；Ctrl+C 退出码 0 |

独立目录均放在原项目以外的同级 QA 目录，不以原项目为祖先，避免 Node 沿父目录
找到旧 node_modules；安装前确认本目录与共同父目录均无 node_modules。

编译入口检查在独立临时工作目录执行，验证流程图 8 个元素的保存和读回、
中文文字、自动补 id、单宽度 canvas、撤销/重做及中文带空格文件名。
流程图脚本中 save 后 undo 的一条错误是预期结果。

## 从远程复现与检查交付引用

PowerShell（macOS/Linux 将 npm.cmd 换成 npm）：

    git clone https://github.com/zjsu957/phase_cli.git phase_cli-final
    cd phase_cli-final
    git checkout final
    npm.cmd ci
    npm.cmd run check
    npm.cmd run smoke:dist
    npm.cmd start

交付操作按以下顺序进行：提交第五轮代码与本报告、创建指向该提交的附注标签 final、
推送 master 与 final，最后检查远程引用和干净工作区。复核引用可执行：

    git status --short
    git rev-parse HEAD
    git rev-parse 'final^{commit}'
    git ls-remote origin refs/heads/master refs/tags/final 'refs/tags/final^{}'

HEAD、final 解引用后的提交及远程 master 应一致；附注标签自身的对象哈希不同是正常的。
dist 与 node_modules 不入库，接收方必须先安装并构建。

## 当前实现边界

- 支持本阶段六种图形及约定的 SVG 子集，不宣称支持整个 SVG 标准。
  path、CSS style、tspan、百分比几何等明确报错；box/插件留待后续阶段。
- 导入的 transform 与展示属性保留；编辑采用本地坐标。
  重挂接带变换/继承样式的子树不保证外观不变，ungroup 不展开父级变换。
  lab 没有规定世界坐标重挂接算法；手工组合的规定场景已覆盖。
- 历史为完整文档快照，未承诺大型 SVG 的性能。
