import { Router } from 'express';
import { SearchController } from './search.controller.js';
import { optionalAuthenticate } from '../../middleware/auth.js';

const router = Router();

/**
 * Global Search endpoint — PRD §53
 * Supports both unauthenticated public discovery and authenticated role-scoped searches.
 */
router.get('/', optionalAuthenticate, SearchController.search);

export const searchRouter = router;
