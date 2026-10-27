# Local Godot MCP Setup

โปรเจคนี้ติดตั้ง Godot MCP ไว้ 2 รุ่นใน `game-dev/mcp-servers/`:

## Servers

### `godot-local`

ใช้ `Coding-Solo/godot-mcp` รุ่นต้นฉบับ:

```text
game-dev/mcp-servers/godot-mcp/build/index.js
```

เหมาะสำหรับ:

- เปิดและรัน Godot project
- ตรวจ debug output
- จัดการ project เบื้องต้น
- ใช้เป็น MCP server หลักที่เสถียรและเล็ก

### `godot-full-local`

ใช้ fork `tugcantopaloglu/godot-mcp`:

```text
game-dev/mcp-servers/godot-mcp-tugcan/build/index.js
```

เหมาะสำหรับ:

- Scene และ node manipulation
- 2D/3D rendering
- Physics
- Input Map
- UI และ Audio
- Animation
- Runtime inspection
- GDScript validation
- TileMap, particles, camera และ export

## MCP configuration

ตั้งค่าไว้ใน `.mcp.json` ที่ workspace root แล้ว หลังแก้ไขควรใช้คำสั่ง **Developer: Reload Window** หรือ reload MCP servers ใน VS Code

## Godot Engine requirement

MCP server ติดตั้งแล้ว แต่ต้องติดตั้ง Godot Engine 4.4+ เพื่อเปิดและรันโปรเจคจริง หากคำสั่ง `godot` ยังไม่อยู่ใน PATH ให้เพิ่ม path ของ Godot executable ก่อนใช้งาน

## ขอบเขต

การติดตั้งนี้เป็นเครื่องมือสำหรับพัฒนา Version 2 และไม่แก้ไขหรือใช้งานโฟลเดอร์โปรเจคอื่นนอก workspace ที่กำหนด
