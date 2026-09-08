# 冰原计划

这是一个只使用 HTML、CSS 和 JavaScript 的网页游戏项目。项目不使用服务器，账号、玩家进度和 NPC 记忆都保存在当前浏览器的 `localStorage` 中。

## 文件结构

```text
game ver 1.1/
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

- 切换登录和注册模式
- 显示和隐藏密码
- 检查表单输入
- 调用注册或登录函数
- 显示成功和错误信息
- 成功后跳转到 `map1.html`

### `auth.js`

负责：

- 注册新账号
- 检查邮箱是否重复
- 验证登录邮箱和密码
- 记录当前登录用户
- 创建该用户的初始存档

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

- 加载图片和播放 BGM
- 绘制地面、物体、NPC 和玩家
- 玩家移动和动画
- 碰撞检测
- 相机跟随
- 对话翻页和选项
- 入口和传送点
- 游戏主循环

引擎不写死地图内容，而是读取 `map` 参数。

### `maps/map1.js` 和 `maps/map2.js`

地图配置负责描述：

- 地图宽高
- 地面字符数组
- 地面图块定义
- 物体类型和物体字符表
- 自由放置的大型物体
- 图片资源
- NPC 和传送点
- BGM
- 默认出生点
- 多入口 `doors` 配置

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
cd "game ver 1.1"
python3 -m http.server 4173
```

然后访问：

```text
http://127.0.0.1:4173/Login.html
```

`file://`、`http://localhost:4173` 和 `http://127.0.0.1:4173` 属于不同的浏览器存储来源，账号和存档不会互通。

## 后续扩展建议

新增一次性道具时，在地图数据中给它唯一 ID，在存档的 `collectedItems` 中记录是否拿过；新增 NPC 记忆时，在实体中给 NPC 唯一 ID，在 `npcStates` 中保存状态。不要把玩家进度直接写回地图文件，避免不同玩家共享同一份进度。