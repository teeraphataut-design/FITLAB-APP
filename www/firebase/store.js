// Authentication must initialize the Firebase app before Firestore is loaded.
window.fitlabStore = (async () => {
  const authService = await window.fitlabFirebase;
  if (!authService) return null;
  const base = 'https://www.gstatic.com/firebasejs/12.6.0/';
  const [{ getApp }, sdk] = await Promise.all([
    import(base + 'firebase-app.js'),
    import(base + 'firebase-firestore.js'),
  ]);
  const db = sdk.getFirestore(getApp());
  const sessionId = (c, date) => date + '_' + c.id;
  const bookingRef = (uid, id) => sdk.doc(db, 'users', uid, 'bookings', id);
  const notificationData = (payload) => ({
    targetUid: payload.targetUid || '',
    audience: payload.audience || 'user',
    ...(payload.sessionId ? { sessionId: payload.sessionId } : {}),
    title: payload.title || 'การแจ้งเตือน',
    message: payload.message || '',
    type: payload.type || 'info',
    machineName: payload.machineName || '',
    matchedBooking: Boolean(payload.matchedBooking),
    read: false,
    createdAt: sdk.serverTimestamp(),
  });
  // Cancel a learner booking and return its seat in the same transaction.
  function writeCancellation(tx, uid, id, b, s) {
    if (!s.exists() || s.data().bookedCount < 1)
      throw Error('ข้อมูลจำนวนที่นั่งไม่ถูกต้อง กรุณาลองใหม่');
    const foreign = uid !== authService.user?.uid;
    tx.update(sdk.doc(db, 'sessions', id), {
      bookedCount: s.data().bookedCount - 1,
      updatedAt: sdk.serverTimestamp(),
      ...(foreign ? { releasedUid: uid } : {}),
    });
    tx.update(bookingRef(uid, id), { cancelled: true, updatedAt: sdk.serverTimestamp() });
    tx.set(sdk.doc(db, 'classRosters', id, 'members', uid), {
      uid,
      sessionId: id,
      classId: b.data().classId,
      date: b.data().date,
      username: 'สมาชิก',
      cancelled: true,
      updatedAt: sdk.serverTimestamp(),
    });
    return { ...b.data(), id, cancelled: true };
  }
  return {
    async saveProfile(uid, profile) {
      await sdk.setDoc(
        sdk.doc(db, 'users', uid),
        { ...profile, updatedAt: sdk.serverTimestamp() },
        { merge: true },
      );
    },
    watch(uid, onChange, onError) {
      let bookings = null,
        sessions = null,
        role = 'member',
        roleReady = false,
        roleError = false,
        profile = null,
        profileStatus = 'loading';
      const emit = () => {
        if (bookings && sessions)
          onChange({
            bookings,
            sessions,
            role,
            roleReady,
            roleError,
            profile,
            profileStatus,
          });
      };
      const stopBookings = sdk.onSnapshot(
        sdk.collection(db, 'users', uid, 'bookings'),
        (snapshot) => {
          bookings = snapshot.docs.map((d) => ({ ...d.data(), id: d.id }));
          emit();
        },
        onError,
      );
      const stopSessions = sdk.onSnapshot(
        sdk.collection(db, 'sessions'),
        (snapshot) => {
          sessions = Object.fromEntries(snapshot.docs.map((d) => [d.id, d.data()]));
          emit();
        },
        onError,
      );
      const stopRole = sdk.onSnapshot(
        sdk.doc(db, 'roles', uid),
        (snapshot) => {
          const value = snapshot.exists() ? snapshot.data().role : 'member';
          role = ['member', 'trainer', 'admin'].includes(value) ? value : 'member';
          roleReady = true;
          roleError = false;
          emit();
        },
        () => {
          role = 'member';
          roleReady = false;
          roleError = true;
          emit();
        },
      );
      // Subscribe only to the signed-in member's private profile.
      const stopProfile = sdk.onSnapshot(
        sdk.doc(db, 'users', uid),
        (snapshot) => {
          const data = snapshot.exists() ? snapshot.data() : {};
          profile = {
            thaiName: data.thaiName || '',
            lastName: data.lastName || '',
            phone: data.phone || '',
            rfidUid: data.rfidUid || '',
          };
          profileStatus = 'ready';
          emit();
        },
        () => {
          profile = null;
          profileStatus = 'error';
          emit();
        },
      );
      return () => {
        stopProfile();
        stopRole();
        stopBookings();
        stopSessions();
      };
    },
    // Admin reads member profiles and role assignments; personal bookings stay private.
    watchMembers(onChange, onError) {
      let members = null,
        roles = null;
      const emit = () => {
        if (members && roles)
          onChange(
            members.map((member) => ({ ...member, role: roles[member.uid] || 'member' })),
          );
      };
      const stops = [
        sdk.onSnapshot(
          sdk.collection(db, 'users'),
          (snapshot) => {
            members = snapshot.docs.map((d) => ({ ...d.data(), uid: d.id }));
            emit();
          },
          onError,
        ),
        sdk.onSnapshot(
          sdk.collection(db, 'roles'),
          (snapshot) => {
            roles = Object.fromEntries(snapshot.docs.map((d) => [d.id, d.data().role]));
            emit();
          },
          onError,
        ),
      ];
      return () => stops.forEach((stop) => stop());
    },
    async setRole(uid, role) {
      const actor = authService.user;
      if (!actor || uid === actor.uid)
        throw Error('ไม่สามารถเปลี่ยนสิทธิ์ของบัญชีตัวเองได้');
      if (!['member', 'trainer', 'admin'].includes(role))
        throw Error('ประเภทสิทธิ์ไม่ถูกต้อง');
      await sdk.setDoc(sdk.doc(db, 'roles', uid), {
        role,
        updatedBy: actor.uid,
        updatedAt: sdk.serverTimestamp(),
      });
      if (role !== 'member') {
        try {
          const rows = await sdk.getDocs(sdk.collection(db, 'users', uid, 'bookings'));
          for (const row of rows.docs)
            if (!row.data().cancelled)
              await this.cancel(uid, { ...row.data(), id: row.id });
        } catch {
          throw Error(
            'เปลี่ยนสิทธิ์แล้ว แต่คืนที่นั่งเดิมไม่ครบ กรุณากดบันทึกสิทธิ์นี้อีกครั้ง',
          );
        }
      }
    },
    watchAssignments(uid, isAdmin, onChange, onError) {
      const all = sdk.collection(db, 'assignments');
      const source = isAdmin ? all : sdk.query(all, sdk.where('trainerUid', '==', uid));
      return sdk.onSnapshot(
        source,
        (s) => onChange(s.docs.map((d) => ({ ...d.data(), id: d.id }))),
        onError,
      );
    },

    async assignTrainer(c, date, trainer) {
      const actor = authService.user;
      if (!actor) throw Error('กรุณาเข้าสู่ระบบ');
      const startsAt = sdk.Timestamp.fromDate(
        new Date(date + 'T' + c.time + ':00+07:00'),
      );
      if (startsAt.toMillis() <= Date.now())
        throw Error('มอบหมายได้เฉพาะคลาสที่ยังไม่เริ่ม');
      const id = sessionId(c, date);
      await sdk.runTransaction(db, async (tx) => {
        const [booking, session, role, round] = await Promise.all([
          tx.get(bookingRef(trainer.uid, id)),
          tx.get(sdk.doc(db, 'sessions', id)),
          tx.get(sdk.doc(db, 'roles', trainer.uid)),
          tx.get(sdk.doc(db, 'classSchedules', id)),
        ]);
        if (!role.exists() || role.data().role !== 'trainer')
          throw Error('บัญชีนี้ไม่ได้เป็น Trainer แล้ว');
        if (!round.exists()) throw Error('กรุณาสร้างรอบเรียนก่อนมอบหมายผู้สอน');
        // Assigning an instructor never adds a learner seat. Release a legacy booking if present.
        if (booking.exists() && !booking.data().cancelled)
          writeCancellation(tx, trainer.uid, id, booking, session);
        tx.update(sdk.doc(db, 'classSchedules', id), {
          trainerUid: trainer.uid,
          trainerName: trainer.username,
          updatedBy: actor.uid,
          updatedAt: sdk.serverTimestamp(),
        });
        tx.set(sdk.doc(db, 'assignments', id), {
          classId: c.id,
          date,
          startsAt: round.data().startsAt,
          capacity: round.data().capacity,
          trainerUid: trainer.uid,
          trainerName: trainer.username,
          updatedBy: actor.uid,
          updatedAt: sdk.serverTimestamp(),
        });
      });
    },
    watchRoster(id, onChange, onError) {
      return sdk.onSnapshot(
        sdk.collection(db, 'classRosters', id, 'members'),
        (s) => onChange(s.docs.map((d) => ({ ...d.data(), uid: d.id }))),
        onError,
      );
    },
    async syncRoster(uid, bookings) {
      // Backfill only this member's own existing bookings; no counter changes.
      for (const booking of bookings) {
        const id = booking.sessionId || booking.date + '_' + booking.classId;
        await sdk.setDoc(sdk.doc(db, 'classRosters', id, 'members', uid), {
          uid,
          sessionId: id,
          classId: booking.classId,
          date: booking.date,
          username: authService.user?.displayName || 'สมาชิก',
          cancelled: booking.cancelled,
          updatedAt: sdk.serverTimestamp(),
        });
      }
    },
    async saveSchedule(fields, onlyIfMissing = false) {
      const id = fields.date + '_' + fields.classId;
      const ref = sdk.doc(db, 'classSchedules', id),
        sref = sdk.doc(db, 'sessions', id),
        aref = sdk.doc(db, 'assignments', id);
      const startsAt = sdk.Timestamp.fromDate(
        new Date(fields.date + 'T' + fields.time + ':00+07:00'),
      );
      const endsAt = sdk.Timestamp.fromDate(
        new Date(fields.date + 'T' + fields.end + ':00+07:00'),
      );
      if (startsAt.toMillis() <= Date.now() || endsAt.toMillis() <= startsAt.toMillis())
        throw Error('กรุณากำหนดรอบในอนาคต และเวลาจบหลังเวลาเริ่ม');
      if (
        !Number.isInteger(fields.capacity) ||
        fields.capacity < 1 ||
        fields.capacity > 200
      )
        throw Error('ความจุต้องเป็นจำนวนเต็ม 1–200 คน');
      await sdk.runTransaction(db, async (tx) => {
        const [round, session, assignment, catalog] = await Promise.all([
          tx.get(ref),
          tx.get(sref),
          tx.get(aref),
          tx.get(sdk.doc(db, 'classCatalog', fields.classId)),
        ]);
        if (onlyIfMissing && round.exists()) return;
        if (!catalog.exists()) throw Error('ไม่พบข้อมูลคลาส กรุณาสร้างคลาสก่อน');
        const count = session.exists() ? session.data().bookedCount : 0;
        const previousRound = round.data();
        if (previousRound?.status === 'cancelled' &&
          (count !== 0 || previousRound.updatedAt.toMillis() >= previousRound.startsAt.toMillis())) {
          throw Error('สร้างรอบเดิมซ้ำไม่ได้ เพราะยังมีรายการจองหรือรอบถูกยกเลิกหลังเริ่มเรียน');
        }
        if (fields.capacity < count)
          throw Error('จำนวนที่นั่งต้องไม่น้อยกว่าผู้จอง ' + count + ' คน');
        if (count > 0 && session.data().startsAt.toMillis() !== startsAt.toMillis())
          throw Error('มีผู้จองแล้ว จึงเปลี่ยนเวลาเริ่มไม่ได้');
        if (
          count > 0 &&
          round.exists() &&
          (round.data().endsAt.toMillis() !== endsAt.toMillis() ||
            round.data().location !== fields.location)
        )
          throw Error('มีผู้จองแล้ว จึงเปลี่ยนเวลาจบหรือสถานที่ไม่ได้');
        tx.set(ref, {
          ...(round.exists() && round.data().trainerName
            ? { trainerName: round.data().trainerName }
            : {}),
          ...(assignment.exists() ? { trainerUid: assignment.data().trainerUid } : {}),
          classId: fields.classId,
          date: fields.date,
          startsAt,
          endsAt,
          capacity: fields.capacity,
          location: fields.location,
          status: fields.status,
          updatedBy: authService.user.uid,
          updatedAt: sdk.serverTimestamp(),
        });
        tx.set(sref, {
          ...(session.exists() ? session.data() : {}),
          classId: fields.classId,
          date: fields.date,
          startsAt,
          capacity: fields.capacity,
          bookedCount: count,
          updatedAt: sdk.serverTimestamp(),
        });
        if (assignment.exists())
          tx.update(aref, {
            startsAt,
            capacity: fields.capacity,
            updatedBy: authService.user.uid,
            updatedAt: sdk.serverTimestamp(),
          });
      });
    },

    watchCatalog(onChange, onError) {
      let catalog = null,
        schedules = null;
      const emit = () => {
        if (catalog && schedules) onChange({ catalog, schedules });
      };
      const stops = [
        sdk.onSnapshot(
          sdk.collection(db, 'classCatalog'),
          (s) => {
            catalog = s.docs.map((d) => ({ ...d.data(), id: d.id }));
            emit();
          },
          onError,
        ),
        sdk.onSnapshot(
          sdk.collection(db, 'classSchedules'),
          (s) => {
            schedules = Object.fromEntries(s.docs.map((d) => [d.id, d.data()]));
            emit();
          },
          onError,
        ),
      ];
      return () => stops.forEach((stop) => stop());
    },
    async saveClass(id, fields, onlyIfMissing = false) {
      const ref = sdk.doc(db, 'classCatalog', id);
      await sdk.runTransaction(db, async (tx) => {
        const current = await tx.get(ref);
        if (onlyIfMissing && current.exists()) return;
        if (current.data()?.archived) throw Error('คลาสนี้ถูกลบแล้ว');
        tx.set(ref, {
          ...fields,
          updatedAt: sdk.serverTimestamp(),
        });
      });
    },
    async restoreArchivedClass(id) {
      await sdk.updateDoc(sdk.doc(db, 'classCatalog', id), {
        active: true,
        archived: sdk.deleteField(),
        updatedAt: sdk.serverTimestamp(),
      });
    },
    async cancelSchedule(id, { title, message }) {
      const actor = authService.user;
      if (!actor) throw Error('กรุณาเข้าสู่ระบบ');
      const roundRef = sdk.doc(db, 'classSchedules', id);
      const assignmentRef = sdk.doc(db, 'assignments', id);
      const sessionRef = sdk.doc(db, 'sessions', id);
      const rosterRef = sdk.collection(db, 'classRosters', id, 'members');
      const notifications = sdk.collection(db, 'notifications');

      return sdk.runTransaction(db, async (tx) => {
        const [round, assignment] = await Promise.all([
          tx.get(roundRef),
          tx.get(assignmentRef),
          tx.get(sessionRef),
        ]);
        if (!round.exists() || round.data().status === 'cancelled')
          throw Error('รอบเรียนนี้ถูกยกเลิกแล้วหรือไม่มีอยู่');

        // Booking changes also update the session, forcing a retry if the roster changes.
        const roster = await sdk.getDocsFromServer(rosterRef);
        const recipients = new Map(
          roster.docs.filter((doc) => doc.data().cancelled === false).map((doc) => [doc.id, 'member']),
        );
        const trainerUid = assignment.data()?.trainerUid || round.data().trainerUid;
        if (trainerUid) recipients.set(trainerUid, 'trainer');

        tx.update(roundRef, {
          status: 'cancelled',
          updatedBy: actor.uid,
          updatedAt: sdk.serverTimestamp(),
        });
        for (const [targetUid, audience] of recipients) {
          tx.set(sdk.doc(notifications), notificationData({
            targetUid, audience, sessionId: id, type: 'round_cancelled', title, message,
          }));
        }
        return recipients.size;
      });
    },
    async book(uid, c, date) {
      const id = sessionId(c, date),
        sref = sdk.doc(db, 'sessions', id),
        bref = bookingRef(uid, id);
      return sdk.runTransaction(db, async (tx) => {
        const [session, booking, role, round, catalog] = await Promise.all([
          tx.get(sref),
          tx.get(bref),
          tx.get(sdk.doc(db, 'roles', uid)),
          tx.get(sdk.doc(db, 'classSchedules', id)),
          tx.get(sdk.doc(db, 'classCatalog', c.id)),
        ]);
        if (role.exists() && role.data().role !== 'member')
          throw Error(
            'เฉพาะ Member เท่านั้นที่จองเข้าเรียนได้ Trainer และ Admin ไม่ใช้ที่นั่งผู้เรียน',
          );
        if (
          !round.exists() ||
          round.data().status !== 'open' ||
          !catalog.exists() ||
          !catalog.data().active
        )
          throw Error('คลาสนี้ยังไม่เปิดรับจอง');
        const startsAt = round.data().startsAt;
        if (startsAt.toMillis() <= Date.now())
          throw Error('คลาสนี้เริ่มแล้ว ไม่สามารถจองได้');
        if (booking.exists() && !booking.data().cancelled)
          throw Error('คุณจองคลาสนี้แล้ว');
        const count = session.exists() ? session.data().bookedCount : 0;
        const capacity = session.exists() ? session.data().capacity : c.capacity;
        if (count >= capacity) throw Error('คลาสเต็มแล้ว กรุณาเลือกคลาสอื่น');
        if (session.exists())
          tx.update(sref, { bookedCount: count + 1, updatedAt: sdk.serverTimestamp() });
        else
          tx.set(sref, {
            classId: c.id,
            date,
            startsAt,
            capacity: c.capacity,
            bookedCount: 1,
            updatedAt: sdk.serverTimestamp(),
          });
        const row = {
          classId: c.id,
          date,
          sessionId: id,
          cancelled: false,
          createdAt: booking.exists() ? booking.data().createdAt : sdk.serverTimestamp(),
          updatedAt: sdk.serverTimestamp(),
        };
        tx.set(bref, row);
        tx.set(sdk.doc(db, 'classRosters', id, 'members', uid), {
          uid,
          sessionId: id,
          classId: c.id,
          date,
          username: authService.user?.displayName || 'สมาชิก',
          cancelled: false,
          updatedAt: sdk.serverTimestamp(),
        });
        return { id, ...row };
      });
    },
    async cancel(uid, booking, { requireActiveRound = false } = {}) {
      const sref = sdk.doc(db, 'sessions', booking.sessionId),
        bref = bookingRef(uid, booking.id);
      return sdk.runTransaction(db, async (tx) => {
        const [b, s, round] = await Promise.all([
          tx.get(bref),
          tx.get(sref),
          requireActiveRound ? tx.get(sdk.doc(db, 'classSchedules', booking.sessionId)) : null,
        ]);
        if (round?.data()?.status === 'cancelled') throw Error('ผู้ดูแลยกเลิกรอบเรียนนี้แล้ว');
        const startsAt = round?.data()?.startsAt || s.data()?.startsAt;
        if (requireActiveRound && startsAt?.toMillis() <= Date.now())
          throw Error('ยกเลิกการจองได้เฉพาะก่อนเริ่มคลาส');
        if (!b.exists()) throw Error('ไม่พบรายการจองนี้');
        if (b.data().cancelled) return { ...b.data(), id: b.id };
        return writeCancellation(tx, uid, booking.sessionId, b, s);
      });
    },

    // ดักฟังค่าบัตรล่าสุดที่ ESP32-S3 ยิงเข้ามาแบบ Real-time
    watchLatestRfid(onScan, onError, { serverOnly = false } = {}) {
      return sdk.onSnapshot(
        sdk.doc(db, 'rfidReader', 'register_station'),
        { includeMetadataChanges: serverOnly },
        (snap) => {
          if (serverOnly && snap.metadata.fromCache) return;
          if (snap.exists() || serverOnly) onScan(snap.data());
        },
        onError,
      );
    },
    // ค้นหาสมาชิกจาก Gmail
    async findMemberByEmail(email) {
      const cleanEmail = email.trim().toLowerCase();
      if (!cleanEmail) throw Error('กรุณากรอกอีเมลของสมาชิก');
      const q = sdk.query(
        sdk.collection(db, 'users'),
        sdk.where('email', '==', cleanEmail),
      );
      const snap = await sdk.getDocs(q);
      if (snap.empty) return null;
      return { uid: snap.docs[0].id, ...snap.docs[0].data() };
    },
    // ผูกเลขบัตร RFID เข้ากับ UID ของลูกค้า (บันทึกทั้งใน users และ rfidCards)
    async assignRfidCard(targetUid, rfidUid) {
      const cleanRfid = rfidUid.trim().toUpperCase();
      if (!cleanRfid) throw Error('ไม่พบรหัสบัตร RFID');

      const userRef = sdk.doc(db, 'users', targetUid);
      const cardRef = sdk.doc(db, 'rfidCards', cleanRfid);

      await sdk.runTransaction(db, async (tx) => {
        const [userSnap, cardSnap] = await Promise.all([
          tx.get(userRef),
          tx.get(cardRef),
        ]);
        if (!userSnap.exists()) throw Error('ไม่พบข้อมูลสมาชิกในระบบ');
        if (cardSnap.exists() && cardSnap.data().uid !== targetUid) {
          throw Error('บัตร RFID ใบนี้ถูกผูกกับสมาชิกท่านอื่นแล้ว');
        }

        const userData = userSnap.data();
        const now = sdk.serverTimestamp();

        tx.update(userRef, {
          rfidUid: cleanRfid,
          updatedAt: now,
        });

        tx.set(cardRef, {
          uid: targetUid,
          username: userData.username || '',
          email: userData.email || '',
          rfidUid: cleanRfid,
          updatedAt: now,
        });
      });
    },
    // ลบบัตร RFID ออกจากบัญชีสมาชิกและตารางจับคู่
    // ลบบัตร RFID ออกจากบัญชีสมาชิกและตารางจับคู่
    // ลบบัตร RFID ออกจากบัญชีสมาชิกและตารางจับคู่
    async removeRfidCard(targetUid, rfidUid) {
      const cleanRfid = String(rfidUid || '').trim().toUpperCase();
      const userRef = sdk.doc(db, 'users', targetUid);

      await sdk.runTransaction(db, async (tx) => {
        const userSnap = await tx.get(userRef);
        if (!userSnap.exists()) throw Error('ไม่พบข้อมูลสมาชิกในระบบ');

        tx.update(userRef, {
          rfidUid: sdk.deleteField(),
          updatedAt: sdk.serverTimestamp(),
        });

        if (cleanRfid) {
          tx.delete(sdk.doc(db, 'rfidCards', cleanRfid));
        }
      });
    },

    // ดึงประวัติการแจ้งเตือนแบบ Real-time แยกตามสิทธิ์ของผู้ใช้
    // ดึงประวัติการแจ้งเตือนแยกตาม Role ชัดเจน
    watchNotifications(uid, isAdminRole, onChange, onError) {
      const col = sdk.collection(db, 'notifications');
      let personalRows = [];
      let adminRows = [];

      const emit = () => {
        const merged = new Map();
        for (const item of [...personalRows, ...adminRows]) {
          merged.set(item.id, item);
        }
        const sorted = [...merged.values()].sort((a, b) => {
          const ta = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
          const tb = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
          return tb - ta;
        });
        onChange(sorted);
      };

      const stops = [
        sdk.onSnapshot(
          sdk.query(col, sdk.where('targetUid', '==', uid)),
          (snap) => {
            personalRows = snap.docs.map((d) => ({ ...d.data(), id: d.id }));
            emit();
          },
          onError,
        ),
      ];

      if (isAdminRole) {
        stops.push(
          sdk.onSnapshot(
            sdk.query(col, sdk.where('audience', '==', 'admin')),
            (snap) => {
              adminRows = snap.docs.map((d) => ({ ...d.data(), id: d.id }));
              emit();
            },
            onError,
          ),
        );
      }

      return () => stops.forEach((stop) => stop());
    },

    // Trainer และ Admin ลบสมาชิกออกจากคลาสที่จอง (คืนที่นั่งว่างอัตโนมัติ)
    async removeMemberFromSession(sessionId, memberUid) {
      const rosterRef = sdk.doc(db, 'classRosters', sessionId, 'members', memberUid);
      const sessionRef = sdk.doc(db, 'sessions', sessionId);

      await sdk.runTransaction(db, async (tx) => {
        const [roster, session] = await Promise.all([tx.get(rosterRef), tx.get(sessionRef)]);
        if (!roster.exists() || roster.data().cancelled)
          throw Error('สมาชิกคนนี้ไม่ได้จองคลาสนี้แล้ว');
        if (!session.exists() || session.data().bookedCount < 1)
          throw Error('ข้อมูลจำนวนที่นั่งไม่ถูกต้อง กรุณาลองใหม่');

        const updatedAt = sdk.serverTimestamp();
        const cancellation = { cancelled: true, updatedAt };
        tx.update(bookingRef(memberUid, sessionId), cancellation);
        tx.update(rosterRef, cancellation);
        tx.update(sessionRef, {
          bookedCount: session.data().bookedCount - 1,
          releasedUid: memberUid,
          updatedAt,
        });
      });
    },

    // บันทึกประวัติการแจ้งเตือนใหม่
    async addNotification(payload) {
      const ref = sdk.doc(sdk.collection(db, 'notifications'));
      await sdk.setDoc(ref, notificationData(payload));
    },

    // อัปเดตสถานะว่าอ่านแจ้งเตือนแล้ว
    async markNotificationsRead(items) {
      const unread = (items || []).filter((n) => !n.read && n.id);
      if (!unread.length) return;
      await Promise.all(
        unread.map((n) =>
          sdk.updateDoc(sdk.doc(db, 'notifications', n.id), { read: true }).catch(() => {}),
        ),
      );
    },
    // บันทึกการ Check-in เข้าคลาส (รองรับทั้ง Member และ Trainer)
    async recordClassCheckin(payload) {
      const docId = `${payload.sessionId}_${payload.uid}`;
      const ref = sdk.doc(db, 'checkins', docId);
      const method = payload.method || 'rfid';
      return sdk.runTransaction(db, async (tx) => {
        const existing = await tx.get(ref);
        if (existing.exists()) return { alreadyCheckedIn: true, checkedInAt: existing.data().checkedInAt };
        tx.set(ref, {
          sessionId: payload.sessionId,
          classId: payload.classId,
          date: payload.date,
          uid: payload.uid,
          username: payload.username || 'สมาชิก',
          role: payload.role || 'member',
          rfidUid: payload.rfidUid || '',
          method,
          recordedBy: authService.user.uid,
          ...(method === 'manual' ? { reason: payload.reason } : {}),
          status: 'checked_in',
          checkedInAt: sdk.serverTimestamp(),
        });
        return { alreadyCheckedIn: false };
      });
    },

    // ดึงรายชื่อผู้ที่ Check-in เข้าคลาสแล้วแบบ Real-time
    watchSessionCheckins(sessionId, onChange, onError) {
      const q = sdk.query(
        sdk.collection(db, 'checkins'),
        sdk.where('sessionId', '==', sessionId),
      );
      return sdk.onSnapshot(
        q,
        (snap) => onChange(snap.docs.map((d) => ({ ...d.data(), id: d.id }))),
        onError,
      );
    },
    // ค้นหาเจ้าของบัตร RFID จากเลขบัตร
    async findUserByRfid(cardUid) {
      const clean = String(cardUid || '').trim().toUpperCase();
      if (!clean) return null;
      const snap = await sdk.getDoc(sdk.doc(db, 'rfidCards', clean));
      return snap.exists() ? snap.data() : null;
    },

    // ดึงรายการจองคลาสทั้งหมดของสมาชิกตาม uid (ใช้ตอนแตะบัตร RFID ตรวจสอบ)
    async getUserBookings(targetUid) {
      const snap = await sdk.getDocs(sdk.collection(db, 'users', targetUid, 'bookings'));
      return snap.docs.map((d) => ({ ...d.data(), id: d.id }));
    },
  };
})();
window.fitlabStore.catch(() => {});