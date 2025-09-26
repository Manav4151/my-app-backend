import xlsx from 'xlsx';
import Book from '../models/book.schema.js';
import BookPricing from '../models/BookPricing.js';
import path from 'path';
import fs from 'fs';
import { logger } from '../lib/logger.js';

// Default mapping for Excel headers to database fields
const defaultHeaderMap = {
    // Book fields
    "ISBN": "isbn",
    "Non ISBN": "nonisbn", 
    "Other Code": "other_code",
    "Title": "title",
    "Author": "author",
    "EDITION": "edition",
    "Edition": "edition",
    "Year": "year",
    "Publisher Code": "publisher_id",
    "Publisher": "publisher_name",
    "Binding Type": "binding_type",
    "Sub_Subject": "classification",
    "Subject": "remarks",
    "Classification": "classification",
    "Remarks": "remarks",
    
    // Pricing fields
    "Price": "rate",
    "Rate": "rate",
    "Curr": "currency",
    "Currency": "currency",
    "Discount": "discount",
    "Source": "source"
};

/**
 * Validate Excel file and return column mapping
 * @param {String} filePath - Path to the Excel file
 * @returns {Object} - Validation result with column mapping
 */
export async function validateExcelMapping(filePath) {
    try {
        const workbook = xlsx.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });
        
        if (sheetData.length === 0) {
            return {
                success: false,
                message: "Excel file is empty or has no data",
                headers: [],
                mapping: {}
            };
        }

        const headers = sheetData[0];
        const mapping = {};
        const unmappedHeaders = [];
        const suggestedMapping = {};

        // Check each header against default mapping
        headers.forEach(header => {
            if (header && header.trim()) {
                const cleanHeader = header.trim();
                if (defaultHeaderMap[cleanHeader]) {
                    mapping[cleanHeader] = defaultHeaderMap[cleanHeader];
                } else {
                    unmappedHeaders.push(cleanHeader);
                    // Try to suggest mapping based on partial matches
                    const suggestion = suggestMapping(cleanHeader);
                    if (suggestion) {
                        suggestedMapping[cleanHeader] = suggestion;
                    }
                }
            }
        });

        // Check for required fields
        const requiredBookFields = ['title', 'author'];
        const requiredPricingFields = ['rate', 'currency'];
        
        const mappedBookFields = Object.values(mapping).filter(field => 
            ['title', 'author', 'isbn', 'nonisbn', 'other_code', 'edition', 'year', 'publisher_name', 'binding_type', 'classification', 'remarks'].includes(field)
        );
        
        const mappedPricingFields = Object.values(mapping).filter(field => 
            ['rate', 'currency', 'discount', 'source'].includes(field)
        );

        const missingBookFields = requiredBookFields.filter(field => !mappedBookFields.includes(field));
        const missingPricingFields = requiredPricingFields.filter(field => !mappedPricingFields.includes(field));

        return {
            success: true,
            message: "Excel file validation completed",
            headers: headers.filter(h => h && h.trim()),
            mapping,
            unmappedHeaders,
            suggestedMapping,
            validation: {
                hasRequiredBookFields: missingBookFields.length === 0,
                hasRequiredPricingFields: missingPricingFields.length === 0,
                missingBookFields,
                missingPricingFields,
                totalRows: sheetData.length - 1, // Exclude header row
                mappedFields: {
                    book: mappedBookFields,
                    pricing: mappedPricingFields
                }
            }
        };

    } catch (error) {
        logger.error('Error validating Excel mapping:', error);
        return {
            success: false,
            message: "Error reading Excel file",
            error: error.message
        };
    }
}

/**
 * Suggest mapping for unmapped headers
 * @param {String} header - Header to suggest mapping for
 * @returns {String|null} - Suggested field name or null
 */
function suggestMapping(header) {
    const lowerHeader = header.toLowerCase();
    
    const suggestions = {
        'book title': 'title',
        'book name': 'title',
        'name': 'title',
        'writer': 'author',
        'book author': 'author',
        'cost': 'rate',
        'amount': 'rate',
        'price': 'rate',
        'usd': 'currency',
        'inr': 'currency',
        'rs': 'currency',
        'rupees': 'currency',
        'dollars': 'currency',
        'publisher': 'publisher_name',
        'publishing house': 'publisher_name',
        'category': 'classification',
        'subject': 'classification',
        'type': 'binding_type',
        'binding': 'binding_type',
        'hardcover': 'binding_type',
        'paperback': 'binding_type',
        'notes': 'remarks',
        'comment': 'remarks',
        'description': 'remarks'
    };

    return suggestions[lowerHeader] || null;
}

/**
 * Process and clean book data from Excel row
 * @param {Object} row - Raw Excel row data
 * @param {Object} mapping - Column mapping
 * @param {String} sourceName - Source name for the data
 * @returns {Object} - Processed book and pricing data
 */
function processRowData(row, mapping, sourceName) {
    const bookData = {};
    const pricingData = {};

    // Apply mapping
    Object.keys(mapping).forEach(excelKey => {
        const schemaKey = mapping[excelKey];
        const value = row[excelKey];

        if (value !== undefined && value !== null && value !== '') {
            const cleanValue = String(value).trim();
            if (cleanValue !== '') {
                // Determine if it's book or pricing data
                if (['rate', 'currency', 'discount', 'source'].includes(schemaKey)) {
                    pricingData[schemaKey] = cleanValue;
                } else {
                    bookData[schemaKey] = cleanValue;
                }
            }
        }
    });

    // Ensure correct data types
    if (bookData.year) {
        const yearNum = Number(bookData.year);
        bookData.year = !isNaN(yearNum) ? yearNum : null;
    }

    if (pricingData.rate) {
        const rateNum = Number(pricingData.rate);
        pricingData.rate = !isNaN(rateNum) ? rateNum : null;
    }

    if (pricingData.discount) {
        const discountNum = Number(pricingData.discount);
        pricingData.discount = !isNaN(discountNum) ? discountNum : 0;
    }

    // Set default values
    if (!pricingData.source) {
        pricingData.source = sourceName;
    }
    if (!pricingData.currency) {
        pricingData.currency = 'USD'; // Default currency
    }
    if (!pricingData.discount) {
        pricingData.discount = 0;
    }

    return { bookData, pricingData };
}

/**
 * Check for existing book using the same logic as checkBookStatus
 * @param {Object} bookData - Book data to check
 * @returns {Object} - Existing book and conflict information
 */
async function findExistingBookWithConflicts(bookData) {
    const { isbn, other_code, title, author } = bookData;
    let existingBook = null;
    let conflictType = null;
    let conflictFields = {};

    // 1) Check by ISBN first
    if (isbn) {
        existingBook = await Book.findOne({ isbn });

        if (existingBook) {
            const sameTitle = existingBook.title?.toLowerCase() === title?.toLowerCase();
            const sameAuthor = existingBook.author?.toLowerCase() === author?.toLowerCase();

            if (sameTitle && sameAuthor) {
                const sameYear = existingBook.year === bookData.year;
                const samePublisher = existingBook.publisher_name === bookData.publisher_name;

                if (sameYear && samePublisher) {
                    conflictType = 'DUPLICATE';
                } else {
                    conflictType = 'DUPLICATE_WITH_CONFLICTS';
                    conflictFields = {
                        year: { old: existingBook.year, new: bookData.year },
                        publisher_name: { old: existingBook.publisher_name, new: bookData.publisher_name }
                    };
                }
            } else if (sameTitle && !sameAuthor) {
                conflictType = 'AUTHOR_CONFLICT';
                conflictFields = {
                    author: { old: existingBook.author, new: author }
                };
            } else {
                conflictType = 'CONFLICT';
                conflictFields = {
                    title: !sameTitle ? { old: existingBook.title, new: title } : null,
                    author: !sameAuthor ? { old: existingBook.author, new: author } : null
                };
            }
            return { existingBook, conflictType, conflictFields };
        }
    }

    // 2) Check by other_code if ISBN not found
    if (!existingBook && other_code) {
        existingBook = await Book.findOne({ other_code });
        
        if (existingBook) {
            const sameTitle = existingBook.title?.toLowerCase() === title?.toLowerCase();
            const sameAuthor = existingBook.author?.toLowerCase() === author?.toLowerCase();

            if (sameTitle && sameAuthor) {
                const sameYear = existingBook.year === bookData.year;
                const samePublisher = existingBook.publisher_name === bookData.publisher_name;

                if (sameYear && samePublisher) {
                    conflictType = 'DUPLICATE';
                } else {
                    conflictType = 'DUPLICATE_WITH_CONFLICTS';
                    conflictFields = {
                        year: { old: existingBook.year, new: bookData.year },
                        publisher_name: { old: existingBook.publisher_name, new: bookData.publisher_name }
                    };
                }
            } else {
                conflictType = 'CONFLICT';
                conflictFields = {
                    title: !sameTitle ? { old: existingBook.title, new: title } : null,
                    author: !sameAuthor ? { old: existingBook.author, new: author } : null
                };
            }
            return { existingBook, conflictType, conflictFields };
        }
    }

    // 3) Check by Title + Author
    if (!existingBook) {
        existingBook = await Book.findOne({
            title: new RegExp(`^${title}$`, "i")
        });

        if (existingBook) {
            const sameAuthor = existingBook.author?.toLowerCase() === author?.toLowerCase();

            if (sameAuthor) {
                const sameYear = existingBook.year === bookData.year;
                const samePublisher = existingBook.publisher_name === bookData.publisher_name;

                if (sameYear && samePublisher) {
                    conflictType = 'DUPLICATE';
                    conflictFields = {
                        isbn: { old: existingBook.isbn, new: bookData.isbn },
                        other_code: { old: existingBook.other_code, new: bookData.other_code }
                    };
                } else {
                    conflictType = 'DUPLICATE_WITH_CONFLICTS';
                    conflictFields = {
                        isbn: { old: existingBook.isbn, new: bookData.isbn },
                        other_code: { old: existingBook.other_code, new: bookData.other_code },
                        year: { old: existingBook.year, new: bookData.year },
                        publisher_name: { old: existingBook.publisher_name, new: bookData.publisher_name }
                    };
                }
            } else {
                conflictType = 'AUTHOR_CONFLICT';
                conflictFields = {
                    isbn: { old: existingBook.isbn, new: bookData.isbn },
                    author: { old: existingBook.author, new: author }
                };
            }
            return { existingBook, conflictType, conflictFields };
        }
    }

    return { existingBook: null, conflictType: 'NEW', conflictFields: {} };
}

/**
 * Check for existing pricing
 * @param {String} bookId - Book ID
 * @param {Object} pricingData - Pricing data
 * @returns {Object} - Existing pricing and conflict information
 */
async function findExistingPricing(bookId, pricingData) {
    const existingPricing = await BookPricing.findOne({
        book: bookId,
        source: pricingData.source
    });

    if (!existingPricing) {
        return { existingPricing: null, pricingConflictType: 'NEW' };
    }

    const differences = [];
    if (existingPricing.rate !== pricingData.rate) {
        differences.push({ field: "rate", existing: existingPricing.rate, new: pricingData.rate });
    }
    if (existingPricing.discount !== pricingData.discount) {
        differences.push({ field: "discount", existing: existingPricing.discount, new: pricingData.discount });
    }
    if (existingPricing.currency !== pricingData.currency) {
        differences.push({ field: "currency", existing: existingPricing.currency, new: pricingData.currency });
    }

    if (differences.length > 0) {
        return { existingPricing, pricingConflictType: 'CONFLICT', differences };
    }

    return { existingPricing, pricingConflictType: 'DUPLICATE' };
}

/**
 * Create log file for conflicts and duplicates
 * @param {String} logFileName - Name of the log file
 * @param {Array} conflicts - Array of conflict records
 * @param {Array} duplicates - Array of duplicate records
 * @param {Array} errors - Array of error records
 * @returns {String} - Path to the created log file
 */
function createLogFile(logFileName, conflicts, duplicates, errors) {
    const logsDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
    }

    const logFilePath = path.join(logsDir, logFileName);
    let logContent = `BULK IMPORT LOG - ${new Date().toISOString()}\n`;
    logContent += `==========================================\n\n`;

    if (conflicts.length > 0) {
        logContent += `CONFLICTS (${conflicts.length} records):\n`;
        logContent += `----------------------------------------\n`;
        conflicts.forEach((conflict, index) => {
            logContent += `${index + 1}. Row ${conflict.row}: ${conflict.conflictType}\n`;
            logContent += `   Book: ${conflict.bookData.title || 'N/A'} by ${conflict.bookData.author || 'N/A'}\n`;
            logContent += `   ISBN: ${conflict.bookData.isbn || 'N/A'}\n`;
            logContent += `   Conflicts: ${JSON.stringify(conflict.conflictFields, null, 2)}\n`;
            if (conflict.pricingConflicts) {
                logContent += `   Pricing Conflicts: ${JSON.stringify(conflict.pricingConflicts, null, 2)}\n`;
            }
            logContent += `\n`;
        });
        logContent += `\n`;
    }

    if (duplicates.length > 0) {
        logContent += `DUPLICATES (${duplicates.length} records):\n`;
        logContent += `----------------------------------------\n`;
        duplicates.forEach((duplicate, index) => {
            logContent += `${index + 1}. Row ${duplicate.row}: ${duplicate.conflictType}\n`;
            logContent += `   Book: ${duplicate.bookData.title || 'N/A'} by ${duplicate.bookData.author || 'N/A'}\n`;
            logContent += `   ISBN: ${duplicate.bookData.isbn || 'N/A'}\n`;
            logContent += `   Existing Book ID: ${duplicate.existingBook._id}\n`;
            if (duplicate.pricingConflictType === 'DUPLICATE') {
                logContent += `   Pricing: Also duplicate\n`;
            }
            logContent += `\n`;
        });
        logContent += `\n`;
    }

    if (errors.length > 0) {
        logContent += `ERRORS (${errors.length} records):\n`;
        logContent += `----------------------------------------\n`;
        errors.forEach((error, index) => {
            logContent += `${index + 1}. Row ${error.row}: ${error.error}\n`;
            logContent += `   Data: ${JSON.stringify(error.data, null, 2)}\n`;
            logContent += `\n`;
        });
    }

    fs.writeFileSync(logFilePath, logContent);
    return logFilePath;
}

/**
 * Bulk import Excel data with comprehensive conflict detection and logging
 * @param {String} filePath - Path to the Excel file
 * @param {Object} mapping - Column mapping
 * @param {String} originalNameWithoutExt - Original filename without extension
 * @param {Object} options - Import options
 * @returns {Object} - Import results with detailed statistics
 */
export async function bulkImportExcel(filePath, mapping, originalNameWithoutExt, options = {}) {
    const { skipDuplicates = true, skipConflicts = true, updateExisting = false } = options;
    
    try {
        logger.info('Starting bulk Excel import', { filePath, originalNameWithoutExt, options });

        const workbook = xlsx.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
        
        logger.info(`Found ${sheetData.length} rows in sheet: ${sheetName}`);

        let stats = {
            total: sheetData.length,
            inserted: 0,
            updated: 0,
            skipped: 0,
            conflicts: 0,
            duplicates: 0,
            errors: 0,
            conflictDetails: [],
            duplicateDetails: [],
            errorDetails: []
        };

        const conflicts = [];
        const duplicates = [];
        const errors = [];

        for (let i = 0; i < sheetData.length; i++) {
            const row = sheetData[i];

            try {
                // Skip empty rows
                if (!row || Object.keys(row).length === 0) {
                    stats.skipped++;
                    continue;
                }

                // Process the row data
                const { bookData, pricingData } = processRowData(row, mapping, originalNameWithoutExt);

                // Skip if no essential data
                if (!bookData.title && !bookData.isbn) {
                    stats.skipped++;
                    logger.warn(`Skipping row ${i + 1}: No title or ISBN provided`);
                    continue;
                }

                // Check for existing book
                const { existingBook, conflictType, conflictFields } = await findExistingBookWithConflicts(bookData);

                if (existingBook) {
                    // Check for pricing conflicts
                    const { existingPricing, pricingConflictType, differences } = await findExistingPricing(existingBook._id, pricingData);

                    if (conflictType === 'DUPLICATE' && pricingConflictType === 'DUPLICATE') {
                        // Complete duplicate
                        stats.duplicates++;
                        duplicates.push({
                            row: i + 1,
                            conflictType,
                            bookData,
                            pricingData,
                            existingBook,
                            existingPricing,
                            pricingConflictType
                        });
                        stats.duplicateDetails.push({
                            row: i + 1,
                            book: bookData.title,
                            isbn: bookData.isbn,
                            existingBookId: existingBook._id
                        });
                    } else if (conflictType === 'DUPLICATE' && pricingConflictType === 'CONFLICT') {
                        // Book duplicate but pricing conflict
                        if (updateExisting) {
                            // Update pricing
                            await BookPricing.findByIdAndUpdate(existingPricing._id, pricingData);
                            stats.updated++;
                            logger.info(`Updated pricing for existing book: ${bookData.title}`);
                        } else {
                            stats.conflicts++;
                            conflicts.push({
                                row: i + 1,
                                conflictType: 'PRICING_CONFLICT',
                                bookData,
                                pricingData,
                                existingBook,
                                existingPricing,
                                pricingConflicts: differences
                            });
                        }
                    } else if (conflictType.includes('CONFLICT') || conflictType.includes('AUTHOR_CONFLICT')) {
                        // Book conflicts
                        if (updateExisting) {
                            // Update book and pricing
                            await Book.findByIdAndUpdate(existingBook._id, bookData);
                            if (existingPricing) {
                                await BookPricing.findByIdAndUpdate(existingPricing._id, pricingData);
                            } else {
                                await new BookPricing({ ...pricingData, book: existingBook._id }).save();
                            }
                            stats.updated++;
                            logger.info(`Updated conflicting book: ${bookData.title}`);
                        } else {
                            stats.conflicts++;
                            conflicts.push({
                                row: i + 1,
                                conflictType,
                                bookData,
                                pricingData,
                                existingBook,
                                conflictFields,
                                pricingConflicts: differences
                            });
                        }
                    } else {
                        // Book duplicate, new pricing
                        if (updateExisting) {
                            await new BookPricing({ ...pricingData, book: existingBook._id }).save();
                            stats.updated++;
                            logger.info(`Added new pricing for existing book: ${bookData.title}`);
                        } else {
                            stats.conflicts++;
                            conflicts.push({
                                row: i + 1,
                                conflictType: 'NEW_PRICING_FOR_EXISTING_BOOK',
                                bookData,
                                pricingData,
                                existingBook
                            });
                        }
                    }
                } else {
                    // New book - insert both book and pricing
                    const newBook = new Book(bookData);
                    const savedBook = await newBook.save();

                    const newPricing = new BookPricing({ ...pricingData, book: savedBook._id });
                    await newPricing.save();

                    stats.inserted++;
                    logger.info(`Inserted new book: ${bookData.title} (ID: ${savedBook._id})`);
                }

            } catch (error) {
                stats.errors++;
                errors.push({
                    row: i + 1,
                    error: error.message,
                    data: row
                });
                stats.errorDetails.push({
                    row: i + 1,
                    error: error.message,
                    data: row
                });
                logger.error(`Error processing row ${i + 1}:`, error);
            }
        }

        // Create log file
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const logFileName = `bulk-import-${originalNameWithoutExt}-${timestamp}.log`;
        const logFilePath = createLogFile(logFileName, conflicts, duplicates, errors);

        logger.info('Bulk Excel import completed', stats);

        return {
            success: true,
            message: "Bulk import completed successfully",
            stats,
            logFile: logFilePath,
            summary: {
                totalProcessed: stats.total,
                successful: stats.inserted + stats.updated,
                failed: stats.conflicts + stats.duplicates + stats.errors + stats.skipped,
                conflicts: stats.conflicts,
                duplicates: stats.duplicates,
                errors: stats.errors,
                skipped: stats.skipped
            }
        };

    } catch (error) {
        logger.error('Error in bulk Excel import:', error);
        return {
            success: false,
            message: "Error during bulk import",
            error: error.message
        };
    }
}
