# Lab1 Phase 1 · 开发文档

## 当前里程碑

2026-10-30：第五版完成 lab 逐项复核，补齐 canvas 单参数语法，并完成独立安装与运行验收。
当前完成文档初始化/尺寸修改、六种图形、全部编辑/显示命令、撤销重做、
SVG 导入导出、自动补 id、文件路径与文档命令历史屏障。
版本为 0.5.0。逐项结论、环境结果及 Git 交付核验方式见 [最终复核报告](final-review.md)。
最终交付引用为 final；课程未给出具体截止日期，需以课程通知核对是否按时。

### 迭代安排

| 轮次 | 目标 | 状态 |
|---|---|---|
| 第 1 轮 | CLI、领域模型、Command/Composite 与撤销重做 | 已提交 f0bf527 |
| 第 2 轮 | SVG 导入导出、补 id、文件原子保存与路径管理 | 已提交 7b51872，已核实远程存在 |
| 第 3 轮 | 数值/XML/引号边界、命令定义与帮助一致性 | 已提交 8b3e305，已核实远程存在 |
| 第 4 轮 | 对照 lab 完整验收、架构依赖检查与发现问题的修复 | 已提交 9a4de27，已推送；182 项测试及检查通过 |
| 第 5 轮 | 干净环境复现、语法补齐、使用/提交文档、最终交付 | 本轮独立提交；184 项测试与两种独立目录验收通过，交付引用为 final |
| 第 6 轮（如需） | 解决验收或用户试用暴露的额外问题并复验 | 按实际问题决定 |

轮次按真实问题与可验证成果划分，不为增加次数拆分空提交。
第五轮验收完成后创建指向本轮提交的 final 标签；不为凑次数提前安排空的第六轮。

## 架构方案

### 模块划分

| 目录/入口 | 职责 |
|---|---|
| src/domain | 图形封装、几何/XML 值校验、Composite 树、全局 id 与父子关系、领域错误 |
| src/application | Editor 用例、历史屏障、命令执行历史、面向文本的展示 |
| src/application/commands | EditCommand 接口、SnapshotCommand 和每条具体编辑命令 |
| src/application/ports | DocumentStore 接口，定义文档读写用例所需的能力 |
| src/infrastructure/files | NodeDocumentStore，隔离 Node 文件系统及临时文件原子替换 |
| src/infrastructure/svg | SvgParser / SvgSerializer，隔离 XML 解析与序列化 |
| src/cli | 保留引号信息的分词、CommandDefinition 统一语法/参数检查/动作、命令路由、终端与脚本输入 |
| src/main.ts | 启动并组装 REPL 与标准输入输出 |
| tests | 分词、命令、树结构、历史、失败原子性、流输入及真实 CLI 子进程验收 |
| scripts | AST 架构检查；RuntimeSmokeCheck 通过真实子进程验证编译入口与 SVG 文件往返 |
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
   第二版的 SvgSerializer 也实现 ShapeVisitor，生成 XML 节点。
5. **图形工厂**：ShapeFactory 用 ShapeDefinition 同时描述 CLI 参数和 SVG 几何属性，
   让创建与导入共用唯一的类型注册；CLI 和 XML 解析器都不依赖具体图形类。
   第三版还由这份定义生成具体创建语法，usage 与 help 不再分别手写类型参数。
6. **端口与适配器**：Editor 只依赖 DocumentStore 接口；
   NodeDocumentStore 是具体适配器，由 main.ts 注入。
   LoadedDocument 封装已经完成校验的文档和警告，不在解析过程中修改 Editor。
7. **命令描述**：CommandDefinition 将命令名、语法、参数数量和处理行为放在一起，
   CommandRouter 只维护一张定义表；help 与执行读取同一份定义。
   这属于 CLI 适配器内的重构，实际编辑仍交给 EditCommand/CommandHistory。

允许按名字分派的两处及待重构事项：

- cli/CommandRouter：命令名 → CommandDefinition。第三版已完成描述和处理逻辑合并，
  仍保留内置命令表；未来可将表的组装提取为可注册提供者，列为待重构项。
- domain/ShapeFactory：图形类型名 → 构造函数。后续插件阶段改为 ShapeProvider 注册。

其余图形行为均通过多态、统一树遍历或属性集合处理；不按 tag 分派。
属性白名单按属性名校验属于 set 的业务规则，不是按图形类型的重复分派。

### 依赖方向规则

| 来源 | 可以依赖 | 原因 |
|---|---|---|
| domain | domain 内部模块 | 保持模型不依赖终端、文件、XML 库或应用层 |
| application（含 commands） | application、domain | 用例协调领域行为并管理编辑历史 |
| infrastructure | infrastructure、application 的端口/LoadedDocument、domain、Node/XML 库 | 实现外部 IO 并转换表示 |
| cli | cli、application；domain 的 EditorError/NumericValue | 适配文本输入；复用错误类型和数值校验，不操作领域图形树 |
| main.ts | cli、application、infrastructure 与 Node 标准输入输出 | 作为启动组装入口并注入文件存储 |
| tests | 被测模块及测试/Node 工具 | 验证跨层的可观察行为 |

Node readline/stream 的终端 IO 位于 CLI/启动入口；
文件 IO 位于 infrastructure/files。domain 和 application 不导入 Node IO，
XML 库仅在 infrastructure/svg 使用。

第四版将上述规则落实到 scripts/ArchitectureCheck.ts，逐条检查生产源码的
import/export（包括类型引用）、允许的 Node/XML 库位置和运行时依赖环。
纯类型循环允许存在，但仍须满足依赖方向。开发脚本使用 @babel/parser 读取 AST，
该库仅为开发依赖，生产源码不引用脚本或 Babel。架构图单独列出开发检查。
检查器还覆盖类文件名与字段封装、常见 tag 比较/switch 写法及动态加载，
它是防止已声明规则退化的工具，不替代人工设计判断。

### 变化点假设

| 可能变化 | 当前应对/暂不扩展的原因 |
|---|---|
| 新图形类型 | Shape 多态 + ShapeFactory 集中创建；暂不实现插件加载协议 |
| GUI/agent 等输入通道 | 用例和编辑命令不依赖 CLI，可由其他适配器调用 |
| SVG 导入导出 | DocumentStore 隔离 IO；SvgParser/SvgSerializer 隔离 XML；以后替换存储或解析库不改领域模型 |
| 显示格式 | DocumentPresenter 集中处理；CLI 不读取图形具体字段 |
| 历史规模扩大 | 目前使用完整快照，若出现内存压力再改命令增量记录；不提前引入压缩/持久化历史 |
| 命令扩展与参数 schema | 两处名字分派集中可查，已列为重构项 |

### 本轮明确的行为约定

以下保留第一版约定，并在第二版补充文件语义。

- init 无参数为 800×600；仅给一个尺寸时设置新文档宽度，高度仍为 600。
  第五版复核语法后，canvas 支持无参数查询、只修改宽度（保留当前高度）、
  同时修改宽高。第四版及之前仅接受无参数或两个尺寸的约定在此修订。
  画布尺寸为有限正数。
- 数值必须有限，位置允许负数和浮点；宽高/半径/描边宽度允许零，不允许负数。
  scale factor 必须为正，缩放位置与尺寸，不缩放 stroke-width。
  第三版限定十进制/科学计数法，拒绝 JavaScript Number 会额外接受的
  十六进制、二进制和八进制。CLI 和 SVG 导入共用 NumericValue。
- id 大小写敏感、非空、不能含空白；所有命令按全局 id 寻址。
- 不自动写入 fill/stroke。set g 的样式保留在容器上，遵循 SVG 继承语义，
  不覆盖后代已有样式。move/scale 则递归改变后代几何值，不生成 transform。
- 外部文件已有 transform、字体属性和 data-* 会保留；CLI set 仍只接受 lab 白名单。
  带变换的图形按本地坐标编辑，树中显示原始几何和 transform，不展开矩阵。
- group 按编辑前的文档深度优先顺序收编，忽略参数书写顺序。
  同父级时，新组插入最早被选中节点的位置；
  跨父级时，新组放在 SVG 根下最早相关顶层节点的位置。
  相对顺序保持指子节点顺序保持，几何属性不变。
- ungroup 仅允许非顶层的普通 g，子节点原位提升。box 不受支持。
- addto 在目标容器末尾追加，拒绝自己包含自己或形成环。
- SVG 后绘制的同级节点覆盖先绘制节点，因此 front 移到同级列表末尾，
  back 移到开头。
- 编辑命令只在成功后入栈及清空 redo；失败不改变文档与历史。
- 同一 SnapshotCommand 实例成功执行后不允许再次 execute，避免覆盖历史中引用的快照；
  失败执行不消费实例，正常 redo 使用原有快照恢复。
- 成功 init/canvas 修改尺寸建立新历史基线，并阻止 undo/redo；
  下一次成功编辑解禁，但不能回到上一条文档命令之前。
  canvas 查询和 tree/show/help 不影响历史。
- 空行和首个非空白字符为 # 的行忽略；行内 # 保留为颜色/文本。
  双引号支持空文本，以及引号内的反斜线/引号转义。
  第三版要求引号包裹整个参数，参数间空白分隔，不再接受隐式片段拼接。
  CommandToken 封装文本及是否带引号，避免将文字 "in" 误认为父容器子句。
  create 末尾缺少目标的 in 报 usage；文字或可选值恰好是 in 时应使用双引号。
- XmlValue 在 id、文字和展示属性写入时校验 XML 1.0 字符合法性；
  导入时也检查原始 XML 与解析后的模型值，避免数值字符引用绕过校验。
  合法 emoji 使用成对代理项，正常保留；孤立代理项与非法控制字符被拒绝。
- 交互模式显示 svg>；管道模式仅输出结果。Ctrl+C/EOF 结束，无额外 exit 命令。
- 成功反馈以操作摘要为准，undo/redo 分别输出 undone/redone 加原操作摘要。
  error 输出统一为单行。错误文本按 lab 已给规则匹配，其余错误说明具体原因。

### 第二版的 SVG 与文件语义

- 保存为 UTF-8 XML，包含 SVG 命名空间、width/height/viewBox；
  text 内容使用 XML 子文本，交由 XML 库转义文本和属性。
- 解析采用 XML 1.0 行尾规则，仅将裸 CR/CRLF 变成 LF；NEL/U+2028 正常保留。
  通过字符引用读入的 CR 在保存时继续编码成字符引用，避免下一次读取变成 LF。
- 导入只支持内核六种图形。几何属性可以省略，按 SVG 默认值 0 处理，
  允许数值或 px；宽高省略时优先使用 viewBox 尺寸，否则使用编辑器默认 800×600。
- 原有 viewBox、根样式、可选根 id、常用字体/展示属性与 data-* 保留。
  resize 显式重设画布时，将 viewBox 同步重置为 0 0 w h。
  根 id 不作为图形寻址目标，但参与唯一性检查，自动命名时也会避开它。
- 先扫描所有显式 id，再按“标签名+序号”命名缺 id 的元素，
  避免与后面的显式 id 冲突；成功导入后才显示 warning。
  重复或空白 id、坏 XML、无效尺寸与未知元素导致整条 read 失败。
- g 的 data-kind=box 只作为元数据保留，模型仍是普通 Group，不提供插件语义。
- 不支持完整 SVG 标准：path、CSS style、tspan、百分比几何、DOCTYPE 等
  明确报错；不静默丢弃无法表示的内容。
- read 整个文件解析与校验成功后才替换当前文档，记录文件路径并清空历史/设置屏障。
  未 init 时可以直接 read。
- save 无参数使用最后一次成功 read/save 的路径。成功显式 save 会更新默认路径；
  init 清除路径。无默认路径时报错，提示显式 save <file.svg>。
- 保存先序列化，再在目标目录写唯一临时文件，rename 成功后建立历史屏障。
  失败则报告错误并尽力清理临时文件，保留原文档、路径、历史及原目标文件。
  不自动创建不存在的父目录。
- 文件 IO 对当前 CLI 使用同步接口，保持逐行命令顺序。
  以后接入 GUI/大型文件时再将端口升级为异步，不提前改动整个 REPL。

## 过程记录

以下记录每轮实际发生的讨论与验证，不将计划写成已完成事项。

### 第一版

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

### 第二版

1. 用户试用第一版后询问如何预览图形，暴露出“内存编辑已完成，但无法保存”
   的使用断点。本轮以 CLI → save → SVG 文件 → read 的闭环为目标。
2. 选择 XML 库而非用正则解析 XML；文件操作经 DocumentStore 接口注入 Editor，
   避免将 Node 文件系统直接引入应用层。
3. 第一版的工厂仅支持位置参数。为了避免 XML 导入增加第二套标签分派，
   将类型注册重构为 ShapeDefinition，每份定义同时描述 CLI 和 SVG 的构造方式。
4. 自动 id 采用两遍处理；若一边读一边直接分配 rect1，可能与后面的 rect1 冲突。
   回归测试用前后交错的无名节点和显式 id 验证命名和层级。
5. XML 库默认会报告 warning 并修正未加引号的属性。测试发现这与严格 XML 校验
   不符，改用 onWarningStopParsing，让任何解析告警都中止并报告坏 XML。
   复查时补充了内层显式空命名空间的拒绝验证，防止读入后改变渲染语义；
   保存通过先独占创建临时文件再写入，保证中途写入失败也能尝试清理。
6. 增加真实临时目录的文件用例：成功读写、含空格的中文路径、默认路径、
   保存后的历史屏障、失败后保留 redo、失败不改原文件和清理临时文件。
7. 第一版已保存为 f0bf527，第二版使用独立提交，不改写第一版历史。
   用户提供 GitHub 仓库 https://github.com/zjsu957/phase_cli，
   检查为空后关联 origin。推送先遇到凭据缺失，随后遇到 github.com:443 连接失败；
   未把本地提交误记为已经成功上传。

### 第三版

1. 用户要求按五至六轮迭代完成。本轮选择已有功能的输入边界与架构债务，
   下一轮进行完整验收，第五轮准备交付，若暴露额外问题再决定第六轮。
2. 用第二版编译代码复现：create rect r 0x10 0 2 3 会创建 x=16 的图形，
   scale r 0b10 也会成功；外部 SVG x="0x10" 同样被转换。
   原因是 NumericValue 直接调用 Number；改为先检查 SVG 十进制语法再转换。
3. 复现 text 中的非法控制字符能创建成功，坏字符实体 &#0; 也能读入，
   到保存时才失败。新增 XmlValue，将字符校验从序列化器提前到模型字段写入，
   序列化仍复用同一校验作为边界保障。
4. 在修复前新增边界回归测试，针对输入/XML/分词的 26 项测试中 18 项失败；
   失败包括接受非十进制、非法 XML 值及隐式引号拼接，确认测试确实能捕获问题。
5. 重构 CommandRouter，移除独立 usages/handlers 两张表，新增同名文件中的
   CommandDefinition，统一语法、参数数量校验和执行行为。
   具体 create 的 usage/help 则由 ShapeDefinition 生成，经 Editor 提供给 CLI，
   没有新增 CLI 到图形工厂的直接依赖，也没有增加按类型分派的位置。
6. 测试发现 create rect r 0 0 1 1 in 会将缺目标的关键字误当作 fill。
   修正尾缀检查，保留 CommandToken 的引号信息，让 "in" 文字与 in 子句可区分。
   同时拒绝 "hello"suffix 等片段拼接，并验证失败时文档与 redo 不变。
7. 本轮直接查询 GitHub 的 refs/heads/master，已返回第二版完整提交
   7b51872079cd10dcc5078e0fc76fc40a9c9fdf5e。更新远程状态，保留第二版当时
   网络失败的历史事实，不将该记录改写为当时已经推送成功。
8. 修复后执行 npm run check：8 个测试文件的 153 项测试通过，类型检查和构建通过。
   回放 round3-validation.txt 得到四条预期错误，错误后 redo、tree、show 正常；
   在隔离目录回放原流程图，成功保存并读回 8 个元素。

### 第四版

1. 对照 lab 建立 19 条命令与通用约束的验收矩阵，记录在
   [acceptance.md](acceptance.md)。使用真实 Node 子进程运行 CLI，既核对输出，
   也检查落盘 SVG；测试在独立临时目录执行，不覆盖用户已有文件。
2. XML 往返验收发现字符引用 &#13; 会在第二次读取时变成 LF，
   NEL/U+2028 也被改写。先添加回归测试并观察失败，再查明 XML 库默认行尾规则
   与 XML 1.0 不一致；显式限制解析归一化，并在输出时保留 CR 字符引用。
3. 历史验收发现同一命令对象执行两次会覆盖第一次的快照。
   先写失败回归，再拒绝重复 execute；仍允许失败实例重试。
   新增长序列验证，每次 undo/redo 都核对整个文档状态，覆盖嵌套、分组、重挂接与排序。
4. 架构检查需要真实语法树，不能靠字符串搜索判断 import 或字段。
   当前 TypeScript 7 未提供 createSourceFile，因此选择仅开发依赖 @babel/parser。
   检查 43 个生产源码文件，并用故意违规的内存代码验证检查器能发现问题。
   首次检查将 this.tag + '#' 误认为按类型分派，改为只匹配相等比较和 switch，
   同时补充字符串/注释不应误报的样例。
5. 真实进程测试最初用不包含 svg> 判断提示符，却误匹配 help 中的 <file.svg>。
   核对真实输出后将断言限制为行首提示符，保留管道模式输出约束。
6. npm.cmd run check 全部通过：11 个测试文件、182 项测试，另有类型检查、
   架构检查与构建。编译后的 dist/main.js 在独立目录回放流程图，
   仅出现保存屏障的一条预期错误，成功保存并读回 8 个元素。
7. 此前 Computer Use 管道不可用，第二、三版未完成浏览器视觉检查。
   本轮使用 Edge 无界面模式和独立用户数据目录渲染实际产物，已查看截图，
   确认两个彩色节点、中文文字与连线正常。SVG 与截图保存在 doc/qa/，
   不把单个示例的显示正常扩展为所有外部 SVG 的保真结论。
8. 保留完整快照的内存代价和本地坐标编辑约定；跨带变换/继承样式容器的
   重挂接不保证外观不变。第五轮做干净环境复现与最终交付，本轮不创建 final tag。

### 第五版

1. 重新阅读 phase_cli_1.md，按章节核对代码、测试与文档，结果记录在
   [final-review.md](final-review.md)。保留 box/插件阶段边界，不把可选后续能力当作遗漏。
2. 发现 canvas [w] [h] 帮助与只允许零个或两个参数的限制不一致。
   先添加两项回归测试并确认失败，再支持单宽度修改，同时保留现有高度。
   测试检查新历史屏障和无效单宽度参数后文档/redo 不变。
3. 复核依赖引擎要求，发现 Node.js 24+ 的说明过宽；
   将最低版本修订为 24.11.0，同步 engines、锁文件和 README。
4. 新增 start 和 RuntimeSmokeCheck，直接运行编译后的 dist/main.js。
   检查脚本用 Node 内建类型擦除运行，不依赖 tsx；因此只有生产依赖时也能执行。
5. 在原项目之外创建独立源码副本，安装前确认没有 node_modules/dist，
   且共同父目录没有 node_modules，避免误用旧依赖。首次安装被沙箱网络拒绝；
   经授权重试安装 47 个包后，184 项测试、架构检查、类型检查、构建与编译入口检查通过。
6. 第二份独立目录只复制编译产物、包清单/锁文件、示例与检查脚本，
   npm ci --omit=dev 仅安装 XML 运行库。确认没有源代码、tsx、TypeScript 或 Vitest，
   仍通过编译入口检查及 npm start。真实终端确认 0.5 横幅、提示符、中文输入、
   单宽度 canvas 与 Ctrl+C 正常退出。
7. 更新文档的安装、UTF-8 管道、生产启动、最终复现及交付引用检查方法。
   当前验证平台为 Windows 11 / Node v24.18.0；没有声称 Linux/macOS 已实测。
   课程截止日期未提供，不能只凭创建标签就声称符合课程时间要求。

## 一致性自查

### 模块划分

实际目录与本轮方案一致；每个生产类各有同名文件，接口也独立存放。
main.ts 只做启动组装，测试使用测试框架回调，不作为领域行为实现。
第二版按第一版预留的方向新增 application/ports、infrastructure/files、
infrastructure/svg；新增 ShapeDefinition 和 SvgPresentation 用于复用构造/导入规则。
以上新增目录和类型已同步修订架构图与模块说明。
第三版增加 cli/CommandDefinition、cli/CommandToken 和 domain/XmlValue；
均为一类一文件。原有端口方向和图形行为多态保持一致，架构图同步更新。
第四版新增 scripts/ 和三份验收测试，均属于开发验证；生产模块边界保持一致。
XML 与历史修复分别位于原有适配器和命令基类，未新增运行时层次或依赖方向。
第五版的 RuntimeSmokeCheck 位于 scripts，与编辑器运行时无依赖关系。
canvas 的可选参数修正位于原 Router/Editor，模块划分保持一致。

### 依赖方向

- 领域层只引用领域层类型，无 Node IO、CLI 或应用层依赖。
- 应用层只引用领域层及应用层。
- 基础设施层实现应用端口，使用领域工厂、LoadedDocument 和 XML/Node 库。
- main.ts 注入 NodeDocumentStore；CLI 不直接创建文件适配器。
- CLI 的具体编辑入口经 Editor.edit 执行；只额外引用允许的领域错误/数值校验。
- 树显示使用 Visitor；容器判定通过 asContainer 多态。
- 命令分发、图形工厂两处名字分派保留，已列为重构项。
- 第三版 help 通过应用层获得图形语法，CLI 仍只直接引用允许的领域错误/数值校验。
  XmlValue 为纯领域值校验，不引入 XML 库或文件系统依赖。
- 第四版 AST 检查验证 43 个生产源码文件未违反已声明规则、没有运行时依赖环。
  检查器自身的解析依赖位于 scripts；类型检查覆盖脚本，构建只包含 src。

## 质量保证手段

- npm run typecheck：严格类型检查，包括测试与开发脚本源码。
- npm test：验证分词、六种图形的创建/编辑、Composite 递归、结构顺序、
  撤销重做、屏障及失败后保留 redo。包含子孙处理过程中数值溢出的原子性场景。
- npm run build：编译为 dist/main.js，检查实际 Node 入口。
- npm run check:architecture：扫描生产源码 AST，检查依赖、封装与运行时环。
- npm run test:acceptance：集中运行真实进程、长历史序列及架构规则测试。
- npm run smoke:dist：在独立临时目录运行编译入口，检查实际 SVG 与 UTF-8 路径；
  构建后运行；仅需 Node，可在安装了生产依赖的发行目录执行。
- npm run check：依次执行类型检查、架构检查、测试、构建，任一步失败则终止。
- examples/flowchart.txt：回放 lab 6.1 版本 A，包含实际保存、历史屏障和读回。
- 流式 REPL 测试：覆盖 CRLF、中文、错误后继续、EOF 前最后一行无换行。
- 第一版：4 个测试文件、50 项测试全部通过；类型检查与构建通过；
  编译入口脚本回放及交互终端检查通过。
- 第二版：6 个测试文件、91 项测试全部通过；类型检查与构建通过。
  XML 往返测试覆盖六种图形、特殊字符、空文本、层级、元数据、viewBox 与 id。
  实际编译入口成功导出 flowchart.svg 并读回 8 个元素。
- 第二、三版自动浏览器视觉检查未完成：Computer Use 原生管道不可用，重试及重置后仍失败。
  当时未把文件成功导出和 XML 往返等同于已经完成浏览器视觉验证。
- 第三版新增 tests/InputValidation.test.ts、tests/CommandSyntax.test.ts，
  验证错误输入保留文档/redo、合法科学计数法/emoji、usage 与 help 一致。
  examples/round3-validation.txt 为可手工回放的边界示例，四条错误为预期输出。
- 第三版结果：8 个测试文件、153 项测试全部通过；类型检查与构建通过。
  两份脚本均通过编译入口回放；流程图导出放在 .npm-cache 下的独立 QA 目录，
  避免覆盖用户现有的 flowchart.svg。

- 第四版结果：11 个测试文件、182 项测试全部通过；43 个生产文件通过架构检查，
  类型检查与构建通过。真实 CLI 子进程覆盖 19 条命令，编译入口另行回放流程图。
  Edge 实际渲染截图已查看，产物与矩阵见 [第四轮验收记录](acceptance.md)。

- 第五版结果：11 个测试文件、184 项测试通过，43 个生产文件通过架构检查，
  类型检查与构建通过；独立源码安装和仅含生产依赖的运行目录均通过验收。
  实际 Node 交互终端的提示符、中文与 Ctrl+C 检查通过。

远程已配置为 https://github.com/zjsu957/phase_cli.git，
第五轮开始时已核实前四轮已推送。本轮按提交、打 final 标签、推送、
核对远程引用的顺序交付，引用核验命令见最终复核报告。
