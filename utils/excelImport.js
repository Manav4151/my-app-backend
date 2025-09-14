import xlsx from 'xlsx';
import Book from '../models/book.schema.js';

// Map Excel headers → Schema fields
const headerMap = {
    "ISBN": "isbn",
    "Non ISBN": "nonisbn",
    "Other Code": "other_code",
    "Title": "title",
    "Author": "author",
    "EDITION": "edition",
    "Year": "year",
    "Publisher Code": "publisher_id",
    "Publisher": "publisher_name",
    "Edition": "binding_type",
    "Sub_Subject": "classification",
    "Subject": "remarks",
    "Price": "price",
    "Curr": "currency"
};

/**
 * Check if a book already exists in the database based on ISBN and title
 * @param {Object} bookData - The book data to check
 * @returns {Object|null} - Existing book or null if not found
 */
async function findExistingBook(bookData) {
    try {
        // First try to find by ISBN if available
        if (bookData.isbn && bookData.isbn.trim() !== '') {
            const existingByISBN = await Book.findOne({ isbn: bookData.isbn.trim() });
            if (existingByISBN) {
                return existingByISBN;
            }
        }

        // If no ISBN match, try to find by title and author combination
        if (bookData.title && bookData.title.trim() !== '' && bookData.author && bookData.author.trim() !== '') {
            const existingByTitleAuthor = await Book.findOne({
                title: { $regex: new RegExp(`^${bookData.title.trim()}$`, 'i') },
                author: { $regex: new RegExp(`^${bookData.author.trim()}$`, 'i') }
            });
            if (existingByTitleAuthor) {
                return existingByTitleAuthor;
            }
        }

        // If still no match, try just by title (case-insensitive)
        if (bookData.title && bookData.title.trim() !== '') {
            const existingByTitle = await Book.findOne({
                title: { $regex: new RegExp(`^${bookData.title.trim()}$`, 'i') }
            });
            if (existingByTitle) {
                return existingByTitle;
            }
        }

        return null;
    } catch (error) {
        console.error('Error checking for existing book:', error);
        throw error;
    }
}

/**
 * Get the next available book_id
 * @returns {Number} - Next available book_id
 */
async function getNextBookId() {
    try {
        const lastBook = await Book.findOne().sort({ book_id: -1 });
        return lastBook ? lastBook.book_id + 1 : 1;
    } catch (error) {
        console.error('Error getting next book ID:', error);
        throw error;
    }
}

/**
 * Process and clean book data from Excel row
 * @param {Object} row - Raw Excel row data
 * @param {String} sheetName - Name of the Excel sheet
 * @returns {Object} - Cleaned book data
 */
function processBookData(row, sheetName) {
    let obj = {};

    // Apply header mapping
    Object.keys(headerMap).forEach(excelKey => {
        const schemaKey = headerMap[excelKey];
        const value = row[excelKey];

        // Clean and validate the value
        if (value !== undefined && value !== null && value !== '') {
            // Convert to string and trim whitespace
            const cleanValue = String(value).trim();
            if (cleanValue !== '') {
                obj[schemaKey] = cleanValue;
            }
        }
    });

    // Ensure correct data types
    if (obj.year) {
        const yearNum = Number(obj.year);
        obj.year = !isNaN(yearNum) ? yearNum : null;
    }

    if (obj.price) {
        const priceNum = Number(obj.price);
        obj.price = !isNaN(priceNum) ? priceNum : null;
    }

    // Always add source = sheet name
    obj.source = sheetName;

    return obj;
}

/**
 * Import Excel data with duplicate checking and upsert logic
 * @param {String} filePath - Path to the Excel file
 * @returns {Object} - Import results with statistics
 */
async function importExcel(filePath) {
    try {
        console.log("🚀 Starting Excel import...");

        const workbook = xlsx.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

        console.log(`📊 Found ${sheetData.length} rows in sheet: ${sheetName}`);

        let stats = {
            total: sheetData.length,
            inserted: 0,
            updated: 0,
            skipped: 0,
            errors: 0,
            errorDetails: []
        };

        for (let i = 0; i < sheetData.length; i++) {
            const row = sheetData[i];

            try {
                // Skip empty rows
                if (!row || Object.keys(row).length === 0) {
                    stats.skipped++;
                    continue;
                }

                // Process the row data
                const bookData = processBookData(row, sheetName);

                // Skip if no essential data (title or ISBN)
                if (!bookData.title && !bookData.isbn) {
                    stats.skipped++;
                    console.log(`⚠️  Skipping row ${i + 1}: No title or ISBN provided`);
                    continue;
                }

                // Check for existing book
                const existingBook = await findExistingBook(bookData);

                if (existingBook) {
                    // Update existing book
                    const updatedBook = await Book.findByIdAndUpdate(
                        existingBook._id,
                        { ...bookData, book_id: existingBook.book_id }, // Keep original book_id
                        { new: true, runValidators: true }
                    );

                    stats.updated++;
                    console.log(`✅ Updated book: ${bookData.title || bookData.isbn} (ID: ${existingBook.book_id})`);
                } else {
                    // Insert new book
                    const nextBookId = await getNextBookId();
                    bookData.book_id = nextBookId;

                    const newBook = new Book(bookData);
                    await newBook.save();

                    stats.inserted++;
                    console.log(`➕ Inserted new book: ${bookData.title || bookData.isbn} (ID: ${nextBookId})`);
                }

            } catch (error) {
                stats.errors++;
                stats.errorDetails.push({
                    row: i + 1,
                    error: error.message,
                    data: row
                });
                console.error(`❌ Error processing row ${i + 1}:`, error.message);
            }
        }

        console.log("✅ Excel import completed!");
        console.log(`📈 Import Statistics:`, stats);

        return {
            success: true,
            message: "Excel import completed successfully",
            stats: stats
        };

    } catch (error) {
        console.error("❌ Error importing Excel file:", error);
        return {
            success: false,
            message: "Error importing Excel file",
            error: error.message
        };
    }
}

export default importExcel;
