# Lab1 Phase 1 · 开发文档

## 当前里程碑

2026-10-29：第一版 CLI、领域模型与内存编辑闭环。
当前完成文档初始化/尺寸修改、六种图形、全部图形编辑命令、显示命令和撤销重做。
read/save 仅有明确报告未实现的入口；本版本不是整个 lab 的最终提交。

## 架构方案

### 模块划分

| 目录/入口 | 职责 |
|---|---|
| src/domain | 图形封装、几何校验、Composite 树、全局 id 与父子关系、领域错误 |
| src/application | Editor 用例、历史屏障、命令执行历史、面向文本的展示 |
| src/application/commands | EditCommand 接口、SnapshotCommand 和每条具体编辑命令 |
| src/cli | 分词、参数检查、命令路由、交互终端与脚本输入 |
| src/main.ts | 启动并组装 REPL 与标准输入输出 |
| tests | 分词、命令、树结构、历史、失败原子性及流输入的验证 |
| examples | 可回放的 lab 流程图命令序列 |

组件图的 PlantUML 源文件为 [architecture.puml](architecture.puml)。
可以通过支持 PlantUML 的编辑器预览该图。

### 设计模式的选择与落地

1. **Command（必选）**：每条图形编辑操作各有一个类，例如 MoveCommand。
   CommandHistory 仅依赖 EditCommand 接口，负责 execute/undo/redo 栈转换。
   CLI 不直接修改图形，只把输入转换成编辑命令并交给 Editor。
2. **Composite**：Shape 定义 move/scale/set/clone/accept 等行为。
   Group 与叶子图形共享接口；容器递归调用子节点行为。
   SvgDocument 管理全局唯一 id 和结构编辑，避免 CLI 自行拼接树。
3. **Memento 辅助 Command**：SnapshotCommand 在工作副本上执行修改，
   全部成功后才恢复到当前文档并入栈。前后快照保存在命令私有字段中。
   撤销不使用简单的反向浮点运算，删除、分组、排序都能恢复原结构与属性。
   代价是历史空间约为 O(历史长度 × 文档大小)，当前 lab 规模可接受。
4. **Visitor**：图形通过 accept 调用 DocumentPresenter 对应的访问方法，
   不在显示代码中 switch(tag)。领域对象不生成 CLI 树形文本；
   后续 SVG 序列化可以增加一个 Visitor 实现。
5. **图形工厂**：ShapeFactory 集中构造图形及检查创建参数。
   内置类型不需要 CLI 知道具体图形类。

允许按名字分派的两处及待重构事项：

- cli/CommandRouter：命令名 → 处理方法。未来可拆为可注册命令描述器，
  合并当前的语法描述与处理函数注册，减少同步维护。
- domain/ShapeFactory：图形类型名 → 构造函数。后续插件阶段改为 ShapeProvider 注册。

其余图形行为均通过多态、统一树遍历或属性集合处理；不按 tag 分派。
属性白名单按属性名校验属于 set 的业务规则，不是按图形类型的重复分派。

### 依赖方向规则

| 来源 | 可以依赖 | 原因 |
|---|---|---|
| domain | domain 内部模块 | 保持模型不依赖终端、文件、XML 库或应用层 |
| application（含 commands） | application、domain | 用例协调领域行为并管理编辑历史 |
| cli | cli、application；domain 的 EditorError/NumericValue | 适配文本输入；复用错误类型和数值校验，不操作领域图形树 |
| main.ts | cli 与 Node 标准输入输出 | 作为启动组装入口 |
| tests | 被测模块及测试/Node 工具 | 验证跨层的可观察行为 |

Node readline/stream 的 IO 仅位于 CLI/启动入口与测试代码。
domain 和 application 不导入 Node IO。

下一轮新增 application/ports 下的文档存储接口，由 infrastructure/svg、
infrastructure/files 实现；依赖方向为 infrastructure → application/ports、domain，
通过启动入口注入 Editor。当前没有文件用例，暂不创建空接口或空目录。

### 变化点假设

| 可能变化 | 当前应对/暂不扩展的原因 |
|---|---|
| 新图形类型 | Shape 多态 + ShapeFactory 集中创建；暂不实现插件加载协议 |
| GUI/agent 等输入通道 | 用例和编辑命令不依赖 CLI，可由其他适配器调用 |
| SVG 导入导出 | 通过未来端口隔离 IO，序列化拟使用 Visitor；本轮不引入 XML 库 |
| 显示格式 | DocumentPresenter 集中处理；CLI 不读取图形具体字段 |
| 历史规模扩大 | 目前使用完整快照，若出现内存压力再改命令增量记录；不提前引入压缩/持久化历史 |
| 命令扩展与参数 schema | 两处名字分派集中可查，已列为重构项 |

### 本轮明确的行为约定

- init 无参数为 800×600；仅给一个尺寸时修改宽度，高度仍为 600。
  canvas 必须无参数或同时给出宽高。画布尺寸为有限正数。
- 数值必须有限，位置允许负数和浮点；宽高/半径/描边宽度允许零，不允许负数。
  scale factor 必须为正，缩放位置与尺寸，不缩放 stroke-width。
- id 大小写敏感、非空、不能含空白；所有命令按全局 id 寻址。
- 不自动写入 fill/stroke。set g 的样式保留在容器上，遵循 SVG 继承语义，
  不覆盖后代已有样式。move/scale 则递归改变后代几何值，不生成 transform。
- group 按编辑前的文档深度优先顺序收编，忽略参数书写顺序。
  同父级时，新组插入最早被选中节点的位置；
  跨父级时，新组放在 SVG 根下最早相关顶层节点的位置。
  相对顺序保持指子节点顺序保持，几何属性不变。
- ungroup 仅允许非顶层的普通 g，子节点原位提升。box 不受支持。
- addto 在目标容器末尾追加，拒绝自己包含自己或形成环。
- SVG 后绘制的同级节点覆盖先绘制节点，因此 front 移到同级列表末尾，
  back 移到开头。
- 编辑命令只在成功后入栈及清空 redo；失败不改变文档与历史。
- 成功 init/canvas 修改尺寸建立新历史基线，并阻止 undo/redo；
  下一次成功编辑解禁，但不能回到上一条文档命令之前。
  canvas 查询和 tree/show/help 不影响历史。
- 空行和首个非空白字符为 # 的行忽略；行内 # 保留为颜色/文本。
  双引号支持空文本，以及引号内的反斜线/引号转义。
- 交互模式显示 svg>；管道模式仅输出结果。Ctrl+C/EOF 结束，无额外 exit 命令。
- 成功反馈以操作摘要为准，undo/redo 分别输出 undone/redone 加原操作摘要。
  error 输出统一为单行。错误文本按 lab 已给规则匹配，其余错误说明具体原因。

## 过程记录

以下记录本轮实际发生的讨论与验证，不代表后续工作已经完成。

1. 阅读 lab 后先划分阶段：第一版完成内存编辑闭环，下一轮实现文件往返。
   因此不提前实现 box、插件系统，也不声称已完成全部 lab。
2. 环境安装遇到 D:/nodejs/node_cache 无法写入。
   将缓存改到项目 .npm-cache 并忽略该目录，成功安装开发工具。
3. 决定用 Command + 文档快照：简单的反向 move/scale 无法保证浮点精确恢复，
   结构操作还需恢复父节点和 z-order。工作副本提交同时解决失败原子性。
4. 模型以行为封装几何和子节点；CLI 经应用层提交命令，避免公共数据袋与
   switch(tag) 分散在命令中。Visitor 将文本展示放到应用层。
5. 明确 group 跨父级时的位置、front/back 与绘制顺序、文档命令历史基线，
   把实现约定写入方案，并针对这些行为建立验证。
6. 首轮类型检查和构建通过。50 项测试中 5 项失败：
   测试错误地期望 error: 紧邻通用错误片段，而实际信息包含具体参数名。
   核对输出后修正断言，保留对文档和 redo 状态不变的检查。
7. 修正后四个测试文件的 50 项测试全部通过，类型检查和构建通过。
   通过编译后的 Node 入口回放流程图，检查了中文文本、嵌套树、整组移动及撤销。
   在真实交互终端确认启动横幅、svg> 提示符、连续编辑与 Ctrl+C 退出。

## 一致性自查

### 模块划分

实际目录与本轮方案一致；每个生产类各有同名文件，接口也独立存放。
main.ts 只做启动组装，测试使用测试框架回调，不作为领域行为实现。
后续 infrastructure/ports 尚未建立，属于已明确延期的文件 IO 里程碑，
并非声称存在的模块。

### 依赖方向

- 领域层只引用领域层类型，无 Node IO、CLI 或应用层依赖。
- 应用层只引用领域层及应用层。
- CLI 的具体编辑入口经 Editor.edit 执行；只额外引用允许的领域错误/数值校验。
- 树显示使用 Visitor；容器判定通过 asContainer 多态。
- 命令分发、图形工厂两处名字分派保留，已列为重构项。

## 质量保证手段

- npm run typecheck：严格类型检查，包括测试源码。
- npm test：验证分词、六种图形的创建/编辑、Composite 递归、结构顺序、
  撤销重做、屏障及失败后保留 redo。包含子孙处理过程中数值溢出的原子性场景。
- npm run build：编译为 dist/main.js，检查实际 Node 入口。
- examples/flowchart.txt：回放 lab 6.1 版本 A 的内存编辑部分。
- 流式 REPL 测试：覆盖 CRLF、中文、错误后继续、EOF 前最后一行无换行。
- 本轮结果：4 个测试文件、50 项测试全部通过；类型检查与构建通过；
  编译入口脚本回放及交互终端检查通过。

本版本不能验证 SVG 读写和浏览器显示；没有把这些未完成项计入通过范围。
当前尚未配置远程仓库，后续需要推送；final tag 只在整个 lab 完成后创建。
