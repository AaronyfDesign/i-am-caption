# 04 · 给你留了座位 / Saving You a Seat

| 原始照片 | 最终作品 |
| :---: | :---: |
| <img src="source.jpg" alt="露台空座原照" width="300"> | <img src="result.jpg" alt="I AM SAVING YOU A SEAT 成品" width="300"> |

- **Statement**: `I AM SAVING YOU A SEAT`
- **视角**：这套空着的座位。
- **方向**：关系宣言——水壶和杯子已摆上桌、遮阳伞撑好、两把椅子面对着面。宣言里的「你」就是画外的故事：有人还没来，下午茶在等。
- **位置**：几何中心直接成立（桌椅主体在下方零遮挡）。
- **可读性**：白字压白栅栏，位置不动，改用 `--backing 0.35` 衬底解决。
- **渲染**: `python3 scripts/render_i_am_caption.py source.jpg -t "SAVING YOU A SEAT" -o result.jpg --backing 0.35 --html editor.html`
