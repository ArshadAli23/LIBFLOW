/**
 * LIBFLOW — Members Routing (Patron Profiles & Staff Oversight)
 * 
 * Endpoints for institutional patron lifecycle management and self-service inspection.
 */

import { Router } from 'express';
import { MemberController } from '../controllers/member.controller.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import {
  validateMemberQueryParams,
  validateCreateMember,
  validateUpdateMember,
} from '../middleware/memberValidation.js';

export const memberRouter = Router();

// All member endpoints require authentication
memberRouter.use(authenticate);

// 1. Staff directory listing & search (ADMIN, LIBRARIAN only)
memberRouter.get('/', requireRole('ADMIN', 'LIBRARIAN'), validateMemberQueryParams, MemberController.listMembers);

// 2. Patron self-profile retrieval (Must precede :id route)
memberRouter.get('/me', MemberController.getOwnProfile);

// 3. Single member profile retrieval (Staff or self-owner)
memberRouter.get('/:id', MemberController.getMemberById);

// 4. Register new member (Staff only: ADMIN, LIBRARIAN)
memberRouter.post('/', requireRole('ADMIN', 'LIBRARIAN'), validateCreateMember, MemberController.createMember);

// 5. Update member profile (Staff full edit, Patron contact only)
memberRouter.patch('/:id', validateUpdateMember, MemberController.updateMember);
