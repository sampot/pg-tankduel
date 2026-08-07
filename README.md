# pg-tankduel

瀏覽器**戰車對決**：俯視坦克、履帶／炮塔細節、掩體彈道、重低音爆炸。純前端；**mobile-first** 虛擬搖桿＋開火鍵。

也可當作 [Playgrounds（遊樂場）](https://play.samkuo.me/) 的 **SAM**（`index.html` 入口）。

## 一鍵開 SAM 小

**[一鍵開 SAM 小](https://play.samkuo.me/?open=sampot%2Fpg-tankduel&name=%E6%88%B0%E8%BB%8A%E5%B0%8D%E6%B1%BA)**

```
https://play.samkuo.me/?open=sampot/pg-tankduel&name=戰車對決
```

同源會重用本機已匯入的沙盒；要強制新建可加 `&fresh=1`。

## 試玩（本機）

```bash
npx --yes serve .
# 或
python3 -m http.server 8080
```

點一下頁面後音效才會出聲。

## 操作

| 操作 | 說明 |
| --- | --- |
| 左搖桿／WASD | 移動（炮塔跟移動方向） |
| 炮鈕／空白鍵 | 開火 |
| **開戰** | 開始或重開 |

## 檔案

| 檔案 | 說明 |
| --- | --- |
| `index.html` | 結構 |
| `styles.css` | 手機優先／桌面遞增 |
| `app.js` | 輸入、HUD、主迴圈 |
| `game.js` | 物理、AI、勝敗 |
| `sprites.js` | 坦克／爆炸繪製 |
| `audio.js` | 炮擊與爆炸 Web Audio |
| `functions.js` | Playgrounds 可選 stub |

## License

MIT
