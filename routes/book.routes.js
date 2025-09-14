import { Router } from 'express';
const router = Router();
import { createBook, getAllBooks, getBookById, updateBook, deleteBook, bulkImportBooks } from '../controllers/book.controller.js';
import uploadMiddleware from '../middleware/upload.middleware.js';

// Chained route for getting all books and creating a new book
router.route('/')
  .get(getAllBooks)
  .post(createBook);

// Bulk import route
router.route('/import')
  .post(uploadMiddleware, bulkImportBooks);

// Chained routes for operations on a single book by its ID
router.route('/:id')
  .get(getBookById)
  .put(updateBook)
  .delete(deleteBook);

export default router;