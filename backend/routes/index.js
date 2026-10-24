const router = require('express').Router();
const { protect, requireRole } = require('../middleware/auth');
const auth = require('../controllers/auth.controller');
const tok = require('../controllers/token.controller');
const queue = require('../controllers/queue.controller');
const admin = require('../controllers/admin.controller');
const fb = require('../controllers/feedback.controller');
const an = require('../controllers/analytics.controller');
const chat = require('../controllers/chat.controller');
const A = requireRole('admin');

// auth
router.post('/auth/register', auth.register);
router.post('/auth/register-admin', auth.registerAdmin);
router.post('/auth/login', auth.login);
router.get('/auth/me', protect, auth.me);
router.patch('/auth/me', protect, auth.updateProfile);

// public (no login): landing page + reception display
router.get('/departments', admin.listPublicDepartments);
router.get('/queue/display', tok.display);
router.get('/queue/status/:departmentId', tok.departmentStatus);

// tokens
router.post('/tokens', protect, requireRole('user', 'admin'), tok.create);
router.get('/tokens/mine', protect, requireRole('user'), tok.mine);
router.get('/tokens', protect, A, tok.listAll);
router.get('/tokens/:id', protect, tok.getOne);
router.post('/tokens/:id/cancel', protect, tok.cancel);
router.patch('/tokens/:id/priority', protect, A, tok.setPriority);

// queue operations are administrator-only
router.get('/admin/queue', protect, A, queue.list);
router.post('/admin/queue/call-next', protect, A, queue.callNext);
router.post('/admin/queue/auto-call', protect, A, queue.autoCall);
router.post('/admin/queue/tokens/:id/:action', protect, A, queue.action);

// admin
router.get('/admin/users', protect, A, admin.listUsers);
router.post('/admin/users', protect, A, admin.createUser);
router.patch('/admin/users/:id', protect, A, admin.updateUser);
router.get('/admin/departments', protect, A, admin.listDepartments);
router.post('/admin/departments', protect, A, admin.createDepartment);
router.patch('/admin/departments/:id', protect, A, admin.updateDepartment);
router.get('/admin/counters', protect, A, admin.listCounters);
router.post('/admin/counters', protect, A, admin.createCounter);
router.patch('/admin/counters/:id', protect, A, admin.updateCounter);
router.get('/admin/audit-logs', protect, A, admin.auditLogs);

// feedback
router.post('/feedback', protect, requireRole('user'), fb.create);
router.get('/feedback/pending', protect, requireRole('user'), fb.pending);
router.get('/feedback', protect, A, fb.summary);

// assistant
router.post('/chat', protect, chat.send);

// analytics + reports
router.get('/analytics', protect, A, an.overview);
router.get('/analytics/summary', protect, A, an.summary);
router.get('/analytics/export', protect, A, an.exportCsv);

module.exports = router;
