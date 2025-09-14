import Book from '../models/book.schema.js';
import importExcel from '../utils/excelImport.js';
import path from 'path';

/**
 * @desc    Create a new book
 * @route   POST /api/books
 * @access  Public
 */
const createBook = async (req, res) => {
  try {
    // The book data is sent from the frontend in the request body
    const bookData = req.body;

    // Create a new book instance using the Mongoose model
    const newBook = new Book(bookData);

    // Save the new book to the database
    const savedBook = await newBook.save();

    // Send a success response back to the frontend with the saved book data
    res.status(201).json(savedBook);
  } catch (error) {
    // If there's an error (e.g., validation error from the schema)
    console.error('Error creating book:', error);
    // Send an error response
    res.status(400).json({ message: 'Error creating book', error: error.message });
  }
};

/**
 * @desc    Get all books with optional filtering and searching
 * @route   GET /api/books
 * @access  Public
 * @example
 * // Get all books
 * GET /api/books
 * // Find by title (case-insensitive, partial match)
 * GET /api/books?title=Lord of the
 * // Find by ISBN
 * GET /api/books?isbn=978-0
 * // Filter by author and year
 * GET /api/books?author=tolkien&year=1954
 * // Filter by category (classification)
 * GET /api/books?classification=Fantasy
 */
const getAllBooks = async (req, res) => {
  try {
    const { title, isbn, author, year, classification, page = 1, limit = 20 } = req.query;
    const filters = {};

    if (title) filters.title = { $regex: title, $options: 'i' };
    if (isbn) filters.isbn = { $regex: isbn, $options: 'i' };
    if (author) filters.author = { $regex: author, $options: 'i' };
    if (year) filters.year = Number(year);
    if (classification) filters.classification = { $regex: classification, $options: 'i' };

    const skip = (page - 1) * limit;

    const books = await Book.find(filters)
      .skip(skip)
      .limit(Number(limit))
      .lean(); // lean() improves performance

    const total = await Book.countDocuments(filters);

    res.status(200).json({
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
      books
    });
  } catch (error) {
    console.error('Error fetching books:', error);
    res.status(500).json({ message: 'Error fetching books', error: error.message });
  }
};


/**
 * @desc    Get a single book by its MongoDB _id
 * @route   GET /api/books/:id
 * @access  Public
 */
const getBookById = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) {
      return res.status(404).json({ message: 'Book not found' });
    }
    res.status(200).json(book);
  } catch (error) {
    console.error('Error fetching book:', error);
    res.status(500).json({ message: 'Error fetching book', error: error.message });
  }
};

/**
 * @desc    Update a book by its MongoDB _id
 * @route   PUT /api/books/:id
 * @access  Public
 */
const updateBook = async (req, res) => {
  try {
    const updatedBook = await Book.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true } // {new: true} returns the updated document
    );
    if (!updatedBook) {
      return res.status(404).json({ message: 'Book not found' });
    }
    res.status(200).json(updatedBook);
  } catch (error) {
    console.error('Error updating book:', error);
    res.status(400).json({ message: 'Error updating book', error: error.message });
  }
};

/**
 * @desc    Delete a book by its MongoDB _id
 * @route   DELETE /api/books/:id
 * @access  Public
 */
const deleteBook = async (req, res) => {
  try {
    const deletedBook = await Book.findByIdAndDelete(req.params.id);
    if (!deletedBook) {
      return res.status(404).json({ message: 'Book not found' });
    }
    res.status(200).json({ message: 'Book deleted successfully' });
  } catch (error) {
    console.error('Error deleting book:', error);
    res.status(500).json({ message: 'Error deleting book', error: error.message });
  }
};

/**
 * @desc    Bulk import books from Excel file
 * @route   POST /api/books/import
 * @access  Public
 */
const bulkImportBooks = async (req, res) => {
  try {
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        message: 'No Excel file uploaded',
        error: 'Please upload an Excel file (.xlsx or .xls)'
      });
    }

    // Validate file type
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel' // .xls
    ];

    if (!allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({
        message: 'Invalid file type',
        error: 'Please upload a valid Excel file (.xlsx or .xls)'
      });
    }

    console.log(`📁 Processing uploaded file: ${req.file.originalname}`);
    console.log(`📏 File size: ${req.file.size} bytes`);

    // Import the Excel file
    const result = await importExcel(req.file.path);

    if (result.success) {
      res.status(200).json({
        message: 'Books imported successfully',
        ...result
      });
    } else {
      res.status(500).json({
        message: 'Import failed',
        ...result
      });
    }

  } catch (error) {
    console.error('Error in bulk import:', error);
    res.status(500).json({
      message: 'Error importing books',
      error: error.message
    });
  }
};

export { createBook, getAllBooks, getBookById, updateBook, deleteBook, bulkImportBooks };
