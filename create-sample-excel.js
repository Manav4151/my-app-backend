/**
 * Script to create a sample Excel file for testing bulk import
 */

import xlsx from 'xlsx';
import path from 'path';

// Sample data with various scenarios
const sampleData = [
    // Header row
    ['ISBN', 'Title', 'Author', 'Price', 'Currency', 'Publisher', 'Year', 'Discount', 'Classification', 'Binding Type'],
    
    // Normal records
    ['978-1234567890', 'Introduction to Programming', 'John Doe', '49.99', 'USD', 'Tech Books Inc', '2023', '10', 'Computer Science', 'Paperback'],
    ['978-0987654321', 'Advanced JavaScript', 'Jane Smith', '59.99', 'USD', 'Web Publishers', '2023', '5', 'Programming', 'Hardcover'],
    ['978-1122334455', 'Data Structures and Algorithms', 'Bob Johnson', '69.99', 'USD', 'Academic Press', '2023', '15', 'Computer Science', 'Paperback'],
    
    // Records with missing optional fields
    ['978-5566778899', 'Web Development Basics', 'Alice Brown', '39.99', 'USD', 'Web Publishers', '2023', '0', '', 'Paperback'],
    ['978-9988776655', 'Database Design', 'Charlie Wilson', '54.99', 'USD', '', '2023', '8', 'Database', ''],
    
    // Records with different currencies
    ['978-4433221100', 'Machine Learning', 'David Lee', '79.99', 'EUR', 'AI Books', '2023', '12', 'Artificial Intelligence', 'Hardcover'],
    ['978-3344556677', 'Python Programming', 'Emma Davis', '45.99', 'GBP', 'Python Publishers', '2023', '7', 'Programming', 'Paperback'],
    
    // Records that might cause conflicts (same ISBN, different details)
    ['978-1234567890', 'Introduction to Programming - Updated', 'John Doe', '54.99', 'USD', 'Tech Books Inc', '2024', '10', 'Computer Science', 'Paperback'],
    
    // Records with same title/author but different ISBN
    ['978-7766554433', 'Advanced JavaScript', 'Jane Smith', '64.99', 'USD', 'Web Publishers', '2023', '5', 'Programming', 'Hardcover'],
    
    // Records with special characters and edge cases
    ['978-9900112233', 'C++ Programming: A Complete Guide', 'Frank Miller', '89.99', 'USD', 'C++ Books & More', '2023', '20', 'Programming', 'Hardcover'],
    ['978-4455667788', 'The Art of Code', 'Grace Taylor', '34.99', 'USD', 'Artistic Publishers', '2023', '0', 'General', 'Paperback']
];

function createSampleExcel() {
    try {
        // Create workbook and worksheet
        const ws = xlsx.utils.aoa_to_sheet(sampleData);
        const wb = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(wb, ws, 'Books');
        
        // Generate filename with timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
        const filename = `sample-books-${timestamp}.xlsx`;
        const filepath = path.join(process.cwd(), filename);
        
        // Write file
        xlsx.writeFile(wb, filepath);
        
        console.log('✅ Sample Excel file created successfully!');
        console.log('📄 File:', filepath);
        console.log('📊 Records:', sampleData.length - 1); // Exclude header
        console.log('📋 Columns:', sampleData[0].length);
        console.log('\n📝 Sample data includes:');
        console.log('   - Normal book records');
        console.log('   - Records with missing optional fields');
        console.log('   - Different currencies (USD, EUR, GBP)');
        console.log('   - Potential conflicts (same ISBN, same title/author)');
        console.log('   - Special characters in titles');
        console.log('\n🧪 You can use this file to test the bulk import functionality!');
        
        return filepath;
        
    } catch (error) {
        console.error('❌ Error creating sample Excel file:', error.message);
        return null;
    }
}

// Create the sample file if this script is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
    createSampleExcel();
}

export { createSampleExcel, sampleData };
