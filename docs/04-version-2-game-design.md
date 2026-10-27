# M-Game Version 2 — Fun-First Game Design

## เป้าหมาย

Version 2 เปลี่ยน M-Game จาก prototype RPG ที่เริ่มจากระบบบัญชีและการล็อกอิน เป็นเกมที่ผู้เล่นเปิดแล้วเล่นได้ทันที โดยให้ความสำคัญตามลำดับ:

1. ความสนุกใน 30 วินาทีแรก
2. การควบคุมที่เข้าใจง่าย
3. การต่อสู้ที่มีจังหวะและทางเลือก
4. ความก้าวหน้าที่เห็นผลทุกครั้งที่เล่น
5. ภาพและแอนิเมชันที่มีเอกลักษณ์

Blockchain, wallet, NFT และระบบ login ไม่อยู่ในขอบเขตของ V2

## Core loop ใหม่

```text
เลือกฮีโร่ → เลือก loadout → เลือกด่าน → ต่อสู้แบบ action-turn → เก็บ XP/เหรียญ/ของดรอป → อัปเกรด → ปลดล็อกด่าน
```

## รูปแบบการเล่น

- ผู้เล่นเริ่มแบบ Guest ไม่ต้องสมัครสมาชิก
- เล่นเป็น run สั้น 3–5 นาที
- ทุกเทิร์นมี 3 action points
- Attack ใช้ 1 point
- Skill ใช้ 2 points
- Guard ใช้ 1 point และสร้าง Momentum
- Item ใช้ 1 point
- เมื่อ Momentum เต็ม ใช้ Finisher ได้

## ระบบต่อสู้

### Resources

- HP: พลังชีวิต
- AP: action points ต่อเทิร์น
- Momentum: เกจท่าไม้ตาย
- Status: Burn, Poison, Freeze, Stun, Guard

### จังหวะที่ต้องการ

- Attack ปกติ: เร็ว อ่านง่าย ทำ combo ต่อได้
- Skill: ช้ากว่า มีพื้นที่และเอฟเฟกต์ชัดเจน
- Guard: ลดความเสียหายและสะสม Momentum
- Finisher: เอฟเฟกต์ใหญ่ ใช้ปิดฉากหรือพลิกเกม

## Progression

เลเวล 1–10 ใช้ EXP จากการต่อสู้ โดยแสดง:

- EXP ปัจจุบัน/EXP ถัดไป
- ค่าสถานะก่อนและหลังเลเวลอัป
- unlock ที่เลเวลถัดไป

ตัวอย่าง unlock:

| Level | Unlock |
|---:|---|
| 2 | Skill slot 2 |
| 3 | ด่าน Moonlit Ruins |
| 4 | อาวุธระดับ Rare |
| 5 | Finisher |
| 6 | ด่าน Mushroom Marsh |
| 8 | Outfit ชุด Guardian |
| 10 | ด่าน Sun Temple |

## ตัวละครและการแต่งตัว

- Appearance: Ember, Ocean, Moon
- Outfit: Traveler, Guardian, Rogue
- V2 ควรแสดงผลทันทีใน Hub และ Battle
- การปรับแต่งเป็น cosmetic ก่อน ไม่ทำให้ผู้เล่นเสียสมดุล

## ด่านและมอนสเตอร์

แต่ละด่านต้องมี mood, mechanic และศัตรูเฉพาะ ไม่ใช่แค่เปลี่ยนสีฉาก:

- Slime Fields: สอนพื้นฐานและ combo
- Goblin Camp: ศัตรูเร็วและโจมตีต่อเนื่อง
- King Slime Lair: boss และช่วง burst damage
- Moonlit Ruins: Wraith ใช้ Freeze/Teleport
- Mushroom Marsh: Spore Beast ใช้ Poison/พื้นที่พิษ
- Sun Temple: Solar Colossus ใช้ charge attack และ phase เปลี่ยน

## UX หลัก

- `/play` ต้องเปิดหน้า Guest Start โดยไม่บังคับ login
- มีปุ่ม `เริ่มเล่นทันที`
- มี Tutorial battle สั้น 1 ด่าน
- มีปุ่ม `เล่นต่อ` และ `เริ่มใหม่`
- Login/Account เป็นระบบเสริมภายหลัง ไม่ขวางการเล่น

## นิยามความสำเร็จของ V2

- ผู้เล่นใหม่เริ่มต่อสู้ได้ภายใน 15 วินาที
- รู้ความแตกต่างของ Attack, Skill, Guard ภายใน 1 battle
- ทุกชัยชนะมี feedback: XP, drop, level progress หรือ unlock
- ทุกด่านมี visual identity ต่างกันชัดเจน
- ไม่ต้องใช้ blockchain หรือ account เพื่อเล่น core loop
