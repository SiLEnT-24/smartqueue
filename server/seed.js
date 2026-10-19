// Creates DEMO accounts/departments/counters. Run: npm run seed  (wipes users, departments, counters, tokens!)
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User'), Department = require('./models/Department'), Counter = require('./models/Counter');
const Token = require('./models/Token'), Feedback = require('./models/Feedback'), AuditLog = require('./models/AuditLog');
const DailySequence = require('./models/DailySequence');

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  await Promise.all([User, Department, Counter, Token, Feedback, AuditLog, DailySequence].map(m => m.deleteMany({})));
  await Promise.all([Token, Department, Counter, User].map(m => m.syncIndexes()));

  const depts = await Department.insertMany([
    { name: 'Examination Cell', code: 'EX', defaultServiceMinutes: 5, description: 'Exam forms, results, revaluation' },
    { name: 'Accounts Office', code: 'AC', defaultServiceMinutes: 6, description: 'Fees and receipts' },
    { name: 'Admission Office', code: 'AD', defaultServiceMinutes: 8, description: 'Admissions and certificates', priorityEnabled: true },
    { name: 'Library', code: 'LB', defaultServiceMinutes: 3, description: 'Books and membership' },
    { name: 'Student Help Desk', code: 'SH', defaultServiceMinutes: 4, description: 'General enquiries' },
  ]);
  const d = Object.fromEntries(depts.map(x => [x.code, x._id]));
  const hash = (p) => bcrypt.hash(p, 10);
  const users = await User.insertMany([
    { name: 'Admin User', email: 'admin@smartqueue.test', role: 'admin', passwordHash: await hash('Admin@123') },
    { name: 'Staff One', email: 'staff1@smartqueue.test', role: 'staff', passwordHash: await hash('Staff@123') },
    { name: 'Staff Two', email: 'staff2@smartqueue.test', role: 'staff', passwordHash: await hash('Staff@123') },
    { name: 'Demo Student', email: 'student@smartqueue.test', role: 'student', passwordHash: await hash('Student@123') },
    { name: 'Demo Student 2', email: 'student2@smartqueue.test', role: 'student', passwordHash: await hash('Student@123') },
  ]);
  await Counter.insertMany([
    { name: 'Counter 1', departments: [d.EX, d.AC], staff: users[1]._id },
    { name: 'Counter 2', departments: [d.AD, d.LB, d.SH], staff: users[2]._id },
    { name: 'Counter 3', departments: [d.EX, d.SH] },
  ]);
  console.log('Seed complete (demo data). Accounts:\n admin@smartqueue.test / Admin@123\n staff1@smartqueue.test / Staff@123\n staff2@smartqueue.test / Staff@123\n student@smartqueue.test / Student@123');
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
