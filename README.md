# FitLab — เริ่มอ่านตรงนี้

ไฟล์ที่แก้หน้าตาเว็บมีแค่ 3 ไฟล์:

- index.html — โครงหน้าเว็บและไฟล์ที่โหลด
- style.css — สี ฟอนต์ ระยะห่าง และรูปแบบหน้าจอ
- app.js — หน้าจอ ปุ่ม การจอง และการนำทาง

ไฟล์ระบบแยกไว้ใน firebase/:

- config.js — ค่าเชื่อม Firebase
- auth.js — สมัครสมาชิกและล็อกอิน
- store.js — อ่าน/บันทึกข้อมูล Firestore
- firestore.rules — กฎสิทธิ์บน Firebase Console

images/ เก็บเฉพาะรูปที่เว็บใช้งาน

เปิดเว็บ: คลิกขวา index.html แล้ว Open with Live Server
หรือรัน node serve.cjs แล้วเปิด http://localhost:5500/
## เปิดระบบสิทธิ์ Member / Trainer / Admin

1. Firebase Console > Firestore > Rules: วางเนื้อหาจาก firebase/firestore.rules แล้ว Publish
2. Firebase Console > Authentication > Users: คัดลอก UID ของบัญชีที่จะเป็น Admin คนแรก
3. Firestore > Data: สร้าง collection ชื่อ roles และ document ID เป็น UID นั้น
4. เพิ่ม field ชื่อ role ชนิด string ค่า admin แล้ว Save
5. รีเฟรชเว็บ เข้าบัญชีนั้น ไปโปรไฟล์ > จัดการสิทธิ์สมาชิก

บัญชีที่ไม่มีเอกสารใน roles เป็น Member โดยอัตโนมัติ ผู้ใช้แก้สิทธิ์ตัวเองไม่ได้
Admin กำหนดสิทธิ์ของบัญชีอื่นเป็น Member, Trainer หรือ Admin ได้ผ่านเว็บ
Trainer มีหน้าหลัก ตารางสอน และรายชื่อผู้จองแยกแล้ว Admin มอบหมายรอบคลาสให้ Trainer ได้ผ่านโปรไฟล์ > มอบหมายผู้ฝึกสอน
กฎใหม่ยังไม่ทำงานบน Firebase จนกว่าจะกด Publish ใน Console
หลังอัปเดตโค้ด Trainer ให้ Publish firebase/firestore.rules ล่าสุดอีกครั้ง การจองเก่าจะเติมรายชื่อเมื่อเจ้าของบัญชีเปิดเว็บอีกครั้ง ไม่มีการจำลองข้อมูล Check-in เป็นข้อมูลจริง

## จัดการคลาสและรอบเรียนจาก Firebase

1. Publish firebase/firestore.rules ล่าสุดใน Firebase Console
2. รีเฟรชบัญชี Admin ไปโปรไฟล์ > จัดการคลาสและรอบเรียน
3. กดนำเข้าตารางเดิม 14 วัน เพื่อเริ่มจากคลาสเดิมโดยไม่ล้างยอดจอง หรือเพิ่มคลาสและรอบเอง
4. มอบหมาย Trainer จากโปรไฟล์ > มอบหมายผู้ฝึกสอน

classCatalog เก็บข้อมูลคลาส; classSchedules เก็บวันที่ เวลา สถานที่ ความจุ และสถานะการรับจอง
sessions ยังคงเก็บยอดจองเดิม ส่วน assignments เก็บผู้ฝึกสอนที่รับผิดชอบ
เมื่อมีผู้จองแล้ว แก้ได้เฉพาะความจุและการรับจอง โดยความจุต้องไม่น้อยกว่ายอดจอง
เวลาหรือสถานที่ของรอบที่มีผู้จองจะเปลี่ยนไม่ได้ เพื่อไม่ให้การนัดหมายเดิมเปลี่ยนโดยไม่รู้ตัว
หนึ่งคลาสสร้างได้หนึ่งรอบต่อวัน คลาสที่พักไว้ยังเก็บข้อมูลสำหรับประวัติไว้
บัญชีจริงอ่านเฉพาะรอบเรียนใน Firestore ส่วนข้อมูลในโค้ดใช้สำหรับโหมดทดลองและประวัติเดิม
ทดสอบด้วย Firestore test double แล้ว การตรวจ Rules และการบันทึกฐานข้อมูลจริงต้องทำหลัง Publish
## ภาพประกอบ

ภาพใหม่จาก Pexels ใช้เป็นภาพประกอบคลาส ไม่ใช่ภาพผู้ฝึกสอนประจำ FitLab
- Strength: Viridiana Rivera — https://www.pexels.com/photo/a-woman-working-out-14604709/
- Yoga: Vlada Karpovich — https://www.pexels.com/photo/woman-standing-on-a-yoga-mat-doing-stretching-4534573/
- HIIT: Andres Ayrton — https://www.pexels.com/photo/a-woman-exercising-with-battle-ropes-in-gym-6551174/
- Pilates: Maria Charizani — https://www.pexels.com/photo/side-view-of-a-woman-in-activewear-doing-pilates-reformer-exercise-5473894/
- Welcome: Andrea Piacquadio — https://www.pexels.com/photo/group-of-women-doing-exercise-inside-the-building-3775566/
- License: https://www.pexels.com/license/