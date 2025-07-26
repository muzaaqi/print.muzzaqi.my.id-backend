import express from 'express';
import {
  getTransactions,
  createTransaction,
  updateStatusTransaction,
} from '../controllers/TransactionController.js';

const router = express.Router();

router.get('/', getTransactions);
router.post('/', createTransaction);
router.patch('/:id/', updateStatusTransaction);

export default router;  