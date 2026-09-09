const map1 = window.IW_MAPS.map1;
const map2 = window.IW_MAPS.map2;

let map = map1;
let currentMapName = 'map1';

const canvas = document.querySelector('canvas');
const c=canvas.getContext('2d');

const tileSize = 32;
canvas.width = map.width * tileSize;
canvas.height = map.height * tileSize;

//重力和地图平台
const gravity=0.07776;

const tileImages = {};
let loadedTileImages = 0;
const alexImage = new Image();
const alexFrameWidth = 16;
const alexFrameHeight = 32;
const alexDisplayWidth = 20;
const alexDisplayHeight = 40;
let alexFrame = 0;
let alexAnimationTick = 0;
let alexFacingRow = 3;
alexImage.src = 'images/Alex.png';

const mapObjects = [];

function loadMapAssets(){
    loadedTileImages = 0;
    for(const sheet of Object.keys(tileImages)){
        delete tileImages[sheet];
    }

    for(const [sheet, source] of Object.entries(map.sheets)){
        const image = new Image();
        image.src = source;
        image.onload = () => {
            loadedTileImages++;
        };
        tileImages[sheet] = image;
    }
}

function buildMapObjects(){
    mapObjects.length = 0;
    for(let row=0; row<map.objectMap.length; row++){
        for(let column=0; column<map.objectMap[row].length; column++){
            const typeName = map.objectChars[map.objectMap[row][column]];
            const objectType = map.objectTypes[typeName];
            if(objectType){
                mapObjects.push({
                    ...objectType,
                    typeName,
                    column,
                    row,
                    offsetX: 0,
                    offsetY: 0,
                    speedX: 0,
                    speedY: 0,
                    triggered: false,
                });
            }
        }
    }
}

loadMapAssets();
buildMapObjects();

// 根据物体位置和图片尺寸计算碰撞范围。
function getObjectBounds(object){
    const scale = tileSize / 16;
    const insetX = object.collisionInsetX ?? 0;
    const left = (object.column - object.ax) * tileSize + object.offsetX;
    const width = object.sw * scale;
    return {
        left: left + insetX,
        top: (object.row - object.ay) * tileSize + object.offsetY,
        right: left + width - insetX,
        bottom: (object.row - object.ay) * tileSize + object.sh * scale + object.offsetY,
    };
}

// 判断两个矩形区域是否发生重叠碰撞。
function overlaps(boundsA, boundsB){
    return boundsA.left < boundsB.right && boundsA.right > boundsB.left &&
        boundsA.top < boundsB.bottom && boundsA.bottom > boundsB.top;
}

// 获取 Alex 当前所在位置的矩形碰撞范围。
function getPlayerBounds(){
    return {
        left: player.position.x,
        top: player.position.y,
        right: player.position.x + player.width,
        bottom: player.position.y + player.height,
    };
}

// 判断 Alex 是否碰到了指定类型的物体。
function touchesObject(typeName){
    const playerBounds = getPlayerBounds();
    return mapObjects.some((object) =>
        object.typeName === typeName &&
        overlaps(playerBounds, getObjectBounds(object)),
    );
}

// 判断 Alex 是否接触地图中的边界物体。
function touchesBorder(){
    const playerBounds = getPlayerBounds();
    return mapObjects.some((object) =>
        map.objectChars[map.objectMap[object.row][object.column]] === 'border' &&
        overlaps(playerBounds, getObjectBounds(object)),
    );
}

// 判断角色是否站在边界物体的顶部平台上。
function isStandingOnBorder(fighter){
    const playerBounds = getPlayerBounds();
    return mapObjects.some((object) => {
        const typeName = map.objectChars[map.objectMap[object.row][object.column]];
        const objectBounds = getObjectBounds(object);
        return (typeName === 'border' || typeName === 'on_stone') &&
            playerBounds.left < objectBounds.right &&
            playerBounds.right > objectBounds.left &&
            Math.abs(playerBounds.bottom - objectBounds.top) <= 1;
    });
}

// 处理角色与边界物体之间的移动碰撞。
function resolveBorderCollision(previousX, previousTop, previousRight, previousBottom){
    const playerBounds = getPlayerBounds();

    for(const object of mapObjects){
        const typeName = map.objectChars[map.objectMap[object.row][object.column]];
        if(typeName !== 'border' && typeName !== 'on_stone'){
            continue;
        }

        const objectBounds = getObjectBounds(object);
        if(!overlaps(playerBounds, objectBounds)){
            continue;
        }

        if(player.speed.y > 0 && previousBottom <= objectBounds.top){
            player.position.y = objectBounds.top - player.height;
            player.speed.y = 0;
        } else if(player.speed.y < 0 && previousTop >= objectBounds.bottom){
            player.position.y = objectBounds.bottom;
            player.speed.y = 0;
        }

        if(player.speed.x > 0 && previousRight <= objectBounds.left){
            player.position.x = objectBounds.left - player.width;
        } else if(player.speed.x < 0 && previousX >= objectBounds.right){
            player.position.x = objectBounds.right;
        }
    }
}

// 根据地图瓦片绘制游戏场景背景画面。
function drawBackground() {
    for (let y = 0; y < map.tiles.length; y++) {
        for (let x = 0; x < map.tiles[y].length; x++) {
            const tile = map.tiles[y][x];
            // 空白瓦片不绘制，让 canvas 的 background.png 显示出来。
            if (tile === '.') {
                continue;
            }

            const tileInfo = map.tileTypes[tile];
            if (!tileInfo || !tileImages[tileInfo.sheet]) {
                continue;
            }

            const sourceX = tileInfo.sx ?? tileInfo.col * 16;
            const sourceY = tileInfo.sy ?? tileInfo.row * 16;
            const sourceWidth = tileInfo.sw ?? 16;
            const sourceHeight = tileInfo.sh ?? 16;

            c.drawImage(
                tileImages[tileInfo.sheet],
                sourceX, sourceY, sourceWidth, sourceHeight,
                x * tileSize, y * tileSize, tileSize, tileSize,
            );
        }
    }
}

// 绘制地图中的所有物体及其动态位置。
function drawObjects(){
    const scale = tileSize / 16;
    for(const object of mapObjects){
        if(object.typeName === 'water_barrel' || object.typeName === 'push_barrel2'){
            continue;
        }

        const drawCrop = object.drawCrop ?? 0;
        const drawInsetX = object.drawInsetX ?? 0;
        const drawInsetY = object.drawInsetY ?? 0;
        const sourceX = object.sx + drawCrop;
        const sourceY = object.sy + drawCrop;
        const sourceWidth = object.sw - drawCrop * 2;
        const sourceHeight = object.sh - drawCrop * 2;
        const cropSize = drawCrop * scale;
        const drawX = (object.column - object.ax) * tileSize + object.offsetX +
            drawInsetX + cropSize;
        const drawY = (object.row - object.ay) * tileSize + object.offsetY +
            drawInsetY + cropSize;
        const drawWidth = object.sw * scale - drawInsetX * 2 - cropSize * 2;
        const drawHeight = object.sh * scale - drawInsetY * 2 - cropSize * 2;

        c.drawImage(
            tileImages[object.sheet],
            sourceX, sourceY, sourceWidth, sourceHeight,
            drawX, drawY, drawWidth, drawHeight,
        );
    }
}

// 在尖刺之后绘制大桶，确保 push_barrel2 优先显示。
function drawPushBarrel2(){
    const scale = tileSize / 16;
    for(const object of mapObjects){
        if(object.typeName !== 'push_barrel2'){
            continue;
        }

        const drawCrop = object.drawCrop ?? 0;
        const drawInsetX = object.drawInsetX ?? 0;
        const cropSize = drawCrop * scale;
        const drawX = (object.column - object.ax) * tileSize + object.offsetX +
            drawInsetX + cropSize;
        const drawY = (object.row - object.ay) * tileSize + object.offsetY + cropSize;
        c.drawImage(
            tileImages[object.sheet],
            object.sx + drawCrop, object.sy + drawCrop,
            object.sw - drawCrop * 2, object.sh - drawCrop * 2,
            drawX, drawY,
            object.sw * scale - drawInsetX * 2 - cropSize * 2,
            object.sh * scale - cropSize * 2,
        );
    }
}

// 在 Alex 绘制后显示水桶，确保水桶位于角色上层。
function drawWaterBarrels(){
    const scale = tileSize / 16;
    for(const object of mapObjects){
        if(object.typeName !== 'water_barrel'){
            continue;
        }

        const drawX = (object.column - object.ax) * tileSize + object.offsetX;
        const drawY = (object.row - object.ay) * tileSize + object.offsetY;
        c.drawImage(
            tileImages[object.sheet],
            object.sx, object.sy, object.sw, object.sh,
            drawX, drawY, object.sw * scale, object.sh * scale,
        );
    }
}

// 检测上方角色并控制尖刺向上移动。
function updateStabUp(){
    const playerBounds = getPlayerBounds();

    for(const object of mapObjects){
        if(object.typeName !== 'stab_up'){
            continue;
        }

        const objectBounds = getObjectBounds(object);
        const isAbove = playerBounds.bottom <= objectBounds.top &&
            playerBounds.right > objectBounds.left &&
            playerBounds.left < objectBounds.right;

        if(isAbove && !object.triggered){
            object.triggered = true;
            object.speedY = -7.25;
        }

        object.offsetY += object.speedY;
        if(object.offsetY <= -66){
            object.offsetY = -66;
            object.speedY = 0;
        }
    }
}

// 更新桶的重力、移动、地面落地和墙壁水平碰撞。
function updatePushBarrels(){
    for(const object of mapObjects){
        if(object.typeName !== 'push_barrel' && object.typeName !== 'push_barrel2'){
            continue;
        }

        const previousBounds = getObjectBounds(object);
        object.speedY += gravity;
        object.offsetY += object.speedY;
        object.offsetX += object.speedX;
        object.speedX *= 0.7;

        resolveBarrelSolidTileCollision(object, previousBounds);
        resolveBarrelSecondaryTileCollision(object, previousBounds);

        const objectBounds = getObjectBounds(object);
        let landingTop = Infinity;
        const firstColumn = Math.floor(objectBounds.left / tileSize);
        const lastColumn = Math.floor((objectBounds.right - 1) / tileSize);
        const objectCenterX = (objectBounds.left + objectBounds.right) / 2;

        for(let row=0; row<map.tiles.length; row++){
            for(let column=firstColumn; column<=lastColumn; column++){
                const surfaceY = getGroundSurfaceY(row, column, objectCenterX);
                if(surfaceY === null ||
                    surfaceY < objectBounds.bottom - object.speedY ||
                    surfaceY > objectBounds.bottom){
                    continue;
                }

                landingTop = Math.min(landingTop, surfaceY);
            }
        }

        if(landingTop !== Infinity){
            object.offsetY += landingTop - objectBounds.bottom;
            object.speedY = 0;
        }

        const playerBounds = getPlayerBounds();
        if(!overlaps(playerBounds, getObjectBounds(object))){
            continue;
        }

        if(player.speed.x > 0){
            object.speedX = player.speed.x;
            player.position.x = getObjectBounds(object).left - player.width;
        } else if(player.speed.x < 0){
            object.speedX = player.speed.x;
            player.position.x = getObjectBounds(object).right;
        }
    }
}

// 以最高优先级处理桶与 0 地面格的四方向碰撞分离。
function resolveBarrelSolidTileCollision(object, previousBounds){
    let objectBounds = getObjectBounds(object);
    if(objectBounds.left < 0){
        object.offsetX -= objectBounds.left;
        object.speedX = 0;
    } else if(objectBounds.right > canvas.width){
        object.offsetX -= objectBounds.right - canvas.width;
        object.speedX = 0;
    }

    objectBounds = getObjectBounds(object);
    const sweptLeft = Math.min(previousBounds.left, objectBounds.left);
    const sweptRight = Math.max(previousBounds.right, objectBounds.right);
    const sweptTop = Math.min(previousBounds.top, objectBounds.top);
    const sweptBottom = Math.max(previousBounds.bottom, objectBounds.bottom);
    const firstRow = Math.max(0, Math.floor(sweptTop / tileSize));
    const lastRow = Math.min(map.tiles.length - 1,
        Math.floor((sweptBottom - 1) / tileSize));
    const firstColumn = Math.max(0, Math.floor(sweptLeft / tileSize));
    const lastColumn = Math.min(map.width - 1,
        Math.floor((sweptRight - 1) / tileSize));

    for(let row=firstRow; row<=lastRow; row++){
        for(let column=firstColumn; column<=lastColumn; column++){
            if(!isGroundTile(row, column)){
                continue;
            }

            const tileLeft = column * tileSize;
            const tileTop = row * tileSize;
            const tileRight = tileLeft + tileSize;
            const tileBottom = tileTop + tileSize;
            const overlapsX = sweptLeft < tileRight && sweptRight > tileLeft;
            const overlapsY = sweptTop < tileBottom && sweptBottom > tileTop;
            if(!overlapsX || !overlapsY){
                continue;
            }

            if(object.speedY >= 0 && previousBounds.bottom <= tileTop &&
                objectBounds.bottom >= tileTop){
                object.offsetY += tileTop - objectBounds.bottom;
                object.speedY = 0;
            } else if(object.speedY < 0 && previousBounds.top >= tileBottom &&
                objectBounds.top <= tileBottom){
                object.offsetY += tileBottom - objectBounds.top;
                object.speedY = 0;
            } else if(object.speedX > 0 && previousBounds.right <= tileLeft &&
                objectBounds.right >= tileLeft){
                object.offsetX += tileLeft - objectBounds.right;
                object.speedX = 0;
            } else if(object.speedX < 0 && previousBounds.left >= tileRight &&
                objectBounds.left <= tileRight){
                object.offsetX += tileRight - objectBounds.left;
                object.speedX = 0;
            }

            objectBounds = getObjectBounds(object);
        }
    }
}

// 防止桶与地图左右边界及实心地面格发生水平重叠。
function resolveBarrelHorizontalCollision(object, previousBounds){
    const objectBounds = getObjectBounds(object);
    if(objectBounds.left < 0){
        object.offsetX -= objectBounds.left;
        object.speedX = 0;
    } else if(objectBounds.right > canvas.width){
        object.offsetX -= objectBounds.right - canvas.width;
        object.speedX = 0;
    }

    const firstRow = Math.max(0, Math.floor(objectBounds.top / tileSize));
    const lastRow = Math.min(
        map.tiles.length - 1,
        Math.floor((objectBounds.bottom - 1) / tileSize),
    );

    for(let row=firstRow; row<=lastRow; row++){
        for(let column=0; column<map.width; column++){
            if(!isGroundTile(row, column)){
                continue;
            }

            const tileLeft = column * tileSize;
            const tileRight = tileLeft + tileSize;
            const tileTop = row * tileSize;
            const tileBottom = tileTop + tileSize;
            const overlapsVertically = objectBounds.top < tileBottom &&
                objectBounds.bottom > tileTop;
            if(!overlapsVertically ||
                objectBounds.right <= tileLeft || objectBounds.left >= tileRight){
                continue;
            }

            if(object.speedX > 0 && previousBounds.right <= tileLeft){
                object.offsetX -= objectBounds.right - tileLeft;
                object.speedX = 0;
            } else if(object.speedX < 0 && previousBounds.left >= tileRight){
                object.offsetX += tileRight - objectBounds.left;
                object.speedX = 0;
            }
        }
    }
}

// 以第二优先级处理桶与 2 到 7 墙体的四方向碰撞。
function resolveBarrelSecondaryTileCollision(object, previousBounds){
    let objectBounds = getObjectBounds(object);
    const firstRow = Math.max(0, Math.floor(objectBounds.top / tileSize));
    const lastRow = Math.min(
        map.tiles.length - 1,
        Math.floor((objectBounds.bottom - 1) / tileSize),
    );
    const firstColumn = Math.max(0, Math.floor(objectBounds.left / tileSize));
    const lastColumn = Math.min(
        map.width - 1,
        Math.floor((objectBounds.right - 1) / tileSize),
    );

    for(let row=firstRow; row<=lastRow; row++){
        for(let column=firstColumn; column<=lastColumn; column++){
            if(!overlapsSecondaryWall(objectBounds, row, column)){
                continue;
            }

            const tileLeft = column * tileSize;
            const tileTop = row * tileSize;
            const tileRight = tileLeft + tileSize;
            const tileBottom = tileTop + tileSize;
            const surfaceY = getGroundSurfaceY(
                row,
                column,
                (objectBounds.left + objectBounds.right) / 2,
            );

            if(object.speedY >= 0 && previousBounds.bottom <= surfaceY &&
                objectBounds.bottom >= surfaceY){
                object.offsetY += surfaceY - objectBounds.bottom;
                object.speedY = 0;
            } else if(object.speedY < 0 && previousBounds.top >= tileBottom &&
                objectBounds.top <= tileBottom){
                object.offsetY += tileBottom - objectBounds.top;
                object.speedY = 0;
            } else if(object.speedX > 0 && previousBounds.right <= tileLeft){
                object.offsetX += tileLeft - objectBounds.right;
                object.speedX = 0;
            } else if(object.speedX < 0 && previousBounds.left >= tileRight){
                object.offsetX += tileRight - objectBounds.left;
                object.speedX = 0;
            }

            objectBounds = getObjectBounds(object);
        }
    }
}

// 防止桶从下方穿过 0 地面格，保持四面不可穿透。
function resolveBarrelVerticalCollision(object, previousBounds){
    if(object.speedY >= 0){
        return;
    }

    const objectBounds = getObjectBounds(object);
    const firstColumn = Math.max(0, Math.floor(objectBounds.left / tileSize));
    const lastColumn = Math.min(
        map.width - 1,
        Math.floor((objectBounds.right - 1) / tileSize),
    );

    for(let row=0; row<map.tiles.length; row++){
        for(let column=firstColumn; column<=lastColumn; column++){
            if(!isGroundTile(row, column)){
                continue;
            }

            const tileBottom = (row + 1) * tileSize;
            const tileLeft = column * tileSize;
            const tileRight = tileLeft + tileSize;
            if(previousBounds.top >= tileBottom &&
                objectBounds.top < tileBottom &&
                objectBounds.right > tileLeft &&
                objectBounds.left < tileRight){
                object.offsetY += tileBottom - objectBounds.top;
                object.speedY = 0;
                return;
            }
        }
    }
}

// 根据移动方向和时间更新 Alex 的行走动画。
function updateAlexAnimation(){
    const isMovingLeft = keys.a && !keys.d;
    const isMovingRight = keys.d && !keys.a;
    const isMoving = isMovingLeft || isMovingRight;

    if(isMovingLeft){
        alexFacingRow = 3;
    } else if(isMovingRight){
        alexFacingRow = 1;
    }

    if(!isMoving){
        alexFrame = 0;
        alexAnimationTick = 0;
        return;
    }

    alexAnimationTick++;
    if(alexAnimationTick >= 4){
        alexAnimationTick = 0;
        alexFrame = (alexFrame + 1) % 4;
    }
}

// 按当前动画帧和位置绘制 Alex 角色图像。
function drawPlayer(){
    if(!alexImage.complete){
        return;
    }

    const drawX = player.position.x + player.width / 2 - alexDisplayWidth / 2;
    const drawY = player.position.y;
    c.drawImage(
        alexImage,
        alexFrame * alexFrameWidth,
        alexFacingRow * alexFrameHeight,
        alexFrameWidth,
        alexFrameHeight,
        drawX,
        drawY,
        alexDisplayWidth,
        alexDisplayHeight,
    );
}

const player={
    position:{x:0,y:0},
    width:alexDisplayWidth,
    height:alexDisplayHeight,
    speed:{x:0 , y:0},
}

// 土狼时间：离开地面后仍可在 0.3 秒内起跳，优化手感。
const COYOTE_TIME = 300;
let lastGroundedAt = -Infinity;

// 判断指定地图坐标是否属于可站立地面。
function isGroundTile(row, column){
    return map.tiles[row]?.[column] === '0';
}

// 判断地图格子是否属于左上向右下的斜坡。
function isSlopeTile(row, column){
    const tile = map.tiles[row]?.[column];
    return tile === '2' || tile === '4' || tile === '7';
}

// 根据格子类型计算角色或物体接触面的高度。
function getGroundSurfaceY(row, column, worldX){
    const tile = map.tiles[row]?.[column];
    if(tile === '0'){
        return row * tileSize;
    }

    if(isSlopeTile(row, column)){
        const localX = Math.max(0, Math.min(tileSize, worldX - column * tileSize));
        return row * tileSize + localX;
    }

    if(isSecondaryWallTile(row, column)){
        return row * tileSize;
    }

    return null;
}

// 判断地图格子是否属于 2 到 7 的第二级墙体。
function isSecondaryWallTile(row, column){
    const tile = map.tiles[row]?.[column];
    return tile >= '2' && tile <= '7';
}

// 判断矩形是否进入二级墙体的实体部分。
function overlapsSecondaryWall(bounds, row, column){
    if(!isSecondaryWallTile(row, column)){
        return false;
    }

    const tileLeft = column * tileSize;
    const tileTop = row * tileSize;
    const tileRight = tileLeft + tileSize;
    const tileBottom = tileTop + tileSize;
    if(bounds.right <= tileLeft || bounds.left >= tileRight ||
        bounds.top >= tileBottom){
        return false;
    }

    if(isSlopeTile(row, column)){
        const centerX = (bounds.left + bounds.right) / 2;
        const surfaceY = getGroundSurfaceY(row, column, centerX);
        return bounds.bottom > surfaceY;
    }

    return bounds.bottom > tileTop;
}

// 防止 Alex 从左右方向穿过地图中的 0 地面墙体。
function resolvePlayerGroundSideCollision(previousX, previousRight, previousTop, previousBottom){
    const playerBounds = getPlayerBounds();
    const sweptLeft = Math.min(previousX, playerBounds.left);
    const sweptRight = Math.max(previousRight, playerBounds.right);
    const sweptTop = Math.min(previousTop, playerBounds.top);
    const sweptBottom = Math.max(previousBottom, playerBounds.bottom);
    const firstRow = Math.max(0, Math.floor(sweptTop / tileSize));
    const lastRow = Math.min(
        map.tiles.length - 1,
        Math.floor((sweptBottom - 1) / tileSize),
    );

    if(playerBounds.left < 0){
        player.position.x = 0;
        player.speed.x = 0;
    } else if(playerBounds.right > canvas.width){
        player.position.x = canvas.width - player.width;
        player.speed.x = 0;
    }

    for(let row=firstRow; row<=lastRow; row++){
        for(let column=0; column<map.width; column++){
            if(!isGroundTile(row, column)){
                continue;
            }

            const tileLeft = column * tileSize;
            const tileRight = tileLeft + tileSize;
            const tileTop = row * tileSize;
            const tileBottom = tileTop + tileSize;
            const overlapsVertically = sweptTop < tileBottom &&
                sweptBottom > tileTop;
            if(!overlapsVertically ||
                sweptRight <= tileLeft || sweptLeft >= tileRight){
                continue;
            }

            if(player.speed.x > 0 && previousRight <= tileLeft){
                player.position.x = tileLeft - player.width;
                player.speed.x = 0;
            } else if(player.speed.x < 0 && previousX >= tileRight){
                player.position.x = tileRight;
                player.speed.x = 0;
            }
        }
    }
}

// 以第二优先级处理 Alex 与 2 到 7 墙体的四方向碰撞。
function resolvePlayerSecondaryTileCollision(previousX, previousRight, previousTop, previousBottom){
    let playerBounds = getPlayerBounds();
    const firstRow = Math.max(0, Math.floor(playerBounds.top / tileSize));
    const lastRow = Math.min(
        map.tiles.length - 1,
        Math.floor((playerBounds.bottom - 1) / tileSize),
    );
    const firstColumn = Math.max(0, Math.floor(playerBounds.left / tileSize));
    const lastColumn = Math.min(
        map.width - 1,
        Math.floor((playerBounds.right - 1) / tileSize),
    );

    for(let row=firstRow; row<=lastRow; row++){
        for(let column=firstColumn; column<=lastColumn; column++){
            if(!overlapsSecondaryWall(playerBounds, row, column)){
                continue;
            }

            const tileLeft = column * tileSize;
            const tileTop = row * tileSize;
            const tileRight = tileLeft + tileSize;
            const tileBottom = tileTop + tileSize;
            const surfaceY = getGroundSurfaceY(
                row,
                column,
                player.position.x + player.width / 2,
            );

            if(player.speed.y >= 0 && previousBottom <= surfaceY &&
                playerBounds.bottom >= surfaceY){
                player.position.y = surfaceY - player.height;
                player.speed.y = 0;
            } else if(player.speed.y < 0 && previousTop >= tileBottom &&
                playerBounds.top <= tileBottom){
                player.position.y = tileBottom;
                player.speed.y = 0;
            } else if(player.speed.x > 0 && previousRight <= tileLeft){
                player.position.x = tileLeft - player.width;
                player.speed.x = 0;
            } else if(player.speed.x < 0 && previousX >= tileRight){
                player.position.x = tileRight;
                player.speed.x = 0;
            }

            playerBounds = getPlayerBounds();
        }
    }
}

// 处理 Alex 与两个可推动桶的上下表面碰撞。
function resolvePlayerBarrelVerticalCollision(previousTop, previousBottom){
    const playerBounds = getPlayerBounds();

    for(const object of mapObjects){
        if(object.typeName !== 'push_barrel' && object.typeName !== 'push_barrel2'){
            continue;
        }

        const objectBounds = getObjectBounds(object);
        const overlapsHorizontally = playerBounds.left < objectBounds.right &&
            playerBounds.right > objectBounds.left;
        if(!overlapsHorizontally){
            continue;
        }

        const canStepOntoBarrel = player.speed.y >= 0 &&
            playerBounds.bottom > objectBounds.top &&
            playerBounds.bottom <= objectBounds.top + player.height;
        if((player.speed.y >= 0 && previousBottom <= objectBounds.top &&
            playerBounds.bottom >= objectBounds.top) || canStepOntoBarrel){
            player.position.y = objectBounds.top - player.height;
            player.speed.y = 0;
        } else if(player.speed.y < 0 && previousTop >= objectBounds.bottom &&
            playerBounds.top <= objectBounds.bottom){
            player.position.y = objectBounds.bottom;
            player.speed.y = 0;
        }
    }
}

const climbExitMotion = {
    active: false,
    startX: 0,
    targetX: 0,
    startTime: 0,
};

// 查找角色当前接触的竖直攀爬区域。
function findClimbSegment(){
    const playerBounds = getPlayerBounds();
    const firstColumn = Math.floor(playerBounds.left / tileSize);
    const lastColumn = Math.floor((playerBounds.right - 1) / tileSize);

    for(let column=firstColumn; column<=lastColumn; column++){
        let topRow = -1;
        let bottomRow = -1;
        for(let row=0; row<map.tiles.length; row++){
            if(map.tiles[row]?.[column] !== '1'){
                if(topRow !== -1){
                    break;
                }
                continue;
            }

            if(topRow === -1){
                topRow = row;
            }
            bottomRow = row;
        }

        if(topRow !== -1 &&
            playerBounds.bottom >= topRow * tileSize - 8 &&
            playerBounds.top <= (bottomRow + 1) * tileSize + 8){
            return { column, topRow, bottomRow };
        }
    }

    return null;
}

// 按住交互键控制角色沿竖直梯子向上攀爬。
function updateClimbing(){
    if(!keys.f){
        climbExitMotion.active = false;
        return false;
    }

    if(climbExitMotion.active){
        const progress = Math.min(
            1,
            (performance.now() - climbExitMotion.startTime) / 300,
        );
        player.position.x = climbExitMotion.startX +
            (climbExitMotion.targetX - climbExitMotion.startX) * progress;
        player.speed.y = 0;
        if(progress >= 1){
            climbExitMotion.active = false;
            return false;
        }
        return true;
    }

    const segment = findClimbSegment();
    if(!segment){
        return false;
    }

    const climbTop = segment.topRow * tileSize - player.height - 2;
    player.position.x = segment.column * tileSize + (tileSize - player.width) / 2;
    player.position.y = Math.max(climbTop, player.position.y - 2);
    player.speed.y = 0;

    if(player.position.y <= climbTop){
        let exitColumn = segment.column + 1;
        while(exitColumn < map.width && isGroundTile(segment.topRow, exitColumn)){
            exitColumn++;
        }

        climbExitMotion.active = true;
        climbExitMotion.startX = player.position.x;
        climbExitMotion.targetX = exitColumn < map.width ?
            exitColumn * tileSize + (tileSize - player.width) / 2 :
            canvas.width - player.width;
        climbExitMotion.startTime = performance.now();
    }

    return true;
}

// 从地图底部向上查找 Alex 的出生高度。
function getSpawnY(){
    for(let row=map.tiles.length-1; row>=0; row--){
        const platformTop = row * tileSize;
        if(platformTop < canvas.height && isGroundTile(row, 0)){
            return platformTop - player.height;
        }
    }
    return 0;
}

let respawnPoint = {
    x: 0,
    y: getSpawnY(),
};

function findTile(tileValue){
    for(let row=0; row<map.tiles.length; row++){
        const column = map.tiles[row].indexOf(tileValue);
        if(column !== -1){
            return { row, column };
        }
    }
    return null;
}

function switchToMap2(){
    map = map2;
    currentMapName = 'map2';
    canvas.width = map.width * tileSize;
    canvas.height = map.height * tileSize;
    loadMapAssets();
    buildMapObjects();

    const spawnTile = findTile(',');
    respawnPoint = spawnTile ? {
        x: (spawnTile.column + 1) * tileSize + 4,
        y: (spawnTile.row + 2) * tileSize - player.height,
    } : { x: 0, y: getSpawnY() };
    respawnPlayer();
}

function touchesTile(tileValue){
    const playerBounds = getPlayerBounds();
    const firstColumn = Math.max(0, Math.floor(playerBounds.left / tileSize));
    const lastColumn = Math.min(map.width - 1, Math.floor((playerBounds.right - 1) / tileSize));
    const firstRow = Math.max(0, Math.floor(playerBounds.top / tileSize));
    const lastRow = Math.min(map.height - 1, Math.floor((playerBounds.bottom - 1) / tileSize));

    for(let row=firstRow; row<=lastRow; row++){
        for(let column=firstColumn; column<=lastColumn; column++){
            if(map.tiles[row]?.[column] === tileValue){
                return true;
            }
        }
    }
    return false;
}

// 判断指定地图坐标是否属于危险地面区域。
function isHazardTile(row, column){
    return map.tiles[row]?.[column] === ',';
}

// 检测 Alex 当前是否接触危险地面区域。
function touchesHazard(){
    const firstColumn = Math.max(0, Math.floor(player.position.x / tileSize));
    const lastColumn = Math.min(
        map.width - 1,
        Math.floor((player.position.x + player.width - 1) / tileSize),
    );
    const firstRow = Math.max(0, Math.floor(player.position.y / tileSize));
    const lastRow = Math.min(
        map.height - 1,
        Math.floor((player.position.y + player.height - 1) / tileSize),
    );

    for(let row=firstRow; row<=lastRow; row++){
        for(let column=firstColumn; column<=lastColumn; column++){
            if(isHazardTile(row, column)){
                return true;
            }
        }
    }
    return false;
}

// 将 Alex 和动态地图物体恢复到初始状态。
function respawnPlayer(){
    player.position.x = respawnPoint.x;
    player.position.y = respawnPoint.y;
    player.speed.x = 0;
    player.speed.y = 0;
    climbExitMotion.active = false;
    lastGroundedAt = -Infinity;
    resetMapObjects();
}

// 判断角色当前是否站在地面或边界平台上。
function isOnGround(fighter){
    const feet = fighter.position.y + fighter.height;
    const row = Math.floor(feet / tileSize);
    const firstColumn = Math.floor(fighter.position.x / tileSize);
    const lastColumn = Math.floor((fighter.position.x + fighter.width - 1) / tileSize);

    for(let column=firstColumn; column<=lastColumn; column++){
        const platformTop = row * tileSize;
        if(isGroundTile(row, column) && Math.abs(feet - platformTop) <= 1){
            return true;
        }
    }

    for(const object of mapObjects){
        if(object.typeName !== 'push_barrel' && object.typeName !== 'push_barrel2'){
            continue;
        }

        const objectBounds = getObjectBounds(object);
        const overlapsHorizontally = fighter.position.x < objectBounds.right &&
            fighter.position.x + fighter.width > objectBounds.left;
        if(overlapsHorizontally && Math.abs(feet - objectBounds.top) <= 1){
            return true;
        }
    }

    return isStandingOnBorder(fighter);
}

// 将可移动地图物体重置到各自的初始位置。
function resetMapObjects(){
    for(const object of mapObjects){
        if(object.typeName === 'stab_up'){
            object.offsetY = 0;
            object.speedY = 0;
            object.triggered = false;
        } else if(object.typeName === 'push_barrel' ||
            object.typeName === 'push_barrel2'){
            object.offsetX = 0;
            object.offsetY = 0;
            object.speedX = 0;
            object.speedY = 0;
        } else {
            continue;
        }
    }
}

player.position.y = respawnPoint.y;

const keys={
    a:false,
    d:false,
    f:false,
    r:false,
}
//监听按键
window.addEventListener('keydown',(e)=>{
    switch(e.key){
        case "w":
        case " ":
            if(performance.now() - lastGroundedAt <= COYOTE_TIME){
                player.speed.y=-4.0249;
                lastGroundedAt = -Infinity;
            }
            break;
        case "a":
            keys.a=true;
            break;
        case "d":
            keys.d=true;
            break;
        case "f":
            keys.f=true;
            break;
        case "r":
            keys.r=true;
            respawnPlayer();
            break;
    }
})

window.addEventListener('keyup',(e)=>{
    switch(e.key){
        case "a":
            keys.a=false;
            break;
        case "d":
            keys.d=false;
            break;
        case "f":
            keys.f=false;
            break;
        case "r":
            keys.r=false;
            break;
    }
})
//判断地面 以及重力系统
// 循环更新物理状态、碰撞结果并刷新游戏画面。
function animate(){
    window.requestAnimationFrame(animate);

    
    c.clearRect(0,0,canvas.width,canvas.height);
    updateStabUp();
    if (loadedTileImages === Object.keys(map.sheets).length) {
        drawBackground();
        drawObjects();
        drawPushBarrel2();
    }

    drawPlayer();
    if (loadedTileImages === Object.keys(map.sheets).length) {
        drawWaterBarrels();
    }
    
    player.speed.x=0;
    if(keys.a){
        player.speed.x-=2.1;
    }
    else if(keys.d){
        player.speed.x+=2.1;
    }

    updateAlexAnimation();
    
    const previousX = player.position.x;
    const previousRight = previousX + player.width;
    const previousBottom = player.position.y + player.height;
    const previousTop = player.position.y;
    player.speed.y += gravity;
    player.position.y += player.speed.y;
    player.position.x += player.speed.x;

    const isClimbing = updateClimbing();
    resolvePlayerBarrelVerticalCollision(previousTop, previousBottom);
    updatePushBarrels();

    resolveBorderCollision(previousX, previousTop, previousRight, previousBottom);

    resolvePlayerGroundSideCollision(
        previousX,
        previousRight,
        previousTop,
        previousBottom,
    );
    resolvePlayerSecondaryTileCollision(
        previousX,
        previousRight,
        previousTop,
        previousBottom,
    );
    player.speed.x*=0.7;

    const currentTop = player.position.y;
    const firstColumn = Math.floor(player.position.x / tileSize);
    const lastColumn = Math.floor((player.position.x + player.width - 1) / tileSize);

    if(isClimbing){
        player.speed.y = 0;
    } else if(player.speed.y < 0){
        for(let row=0; row<map.tiles.length; row++){
            const platformBottom = (row + 1) * tileSize;
            if(currentTop > platformBottom || previousTop <= platformBottom){
                continue;
            }

            const playerCenterColumn = Math.floor(
                (player.position.x + player.width / 2) / tileSize,
            );
            if(isGroundTile(row, playerCenterColumn)){
                player.position.y=platformBottom;
                player.speed.y=0;
            }
            if(player.speed.y === 0){
                break;
            }
        }
    } else {
        const currentBottom = player.position.y + player.height;
        let landingTop = Infinity;

        for(let row=0; row<map.tiles.length; row++){
            const playerCenterX = player.position.x + player.width / 2;
            const playerCenterColumn = Math.floor(playerCenterX / tileSize);
            const surfaceY = getGroundSurfaceY(row, playerCenterColumn, playerCenterX);
            if(surfaceY !== null && surfaceY >= previousBottom &&
                surfaceY <= currentBottom){
                landingTop = Math.min(landingTop, surfaceY);
            }
        }

        if(landingTop !== Infinity){
            player.speed.y=0;
            player.position.y=landingTop-player.height;
        }
    }

    if(isOnGround(player)){
        lastGroundedAt = performance.now();
    }

    if(currentMapName === 'map1' && touchesTile('1')){
        window.location.href = 'coming_soon.html';
        return;
    }

    if(player.position.y > canvas.height || touchesHazard() || touchesObject('stab') || touchesObject('stab_up')){
        respawnPlayer();
    }
}

animate()