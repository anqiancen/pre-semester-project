# I Wanna Summer

这是从 `game ver 1.2.1/i wanna/` 重构而来的平台跳跃小游戏，作为 `game ver 1.2` 的一个内嵌迷你游戏放在 `mini_games/` 下。

与原版不同，本目录已经去掉了 ES Module（`import` / `export`），改为按顺序加载的普通脚本，因此**直接双击 `index.html`（`file://`）即可运行**，无需启动本地服务器。

同时，它已经接入主线剧情：俯视角的 Sami Village 读完提丰对话 `sami_typhon2.1` 后会跳转到本目录 `index.html`（第一关）；第一关走到出口后进入 `coming_soon.html` 占位页。

## 运行方式

直接双击打开：

```text
mini_games/i_wanna_summer/index.html
```

也可以继续用 HTTP 服务器运行（效果相同）：

```bash
cd "/Users/cz-seven/Desktop/game ver 1.2/mini_games/i_wanna_summer"
python3 -m http.server 4176
```

然后访问 `http://127.0.0.1:4176/index.html`。

## 文件结构

```text
i_wanna_summer/
├── index.html              # 页面入口，按顺序加载三个脚本
├── coming_soon.html        # 第一关结束后的占位页（大字提示，暂未接入真正的第二关）
├── js/
│   ├── map1.js             # 第一关地图数据（挂到 window.IW_MAPS.map1）
│   ├── map2.js             # 第二关地图数据（挂到 window.IW_MAPS.map2，暂未接入）
│   └── main.js             # 主循环：物理、碰撞、绘制、地图切换
├── images/                 # 游戏用到的所有图片资源
└── styles/
    └── styles.css          # 页面和 Canvas 背景样式
```

## 脚本加载顺序

因为去掉了 ES Module，`index.html` 必须按下面的顺序加载脚本：

```html
<script src="js/map1.js"></script>
<script src="js/map2.js"></script>
<script src="js/main.js"></script>
```

- `map1.js` 和 `map2.js` 各自把地图对象挂到 `window.IW_MAPS`。
- `main.js` 最后执行，从 `window.IW_MAPS` 读取两张地图。

## 与主线的衔接

这个小游戏已经接入主线剧情，流程如下：

```text
Sami_Village.html（俯视角，萨米村）
  → 与提丰对话选「前进」→ 读完 sami_typhon2.1
  → 跳转本目录 index.html（第一关）
  → 触碰到出口梯子（原本进入 map2 的地方）
  → 跳转 coming_soon.html（占位页）
```

- 从主线跳入由 `js/dialogues/sami-village.js` 里 `sami_typhon2.1` 的 `to` 字段触发（引擎 `finishDialogue()` 检测 `lastPage.to`）。
- 第一关结束后的跳转在 `js/main.js` 的 `touchesTile('1')` 分支里，写成 `window.location.href = 'coming_soon.html'`。
- 目前没有退出选项（以后再说），真正的第二关（`map2.js`）尚未接入。

## 操作

```text
A / D       左右移动
W / 空格    跳跃（离开地面后 0.3 秒内仍可起跳）
F           攀爬梯子
R           重置玩家
```

## 操控与物理调参

人物手感相关的参数目前内联在 `js/main.js` 里，当前取值如下：

| 参数 | 位置 | 当前值 | 说明 |
|---|---|---|---|
| 横向移速 | [main.js:1097](js/main.js#L1097) / [1100](js/main.js#L1100) | `2.1` | 走路与空中横移共用（每帧像素） |
| 跳跃初速 | [main.js:1040](js/main.js#L1040) | `-4.0249` | 起跳瞬间的竖直速度（负号向上） |
| 重力 | [main.js:15](js/main.js#L15) | `0.07776` | 每帧加速度 |
| 攀爬速度 | [main.js:859](js/main.js#L859) | `2` | 按 F 爬梯每帧上移像素 |
| 土狼时间 | [main.js:596](js/main.js#L596) | `300` | 离开地面后仍可起跳的毫秒数 |

> 注意：这些是「每帧」的量，游戏循环约 60fps。

物理关系（方便后续调手感）：

```text
跳跃高度   H = V² / (2G)
滞空时间   T = 2V / G
横向跳跃距离 D = 横向速度 × T
```

- **整体变慢 / 变快**（保持高度和距离不变）：横向速度、跳跃初速、攀爬速度同乘 `s`，重力乘 `s²`。
- **只调重力、保持高度不变**：重力乘 `k` 时，跳跃初速乘 `√k`（高度不变，滞空时间和距离按 `1/√k` 变化）。

## 与原版的差异

1. **去掉 ES Module**：`import` / `export` 改为普通全局脚本，支持 `file://` 直接打开。
2. **资源路径统一**：所有图集路径统一指向本目录的 `images/`；原先 `map2` 里引用上级目录的 `../img/winter_outdoorsTileSheet.png` 已改为 `images/winter_outdoorsTileSheet.png`，并随资源一起复制进来。
3. **去掉未使用的 `constants.js`**：原版中的 `constants.js`（`T`、`DEFAULT_SOURCE_TILE_SIZE` 等）没有被主循环实际使用，`main.js` 内联了世界格尺寸 32 和源图单元 16，因此未保留。
4. **清理 `map2.js` 中重复的 `"."` 图块定义**（两条相同的键合并为一条）。
5. **地图贴图替换**：`map1.js` 里 `"0"`（地面）改用 `ut_winter_scene.png` 的 (5,26) 图块。该图块源图单元是 20×20，已显式用 `sx:100 / sy:520 / sw:20 / sh:20` 指定，并由引擎缩放到 32×32 世界格。
6. **手感调校**：横向移速、跳跃初速、重力、攀爬速度已重新调整；新增「土狼时间」（落地后 0.3 秒内可跳）和空格起跳。

## 地图碰撞规则（现状）

平台碰撞目前仍依赖地图字符：

```text
"0"       // 可站立地面
"1"       // 梯子
"2" 到 "7" // 二级墙体、斜坡或平台
","       // 危险区域
```

`main.js` 中的 `isGroundTile`、`isSlopeTile`、`isSecondaryWallTile` 等函数直接检查这些字符，暂未改造成读取 `tileTypes[*].solid` 的适配层。
