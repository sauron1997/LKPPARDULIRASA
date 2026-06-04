import { Router } from 'express';
import authRouter, { authSessionRouter } from '../modules/auth/auth.routes.js';
import publicRouter from '../modules/public/public.routes.js';
import registrationsRouter from '../modules/registrations/registrations.routes.js';
import studentRouter from '../modules/student/student.routes.js';
import adminRouter from '../modules/admin/admin.routes.js';
import coursesRouter from '../modules/courses/courses.routes.js';
import assessmentsRouter from '../modules/assessments/assessments.routes.js';
import messagesRouter from '../modules/messages/messages.routes.js';
import contentRouter from '../modules/content/content.routes.js';
import mediaRouter from '../modules/media/media.routes.js';
import exportsRouter from '../modules/exports/exports.routes.js';
import classroomRouter from '../modules/classroom/classroom.routes.js';
import paymentsRouter, { adminRouter as adminPaymentsRouter } from '../modules/payments/payments.routes.js';
import paymentSettingsRouter, { adminRouter as adminPaymentSettingsRouter } from '../modules/paymentSettings/paymentSettings.routes.js';

const router = Router();

router.use('/v1/auth', authRouter);
router.use('/v1', authSessionRouter);
router.use('/v1/public', publicRouter);
router.use('/v1/registrations', registrationsRouter);
router.use('/v1/student', studentRouter);
router.use('/v1/admin', adminRouter);
router.use('/v1/admin/courses', coursesRouter);
router.use('/v1', assessmentsRouter);
router.use('/v1', messagesRouter);
router.use('/v1/admin/content', contentRouter);
router.use('/v1/media', mediaRouter);
router.use('/v1/admin/media', mediaRouter);
router.use('/v1/admin/classroom', classroomRouter);
router.use('/v1/admin/exports', exportsRouter);
router.use('/v1/payments', paymentsRouter);
router.use('/v1/admin/payments', adminPaymentsRouter);
router.use('/v1/payment-settings', paymentSettingsRouter);
router.use('/v1/admin/payment-settings', adminPaymentSettingsRouter);

export default router;
