# 冰原计划

这是一个只使用 HTML、CSS 和 JavaScript 的网页游戏项目。项目不使用后端服务器，账号、玩家进度和 NPC 记忆都保存在当前浏览器的 `localStorage` 中。开发时仍需通过本地 HTTP 服务器运行 ES Module 和图片资源。

## 文件结构

```text
game ver 1.3/
├── Login.html                  # 登录和注册页面结构
├── map1.html                   # 地图 1 页面，只提供 canvas 和入口脚本
├── map2.html                   # 地图 2 页面，只提供 canvas 和入口脚本
├── css/
│   └── login.css               # 登录页面样式
├── js/
│   ├── constants.js             # 游戏公共常量
│   ├── engine.js                # 公共游戏引擎
│   ├── start-map1.js            # 地图 1 启动入口
│   ├── start-map2.js            # 地图 2 启动入口
│   ├── dialogues/
│   │   ├── map1.js              # 地图 1 对话数据
│   │   └── map2.js              # 地图 2 对话数据
│   └── user/
│       ├── storage.js           # localStorage 底层读写
│       ├── auth.js              # 注册和登录业务
│       ├── login-page.js        # 登录 UI 与账号业务的连接层
│       ├── save-data.js         # 新存档的默认结构
│       └── save-manager.js      # NPC、旗标、道具和背包 API
├── maps/
│   ├── map1.js                  # 地图 1 数据
│   └── map2.js                  # 地图 2 数据
├── img/                         # 图片资源
├── audio/                       # 音频资源
├── fonts/                       # 字体资源
├── map_editor.html              # 地图编辑工具页面
├── Sami_Village.html            # Sami Village 测试地图入口
├── map_town.html                # 旧版或辅助地图页面
└── tiles_viewer.html            # 图块查看工具页面
```

## 页面和模块关系

登录页面的关系：

```text
Login.html
	├── css/login.css
	└── js/user/login-page.js
				├── js/user/auth.js
				└── js/user/storage.js
```

地图 1 的关系：

```text
map1.html
	└── js/start-map1.js
				├── maps/map1.js
				├── js/dialogues/map1.js
				├── js/engine.js
				├── js/constants.js
				└── js/user/storage.js / save-manager.js
```

地图 2 的关系与地图 1 相同，只是使用 `map2.js` 和 `dialogues/map2.js`。

## 登录和注册

`Login.html` 只负责页面结构，CSS 和 JavaScript 已经分离。

### `login-page.js`

负责：


### `auth.js`

负责：


### `storage.js`

只负责和 `localStorage` 交互。当前使用的主要键包括：

```text
gameAccounts                    # 所有账号
currentUser                     # 当前登录用户邮箱
lastLoginEmail                  # 用户选择记住账号时保存的邮箱
save_用户邮箱                    # 该用户的完整游戏存档
```

这是纯前端账号系统，密码会保存在浏览器本地，适合课程作业和单机网页游戏，不适合真实的安全账号系统。

## 地图系统

地图页面只负责提供 canvas 和加载入口：

```html
<canvas id="g"></canvas>
<script type="module" src="js/start-map1.js"></script>
```

`start-map1.js` 和 `start-map2.js` 负责组装当前地图所需的数据，再调用公共引擎：

```js
startGame({ canvas, map, dialogue });
```

### `engine.js`

公共引擎负责：


引擎不写死地图内容，而是读取 `map` 参数。

### `maps/map1.js` 和 `maps/map2.js`

地图配置负责描述：


例如：

```js
doors: {
	D: { to: "map2.html" },
	E: {
		to: "map3.html",
		spawn: { x: 100, y: 160, dir: 0 },
	},
}
```

引擎会根据玩家当前所在地图格的字符，查找对应的入口配置。

## 贴图尺寸规则

```js
T                         // 世界中的地图格尺寸，目前是 32
DEFAULT_SOURCE_TILE_SIZE  // 默认贴图源尺寸，目前是 16
```

普通图块可以只写：

```js
".": { sheet: "outdoors", col: 1, row: 9 }
```

引擎会默认按 `16 × 16` 从图集读取。

特殊图块可以写自己的源坐标和源尺寸：

```js
"~": {
	sheet: "water",
	sx: 0,
	sy: 0,
	sw: 32,
	sh: 32,
}
```

无论源图片是 8、16 还是 32 像素，最终都可以绘制到统一的世界格大小 `T × T`。

静态物体如果使用非默认的源图最小单元，可以在 `objectTypes` 中增加 `sourceTileSize`，例如 `20`。引擎会按 `T / sourceTileSize` 缩放物体图片；物体的 `sx`、`sy`、`sw`、`sh` 仍然使用源图片像素，`mask` 仍然按地图格书写。

## 玩家存档结构

每个用户使用一个独立存档对象：

```js
{
	version: 1,
	flags: {},
	collectedItems: {},
	npcStates: {},
	inventory: {},
}
```

字段用途：

```text
flags           剧情开关、任务状态、门是否打开等
collectedItems  地图中的一次性物品是否已经拿取
npcStates       NPC 对话次数、好感度和其他状态
inventory       玩家背包中的物品数量
```

地图数据描述“世界里有什么”，存档描述“这个玩家已经改变了什么”。

## 存档 API

`save-manager.js` 不让游戏引擎直接操作 `localStorage`，而是提供简单函数：

```js
getFlag(name);
setFlag(name, value);
getNpcState(npcId);
addNpcTalk(npcId);
isCollected(itemId);
collectItem(worldItemId, itemId);
hasItem(itemId);
addItem(itemId);
removeItem(itemId);
```

以后增加宝箱、任务、道具或背包功能时，优先使用这些接口。

## 警长对话次数示例

春季地图中的警长有唯一 ID：

```js
{
	id: "spring_mayor",
	dialogue: "spring_mayor",
	talkCountText: "* 这是你第 {count} 次和我对话。",
	talkCountAfter: 1,
}
```

玩家按 `Z` 开始和警长对话时：

1. `engine.js` 调用 `addNpcTalk("spring_mayor")`。
2. 对话次数加一并保存到当前用户存档。
3. 将动态页面插入“你看到了”之后。
4. `{count}` 被替换成当前次数。

存档结果类似：

```js
npcStates: {
	spring_mayor: {
		talkCount: 3,
	},
}
```

因此不同账号会分别保存自己的对话次数。

## 开发和运行

由于项目使用 ES Module，建议通过本地 HTTP 服务器运行，不要只用浏览器直接双击 HTML 文件：

```bash
cd "game ver 1.2"
python3 -m http.server 4173
```

然后访问：

```text
http://127.0.0.1:4173/Login.html
```

`file://`、`http://localhost:4173` 和 `http://127.0.0.1:4173` 属于不同的浏览器存储来源，账号和存档不会互通。

## 后续扩展建议

新增一次性道具时，在地图数据中给它唯一 ID，在存档的 `collectedItems` 中记录是否拿过；新增 NPC 记忆时，在实体中给 NPC 唯一 ID，在 `npcStates` 中保存状态。不要把玩家进度直接写回地图文件，避免不同玩家共享同一份进度。

## 地图编辑器更新

当前地图编辑器位于 `map editor 1.0/`，包含：

- `map_editor.html`：地图图块、碰撞、静态物体和地图代码生成。
- `object_editor.html`：静态物体源图区域、锚点和遮罩制作。
- `js/object-editor.js`：静态物体编辑逻辑。

编辑器已支持：

- 启动时扫描 `img/` 文件夹，也可以手动刷新图集列表。
- 自定义源图最小单元，例如 `16×16` 或 `20×20`。
- 使用 `sx`、`sy`、`sw`、`sh` 输出非 16 像素图集的源区域。
- 单格物品写入 `objectMap`，多格物体写入 `freeObjects`。
- 保留对象的 `sourceTileSize`，供引擎正确缩放非 16 像素物体。

README 中的编辑器启动示例仍建议通过 HTTP 服务器访问，不要直接双击 HTML 文件。

## Sami Village 测试地图

Sami Village 是由地图编辑器生成并接入游戏引擎的测试地图：

```text
Sami_Village.html
maps/Sami_Village.js
js/start-sami-village.js
js/dialogues/sami-village.js
```

当前测试内容包括：

- 20×20 源图单元的 `ut_winter_scene.png` 图块。
- 玩家出生点地图格 `(3,10)`。
- 两名普通 NPC 和 Typhon 角色。
- Typhon 的地图前后两段对话。
- 地图在当前页面运行期间动态出现和拾取。
- `Sami_Map.png` 拾取后从场景中移除。
- 刷新浏览器后运行时状态重置，暂不接入登录存档。
- 对话文字自动换行。
- 没有地面贴图定义的黑色区域作为阻挡区域。

正式组装游戏时，需要将 Sami Village 的运行时状态改为使用 `save-manager.js`，并重新接入登录检查。

## 当前需要修正的内容

1. `Sami_Village.html` 当前是独立测试入口，登录检查暂时关闭；正式版应恢复账号验证。
2. Sami Village 的地图拾取状态目前只保存在内存，刷新后会重置；正式版应使用 `collectedItems` 和唯一物品 ID。
3. 平台游戏 `i wanna`（`mini_games/i_wanna_summer/`）还没有完整适配 `solid`、`mask`、`freeObjects` 和 20px 源图单元。
4. 对话键已经按角色拆分，例如 `sami_NPC1.1`、`sami_NPC1.2`、`sami_typhon1`、`sami_typhon2`，后续新增 NPC 应继续使用唯一键，避免对话串线。
5. 游戏引擎的对话框、实体交互和地图物体逻辑仍集中在 `js/engine.js`，后续可以拆分成地图、对话、实体和渲染模块。
6. `mini_games/i_wanna_summer/` 的第二关还是占位页 `coming_soon.html`，需要补写真正的第二关地图。

## 与 i wanna 平台游戏的衔接

`i wanna` 平台跳跃游戏已从 `game ver 1.2.1/i wanna/` 重构到 `mini_games/i_wanna_summer/`，去掉了 ES Module，可直接双击运行。

### 已完成的剧情衔接

主线俯视角游戏通过对话的 `to` 字段跳转到平台小游戏：

```text
Sami_Village.html（俯视角，萨米村）
  → 与提丰对话选「前进」→ 读完 sami_typhon2.1
  → 跳转 mini_games/i_wanna_summer/index.html（平台第一关）
  → 触碰到出口梯子（原本进入第二关的地方）
  → 跳转 mini_games/i_wanna_summer/coming_soon.html（占位页，大字「前面的地方，以后再来探索吧。」）
```

`js/dialogues/sami-village.js` 里 `sami_typhon2.1` 最后一段带 `to` 字段；`js/engine.js` 的 `finishDialogue()` 检测到 `lastPage.to` 就执行跳转。

### 尚未完成的适配

小游戏目前仍按地图字符判断碰撞（`0` 地面、`1` 梯子、`2`~`7` 墙体/斜坡、`,` 危险），尚未接入地图生成器的 `solid` / `mask` / `freeObjects` 语义。后续仍需要：

1. 将 `tileTypes[char].solid` 转换为平台碰撞类型。
2. 将 `objectMap` 和 `freeObjects` 转换为平台游戏碰撞体。
3. 处理 20×20 源图单元缩放到 32×32 世界格。
4. 用地图数据中的出生点替代按字符推断出生位置。
5. 用地图注册表替代只支持 `map1/map2` 的硬编码切换。
6. 补写真正的第二关地图，替换当前的 `coming_soon.html` 占位页。

## 开发命令

俯视角游戏和 Sami Village：

```bash
cd "/Users/cz-seven/Desktop/game ver 1.2"
python3 -m http.server 4175
```

平台游戏：

```bash
cd "/Users/cz-seven/Desktop/game ver 1.2.1/i wanna"
python3 -m http.server 4176
```

不同端口、不同主机名和不同协议会产生不同的浏览器存储来源；测试账号和存档时应固定使用同一个访问地址。