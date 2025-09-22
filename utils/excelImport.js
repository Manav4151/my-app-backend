import xlsx from 'xlsx';
import Book from '../models/book.schema.js';
import path from "path";
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
        // Treat (source + ISBN/title) as unique. First try ISBN + source
        if (bookData.isbn && bookData.isbn.trim() !== '' && bookData.source) {
            const existingByISBNAndSource = await Book.findOne({
                isbn: bookData.isbn.trim(),
                source: bookData.source
            });
            if (existingByISBNAndSource) {
                return existingByISBNAndSource;
            }
        }

        // Next try title+author+source
        if (
            bookData.title && bookData.title.trim() !== '' &&
            bookData.author && bookData.author.trim() !== '' &&
            bookData.source
        ) {
            const existingByTitleAuthorSource = await Book.findOne({
                title: { $regex: new RegExp(`^${bookData.title.trim()}$`, 'i') },
                author: { $regex: new RegExp(`^${bookData.author.trim()}$`, 'i') },
                source: bookData.source
            });
            if (existingByTitleAuthorSource) {
                return existingByTitleAuthorSource;
            }
        }

        // Finally try title+source
        if (bookData.title && bookData.title.trim() !== '' && bookData.source) {
            const existingByTitleSource = await Book.findOne({
                title: { $regex: new RegExp(`^${bookData.title.trim()}$`, 'i') },
                source: bookData.source
            });
            if (existingByTitleSource) {
                return existingByTitleSource;
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
 * @param {String} sourceName - Original Excel filename without extension
 * @returns {Object} - Cleaned book data
 */
function processBookData(row, sourceName) {
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

    // Always add source = original Excel filename (without extension)
    obj.source = sourceName;

    return obj;
}

/**
 * Import Excel data with duplicate checking and upsert logic
 * @param {String} filePath - Path to the Excel file
 * @param {String} originalNameWithoutExt - Original Excel filename without extension
 * @returns {Object} - Import results with statistics
 */
async function importExcel(filePath, originalNameWithoutExt) {
    try {
        console.log("🚀 Starting Excel import...");

        const workbook = xlsx.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
        console.log(`📊 Found ${sheetData.length} rows in sheet: ${sheetName} | source: ${originalNameWithoutExt}`);

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
                const bookData = processBookData(row, originalNameWithoutExt);

                // Skip if no essential data (title or ISBN)
                if (!bookData.title && !bookData.isbn) {
                    stats.skipped++;
                    console.log(`⚠️  Skipping row ${i + 1}: No title or ISBN provided`);
                    continue;
                }

                // Check for existing book
                const existingBook = await findExistingBook(bookData);

                if (existingBook) {
                    // Update existing record for the same source
                    const updatedBook = await Book.findByIdAndUpdate(
                        existingBook._id,
                        { ...bookData, book_id: existingBook.book_id },
                        { new: true, runValidators: true }
                    );

                    stats.updated++;
                    console.log(`✅ Updated book (source: ${bookData.source}): ${bookData.title || bookData.isbn} (ID: ${existingBook.book_id})`);
                } else {
                    // Insert new book
                    const nextBookId = await getNextBookId();
                    bookData.book_id = nextBookId;

                    const newBook = new Book(bookData);
                    await newBook.save();

                    stats.inserted++;
                    console.log(`➕ Inserted new book (source: ${bookData.source}): ${bookData.title || bookData.isbn} (ID: ${nextBookId})`);
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
