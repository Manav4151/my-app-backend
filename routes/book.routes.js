import { Router } from 'express';
const router = Router();
// import { createBook, getAllBooks, getBookById, updateBook, deleteBook, bulkImportBooks } from '../controllers/book.controller.js';
import uploadMiddleware from '../middleware/upload.middleware.js';
import { checkBookStatus, createOrUpdateBook, deleteBook, deleteBookPricing, deleteMultipleBooks, getBookPricing, getBooks } from '../controllers/book.controller.js';

// Chained route for getting all books and creating a new book
// Route for checking if a book exists and what action to take
router.post('/check', checkBookStatus);

// Route for creating/updating a book or its pricing
router.post('/', createOrUpdateBook);

// Bulk import route
// router.route('/import')
//   .post(uploadMiddleware, bulkImportBooks);

// // Chained routes for operations on a single book by its ID
// router.route('/:id')
//   .get(getBookById)
//   .put(updateBook)
//   .delete(deleteBook);

router.get('/', getBooks); // GET /api/books
router.get('/:bookId/pricing', getBookPricing);

// Delete routes
// router.delete('/:bookId', deleteBook); // DELETE /api/books/some_id (deletes book and all its pricing)
router.delete('/pricing/:pricingId', deleteBookPricing); // DELETE /api/books/pricing/some_pricing_id (deletes specific pricing)
router.delete('/bulk', deleteMultipleBooks); // DELETE /api/books/bulk (deletes multiple books and their pricing)
export default router;